// Puebla el nivel 'market' de la taxonomía (migr. 0066): los cargos REALES que usan las
// empresas y buscan los candidatos, cada uno haciendo roll-up a su ancla de ESCO.
//
// El vocabulario NO se inventa: se OBSERVA de datos reales que ya tenemos —el `role_title` de
// las fichas de empleado y el `title` libre de las ofertas— y el ancla padre se propone por
// similitud DETERMINISTA (tokens contra canónico + traducciones + sinónimos de las anclas).
// Asignar el padre es una decisión de curación, así que `--dry` imprime la propuesta para
// revisarla y solo `--apply` escribe.
//
// Reglas anti-redundancia que aplica (las de la migración 0066):
//   · Si el término YA resuelve contra la taxonomía (canónico/traducción/sinónimo) → no se crea
//     nada: ya está cubierto.
//   · Las variantes de SENIORITY no son cargos distintos ("Senior Backend Engineer" no es otro
//     puesto que "Backend Engineer"): se recorta el marcador y, si la base ya existe o ya se
//     propone, no se duplica. La seniority vive en su propia columna.
//   · Se exige una frecuencia mínima: un título que aparece una vez es ruido, no vocabulario de
//     mercado (configurable con --min-freq; las fichas de empleado cuentan siempre).
//
//   node scripts/propose-market-titles.mjs [--dry] [--apply] [--min-freq=4]
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(ROOT, "package.json"));
const { createClient } = require("@supabase/supabase-js");
const env = Object.fromEntries(readFileSync(join(ROOT, ".env.local"), "utf8").split("\n")
  .filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const APPLY = process.argv.includes("--apply");
const EMIT = process.argv.includes("--emit");
const CURATION_PATH = join(ROOT, "data/taxonomy/market-titles.json");
const MIN_FREQ = Number((process.argv.find((a) => a.startsWith("--min-freq=")) ?? "").split("=")[1] || 4);
const MIN_SCORE = 0.34; // por debajo de esto no se propone padre: se deja para decisión humana

const norm = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
async function pageAll(table, cols, filter) {
  const out = []; const P = 1000;
  for (let f = 0; ; f += P) {
    let q = db.from(table).select(cols).range(f, f + P - 1);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) throw error;
    if (!data?.length) break;
    out.push(...data);
    if (data.length < P) break;
  }
  return out;
}

// Marcadores de seniority/orden que NO cambian el puesto.
const SENIORITY = /\b(senior|sr|jr|junior|semi|semisenior|lead|principal|trainee|becario|becaria|practicante|aprendiz|1o|2o|1a|2a|i{1,3}|iv)\b/gi;
// Tokens demasiado genéricos para decidir un padre por sí solos.
const GENERIC = new Set(["manager", "officer", "chief", "assistant", "consultant", "clerk", "director",
  "engineer", "specialist", "coordinator", "developer", "technician", "operator", "administrator",
  "analyst", "designer", "executive", "general", "head", "supervisor", "representative",
  "responsable", "encargado", "encargada", "tecnico", "tecnica", "analista", "gerente", "jefe",
  "jefa", "coordinador", "coordinadora", "director", "directora", "auxiliar", "ayudante",
  "de", "del", "la", "el", "los", "las", "and", "the", "for", "in", "of", "y", "e", "a"]);

/** Limpia el título libre de una oferta: "Camarero/a - Finca la Bobadilla 5* - (Almería)" → "Camarero". */
function cleanTitle(raw) {
  let s = String(raw ?? "");
  s = s.split(/\s[-–|]\s/)[0];          // corta empresa/ubicación tras guion o barra vertical
  s = s.replace(/\([^)]*\)/g, " ");     // quita "(Almería)", "(m/f)"
  s = s.replace(/\d+\s*\*/g, " ");      // "5*"
  s = s.replace(/\b(m\/f|h\/m|m\/h)\b/gi, " ");
  s = s.replace(/\/(a|o|as|os|e)\b/gi, ""); // "Camarero/a" → "Camarero"
  s = s.replace(/[•·,;:]+/g, " ");
  return s.replace(/\s+/g, " ").trim();
}
const stripSeniority = (s) => s.replace(SENIORITY, " ").replace(/\s+/g, " ").trim();
const sigTokens = (s) => norm(s).split(" ").filter((w) => w.length > 2 && !GENERIC.has(w));

async function main() {
  // 1) Anclas + todas sus formas (para saber qué ya está cubierto y para proponer padre).
  const [anchors, trs, syns] = await Promise.all([
    pageAll("job_titles", "id, canonical_name, category_key, level"),
    pageAll("job_title_translations", "job_title_id, name"),
    pageAll("job_title_synonyms", "job_title_id, synonym"),
  ]);
  const escoAnchors = anchors.filter((a) => a.level === "esco");
  const formsById = new Map();
  const addForm = (id, label) => { const n = norm(label); if (n.length >= 3) (formsById.get(id) ?? formsById.set(id, new Set()).get(id)).add(n); };
  for (const a of anchors) addForm(a.id, a.canonical_name);
  for (const t of trs) addForm(t.job_title_id, t.name);
  for (const s of syns) addForm(s.job_title_id, s.synonym);

  // Índice de resolución: forma → id (se prefiere la forma más larga, como el backfill).
  const allForms = [];
  for (const [id, set] of formsById) for (const f of set) allForms.push({ form: ` ${f} `, id });
  allForms.sort((a, b) => b.form.length - a.form.length);
  const resolves = (label) => { const n = ` ${norm(label)} `; return allForms.find((f) => n.includes(f.form)) ?? null; };

  // 2) Vocabulario OBSERVADO: fichas de empleado (siempre cuentan) + títulos de oferta (con
  //    frecuencia mínima, para no meter ruido de una sola aparición).
  const [emps, jobs] = await Promise.all([
    pageAll("employees", "role_title"),
    pageAll("jobs", "title", (q) => q.eq("status", "active")),
  ]);
  const observed = new Map(); // norm → { display, freq, fromEmployee }
  const observe = (raw, fromEmployee) => {
    const display = cleanTitle(raw);
    const n = norm(display);
    if (n.length < 3) return;
    const cur = observed.get(n) ?? { display, freq: 0, fromEmployee: false };
    cur.freq++; cur.fromEmployee = cur.fromEmployee || fromEmployee;
    observed.set(n, cur);
  };
  for (const e of emps) if (e.role_title) observe(e.role_title, true);
  for (const j of jobs) if (j.title) observe(j.title, false);
  console.log(`Títulos observados distintos: ${observed.size} (empleados + ofertas activas)`);

  // 3) Filtrar: ya cubiertos, poco frecuentes, y variantes de seniority.
  const candidates = [];
  const covered = [];
  for (const [n, o] of observed) {
    if (!o.fromEmployee && o.freq < MIN_FREQ) continue;
    if (resolves(o.display)) { covered.push(o.display); continue; }
    const base = stripSeniority(o.display);
    if (base !== o.display && resolves(base)) { covered.push(`${o.display} → (seniority de "${base}")`); continue; }
    candidates.push({ ...o, norm: n, base });
  }
  // Dedupe entre candidatos por su base sin seniority: "Backend Engineer" y "Senior Backend
  // Engineer" son el mismo cargo con distinta seniority.
  const byBase = new Map();
  for (const c of candidates.sort((a, b) => b.freq - a.freq)) {
    const k = norm(c.base);
    if (!byBase.has(k)) byBase.set(k, { ...c, display: c.base || c.display });
    else byBase.get(k).freq += c.freq;
  }
  const finalists = [...byBase.values()];
  console.log(`Ya cubiertos por la taxonomía: ${covered.length} · candidatos a cargo de mercado: ${finalists.length}`);

  // 4) Proponer ancla padre por similitud de tokens significativos.
  //    Se compara contra CADA forma del ancla por separado y se toma la mejor. Comparar contra
  //    la unión de todas sus formas (canónico + traducciones + ~20 sinónimos) infla el
  //    denominador y hunde cualquier puntuación: con eso ninguna propuesta pasaba el umbral.
  const anchorForms = escoAnchors.map((a) => ({
    a, forms: [...(formsById.get(a.id) ?? [])].map((f) => new Set(sigTokens(f))).filter((s) => s.size),
  }));
  const proposals = [], orphans = [];
  for (const c of finalists) {
    const ct = new Set(sigTokens(c.display));
    if (!ct.size) { orphans.push({ ...c, why: "sin tokens específicos" }); continue; }
    let best = null;
    for (const { a, forms } of anchorForms) {
      for (const tokens of forms) {
        const shared = [...ct].filter((t) => tokens.has(t)).length;
        if (!shared) continue;
        const score = shared / new Set([...ct, ...tokens]).size;
        if (!best || score > best.score) best = { anchor: a, score };
      }
    }
    if (best && best.score >= MIN_SCORE) proposals.push({ ...c, parent: best.anchor, score: Number(best.score.toFixed(2)) });
    else orphans.push({ ...c, why: best ? `mejor candidato débil: ${best.anchor.canonical_name} (${best.score.toFixed(2)})` : "sin coincidencia" });
  }

  console.log(`\n=== PROPUESTA: ${proposals.length} cargos de mercado ===`);
  for (const p of proposals.sort((a, b) => b.freq - a.freq)) {
    console.log(`  ${String(p.freq).padStart(4)}×  ${p.display}  →  ${p.parent.canonical_name}  [${p.parent.category_key}]  (${p.score})`);
  }
  console.log(`\n=== SIN PADRE CLARO: ${orphans.length} (decisión humana, no se insertan) ===`);
  for (const o of orphans.sort((a, b) => b.freq - a.freq).slice(0, 30)) {
    console.log(`  ${String(o.freq).padStart(4)}×  ${o.display}  —  ${o.why}`);
  }

  // Emite el fichero de CURACIÓN. La asignación de padre por heurística NO es fiable (mide
  // solapamiento de tokens y los sinónimos generan falsos positivos: "Night Manager" → "night
  // auditor", "Finance Analyst" → "financial manager"), así que no se inserta a ciegas: la
  // propuesta se escribe a disco, se revisa/corrige a mano y solo entonces se aplica.
  // Así la decisión de curación queda versionada en el repo y auditable en un PR.
  if (EMIT) {
    const existing = existsSync(CURATION_PATH) ? JSON.parse(readFileSync(CURATION_PATH, "utf8")) : { titles: [] };
    const prev = new Map((existing.titles ?? []).map((t) => [norm(t.title), t]));
    const out = [...proposals, ...orphans].sort((a, b) => b.freq - a.freq).map((c) => {
      const old = prev.get(norm(c.display));
      return {
        title: c.display,
        freq: c.freq,
        // decision: "market" (cargo propio) · "synonym" (misma ocupación, otra forma) · "skip"
        decision: old?.decision ?? (c.parent ? "review" : "review"),
        parent: old?.parent ?? null,             // canonical_name del ancla, decidido a mano
        parent_suggested: c.parent?.canonical_name ?? null,
        parent_score: c.score ?? null,
      };
    });
    writeFileSync(CURATION_PATH, JSON.stringify({ titles: out }, null, 2) + "\n");
    console.log(`\nEscrito ${CURATION_PATH} con ${out.length} entradas para revisar.`);
    console.log('Rellena "decision" ("market"|"synonym"|"skip") y "parent" y relanza con --apply.');
    return;
  }

  if (!APPLY) { console.log("\n(--dry) Nada escrito. Usa --emit para volcar el fichero de curación."); return; }

  // 5) APLICAR desde el fichero CURADO (nunca desde la heurística). El nombre observado ES el
  //    nombre del cargo; NO se fabrican traducciones a otros idiomas (eso sí sería inventar):
  //    el índice de matching usa canonical_name y la etiqueta cae al canónico si falta.
  if (!existsSync(CURATION_PATH)) { console.error(`Falta ${CURATION_PATH}. Genera con --emit, revísalo y vuelve.`); process.exit(1); }
  const curated = JSON.parse(readFileSync(CURATION_PATH, "utf8")).titles ?? [];
  // Un cargo 'market' solo puede colgar de un ANCLA ESCO (es su roll-up al estándar). Un
  // SINÓNIMO, en cambio, puede pertenecer a cualquier cargo, incluido uno de mercado:
  // "Oficial de Mantenimiento" es otra forma de decir "Técnico de Mantenimiento".
  const anchorByName = new Map(escoAnchors.map((a) => [norm(a.canonical_name), a]));
  const anyByName = new Map(anchors.map((a) => [norm(a.canonical_name), a]));

  const market = [], pending = [];
  for (const c of curated) {
    if (c.decision !== "market") continue;
    if (!c.parent) { pending.push(c.title); continue; }
    const anchor = anchorByName.get(norm(c.parent));
    if (!anchor) { console.error(`  ✗ ancla ESCO inexistente para "${c.title}": ${c.parent}`); pending.push(c.title); continue; }
    market.push({ canonical_name: c.title, level: "market", parent_title_id: anchor.id, category_key: anchor.category_key, source: "observed", esco_uri: null });
  }

  // 5a) Primero los cargos de mercado: un sinónimo puede pertenecer a uno de ellos, así que
  //     tienen que existir antes de resolver los sinónimos de esta misma pasada.
  let inserted = 0;
  for (const row of market) {
    const { data, error } = await db.from("job_titles").insert(row).select("id, canonical_name").maybeSingle();
    if (!error) { inserted++; if (data) anyByName.set(norm(data.canonical_name), data); }
    else if (/duplicate key/i.test(error.message)) {
      const { data: ex } = await db.from("job_titles").select("id, canonical_name").ilike("canonical_name", row.canonical_name).maybeSingle();
      if (ex) anyByName.set(norm(ex.canonical_name), ex);
    } else throw error;
  }

  // 5b) Sinónimos: ya se pueden resolver contra cualquier cargo, incluidos los recién creados.
  const synonyms = [];
  for (const c of curated) {
    if (c.decision !== "synonym") continue;
    if (!c.parent) { pending.push(c.title); continue; }
    const owner = anyByName.get(norm(c.parent));
    if (!owner) { console.error(`  ✗ cargo inexistente para el sinónimo "${c.title}": ${c.parent}`); pending.push(c.title); continue; }
    synonyms.push({ job_title_id: owner.id, locale: "es", synonym: c.title });
  }
  for (const c of curated) if (c.decision !== "market" && c.decision !== "synonym" && c.decision !== "skip") pending.push(c.title);
  console.log(`\nInsertar: ${market.length} cargos de mercado · ${synonyms.length} sinónimos · sin decidir: ${pending.length}`);

  let synIns = 0;
  for (const row of synonyms) {
    const { error } = await db.from("job_title_synonyms").insert(row);
    if (!error) synIns++;
    else if (!/duplicate key/i.test(error.message)) throw error;
  }
  console.log(`Insertados: ${inserted} cargos 'market' · ${synIns} sinónimos.`);
  if (pending.length) console.log(`Pendientes de decisión (${pending.length}): ${pending.slice(0, 10).join(", ")}${pending.length > 10 ? "…" : ""}`);
  console.log("Siguiente: npm run build:relations y el backfill de empleados.");
}
main().catch((e) => { console.error(e); process.exit(1); });
