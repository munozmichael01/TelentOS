// Reconstruye job_title_relations (grafo NO dirigido con PESO) sobre TODOS los cargos que hay
// en la BBDD. Alimenta el "relacionados por peso" del ranking del board y del asistente
// (resolveTitleContext → board_rank_jobs) y los cargos hermanos de los hubs.
//
// Por qué hace falta: las relaciones se generaban dentro de build-taxonomy-from-esco.mjs sobre
// el taxonomy.json curado y con un `.slice(0, 600)` GLOBAL. Resultado: 600 filas para 219 de
// 590 cargos, y los ~240 importados después de la API de ESCO sin ninguna relación.
// Aquí se recalcula entero, con top-N POR CARGO en vez de un cap global, así ningún cargo se
// queda sin vecinos.
//
// Señales (todas deterministas y derivadas de datos que ya tenemos — nada inventado ni LLM):
//   · Solapamiento de SKILLS (Jaccard) — la señal principal, misma fórmula que el builder.
//   · Solapamiento LÉXICO del nombre — misma función que el builder.
//   · Misma ÁREA (category_key) — bonus.
//   · Jerarquía del modelo de dos niveles: padre↔hijo y HERMANOS (mismo padre), que son
//     parientes por construcción y la señal más fiable de todas.
//
//   node scripts/build-title-relations.mjs [--dry] [--top=8] [--min=0.30]
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(ROOT, "package.json"));
const { createClient } = require("@supabase/supabase-js");
const env = Object.fromEntries(readFileSync(join(ROOT, ".env.local"), "utf8").split("\n")
  .filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const DRY = process.argv.includes("--dry");
const numArg = (n, d) => { const v = (process.argv.find((a) => a.startsWith(`--${n}=`)) ?? "").split("=")[1]; return v ? Number(v) : d; };
const TOP_PER_TITLE = numArg("top", 8);
const MIN_WEIGHT = numArg("min", 0.30);

const PARENT_WEIGHT = 0.90;   // hijo ↔ su ancla ESCO
const SIBLING_FLOOR = 0.75;   // dos cargos de mercado bajo el mismo ancla

const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
async function pageAll(table, cols) {
  const out = []; const P = 1000;
  for (let f = 0; ; f += P) {
    const { data, error } = await db.from(table).select(cols).range(f, f + P - 1);
    if (error) throw error;
    if (!data?.length) break;
    out.push(...data);
    if (data.length < P) break;
  }
  return out;
}

// Misma función que build-taxonomy-from-esco.mjs (no se reimplementa distinto a propósito).
function lexicalOverlap(a, b) {
  const stop = new Set(["and", "of", "the", "for", "specialised", "specialized", "assistant", "worker"]);
  const aw = new Set(String(a).toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !stop.has(w)));
  const bw = new Set(String(b).toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !stop.has(w)));
  if (!aw.size || !bw.size) return 0;
  const shared = [...aw].filter((w) => bw.has(w)).length;
  return shared / new Set([...aw, ...bw]).size;
}

async function main() {
  const titles = await pageAll("job_titles", "id, canonical_name, category_key, level, parent_title_id");
  const links = await pageAll("job_title_skills", "job_title_id, skill_id");
  console.log(`Cargos: ${titles.length} · enlaces cargo↔skill: ${links.length}`);

  const skillsOf = new Map();
  for (const l of links) (skillsOf.get(l.job_title_id) ?? skillsOf.set(l.job_title_id, new Set()).get(l.job_title_id)).add(l.skill_id);

  // Un cargo de mercado sin skills propias hereda las del ancla para poder compararse.
  const effSkills = (t) => {
    const own = skillsOf.get(t.id);
    if (own?.size) return own;
    if (t.parent_title_id) return skillsOf.get(t.parent_title_id) ?? new Set();
    return new Set();
  };

  // Candidatas por par (solo una vez por par, con a<b para casar con la PK).
  const pairKey = (x, y) => (x < y ? `${x}|${y}` : `${y}|${x}`);
  const scored = new Map();
  const bump = (x, y, w) => {
    if (x === y) return;
    const k = pairKey(x, y);
    scored.set(k, Math.max(scored.get(k) ?? 0, Number(w.toFixed(2))));
  };

  // 1) Jerarquía: padre↔hijo y hermanos. Es la señal más fiable, así que va primero.
  const childrenOf = new Map();
  for (const t of titles) {
    if (t.level === "market" && t.parent_title_id) {
      bump(t.id, t.parent_title_id, PARENT_WEIGHT);
      (childrenOf.get(t.parent_title_id) ?? childrenOf.set(t.parent_title_id, []).get(t.parent_title_id)).push(t.id);
    }
  }
  for (const kids of childrenOf.values()) {
    for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) bump(kids[i], kids[j], SIBLING_FLOOR);
  }

  // 2) Similitud por skills + léxico, acotada a la misma área (evita el O(n²) global y las
  //    relaciones sin sentido entre áreas distintas).
  const byArea = new Map();
  for (const t of titles) (byArea.get(t.category_key ?? "_") ?? byArea.set(t.category_key ?? "_", []).get(t.category_key ?? "_")).push(t);
  for (const [, group] of byArea) {
    for (let i = 0; i < group.length; i++) {
      const a = group[i], aS = effSkills(a);
      for (let j = i + 1; j < group.length; j++) {
        const b = group[j], bS = effSkills(b);
        const shared = [...aS].filter((s) => bS.has(s)).length;
        const union = new Set([...aS, ...bS]).size || 1;
        const lexical = lexicalOverlap(a.canonical_name, b.canonical_name);
        if (shared < 1 && lexical < 0.35) continue;
        const w = Math.min(0.95, Math.max(0.25, (shared / union) * 0.75 + lexical * 0.25 + 0.1));
        bump(a.id, b.id, w);
      }
    }
  }
  console.log(`Pares candidatos: ${scored.size}`);

  // 3) Top-N por cargo (no un cap global): un par sobrevive si está en el top de CUALQUIERA de
  //    los dos, así los cargos de áreas pequeñas no se quedan sin vecinos.
  const perTitle = new Map();
  for (const [k, w] of scored) {
    if (w < MIN_WEIGHT) continue;
    const [x, y] = k.split("|");
    (perTitle.get(x) ?? perTitle.set(x, []).get(x)).push({ k, w });
    (perTitle.get(y) ?? perTitle.set(y, []).get(y)).push({ k, w });
  }
  const keep = new Set();
  for (const [, list] of perTitle) {
    list.sort((p, q) => q.w - p.w);
    for (const { k } of list.slice(0, TOP_PER_TITLE)) keep.add(k);
  }
  const rows = [...keep].map((k) => { const [a_id, b_id] = k.split("|"); return { a_id, b_id, weight: scored.get(k) }; });
  const cubiertos = new Set(rows.flatMap((r) => [r.a_id, r.b_id])).size;
  console.log(`Relaciones a guardar: ${rows.length} · cargos con al menos una: ${cubiertos}/${titles.length}`);

  if (DRY) {
    const byId = new Map(titles.map((t) => [t.id, t.canonical_name]));
    console.log("Muestra (mayor peso):");
    for (const r of rows.slice().sort((a, b) => b.weight - a.weight).slice(0, 15)) {
      console.log(`  ${r.weight}  ${byId.get(r.a_id)}  ↔  ${byId.get(r.b_id)}`);
    }
    return;
  }

  // Reemplazo completo: el grafo es derivado y determinista, así que se recalcula entero para
  // que no queden relaciones viejas con pesos de otra fórmula.
  const { error: delErr } = await db.from("job_title_relations").delete().neq("a_id", "00000000-0000-0000-0000-000000000000");
  if (delErr) throw delErr;
  for (const part of chunk(rows, 500)) {
    const { error } = await db.from("job_title_relations").upsert(part, { onConflict: "a_id,b_id" });
    if (error) throw error;
  }
  console.log("Grafo de relaciones reconstruido.");
}
main().catch((e) => { console.error(e); process.exit(1); });
