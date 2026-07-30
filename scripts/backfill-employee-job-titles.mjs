// Puebla employees.job_title_id (migr. 0063) resolviendo el CARGO CANÓNICO desde el texto libre
// de `role_title`. Es el prerequisito del bloque 1 de Desempeño: sin ese FK no se pueden derivar
// las competencias esperadas del puesto (job_title_skills).
//
// Reutiliza deliberadamente el mismo matcher que scripts/backfill-job-skills.mjs (formas de
// título = canónico + traducciones + sinónimos, normalizadas, preferiendo el match más largo).
// No se inventa un matcher paralelo ni datos de referencia.
//
// Idempotente: solo toca fichas sin job_title_id. Lo que no matchea se deja a mano (el picker de
// la ficha), y se lista para que RR.HH. sepa exactamente qué falta.
//
//   node scripts/backfill-employee-job-titles.mjs [--dry]
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

const norm = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
async function pageAll(table, cols, filter) {
  const out = []; const P = 1000;
  for (let f = 0; ; f += P) { let q = db.from(table).select(cols).range(f, f + P - 1); if (filter) q = filter(q); const { data, error } = await q; if (error || !data?.length) break; out.push(...data); if (data.length < P) break; }
  return out;
}

async function main() {
  // 1) formas de título → title_id (canónico + traducciones + sinónimos), ≥4 chars
  const [titles, tr, syn] = await Promise.all([
    pageAll("job_titles", "id, canonical_name"),
    pageAll("job_title_translations", "job_title_id, name"),
    pageAll("job_title_synonyms", "job_title_id, synonym"),
  ]);
  const forms = [];
  // ≥3 caracteres (no 4): los acrónimos que ESCO da como alternativeLabel —CEO, CTO, CIO— son de
  // 3 y son justo los cargos de dirección más habituales en una plantilla real. El padding con
  // espacios ya obliga a que casen como palabra completa, así que no generan falsos positivos.
  const push = (tid, label) => { const n = norm(label); if (n.length >= 3) forms.push({ form: ` ${n} `, tid }); };
  for (const t of titles) push(t.id, t.canonical_name);
  for (const t of tr) push(t.job_title_id, t.name);
  for (const s of syn) push(s.job_title_id, s.synonym);
  forms.sort((a, b) => b.form.length - a.form.length); // preferir el match más largo/específico
  console.log(`Formas de título: ${forms.length}`);

  // 2) fichas activas sin cargo canónico resuelto
  const employees = await pageAll("employees", "id, name, role_title, job_title_id");
  const pending = employees.filter((e) => !e.job_title_id && e.role_title);
  console.log(`Empleados: ${employees.length} · ya con cargo: ${employees.filter((e) => e.job_title_id).length} · a resolver: ${pending.length}`);

  // 3) match por el texto libre del cargo
  const upd = [];
  const noMatch = [];
  for (const e of pending) {
    const nt = ` ${norm(e.role_title)} `;
    const hit = forms.find((f) => nt.includes(f.form));
    if (hit) upd.push({ id: e.id, job_title_id: hit.tid });
    else noMatch.push(e.role_title);
  }
  console.log(`Match: ${upd.length} · sin match: ${noMatch.length}`);
  if (noMatch.length) {
    const tally = [...noMatch.reduce((m, r) => m.set(r, (m.get(r) ?? 0) + 1), new Map())].sort((a, b) => b[1] - a[1]);
    console.log("Cargos sin equivalente en la taxonomía (se resuelven a mano en la ficha):");
    for (const [role, n] of tally.slice(0, 20)) console.log(`  · ${role}${n > 1 ? ` (${n})` : ""}`);
  }
  if (DRY) { console.log({ muestra: upd.slice(0, 5) }); return; }

  // 4) 1 update por cargo (in de ids), no uno por empleado
  const byTitle = new Map();
  for (const u of upd) (byTitle.get(u.job_title_id) ?? byTitle.set(u.job_title_id, []).get(u.job_title_id)).push(u.id);
  for (const [tid, ids] of byTitle) {
    for (const part of chunk(ids, 200)) {
      const { error } = await db.from("employees").update({ job_title_id: tid }).in("id", part);
      if (error) throw error;
    }
  }
  console.log(`Backfill completo: ${upd.length} fichas vinculadas a su cargo canónico.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
