// Puebla job_skills desde el JOB TITLE de cada oferta (acotación del dueño): identifica el
// título canónico por el texto del título de la oferta (match contra job_titles +
// translations + synonyms) y le adjunta las skills relacionadas del título (job_title_skills)
// como job_skills. Así el eje de skills del fit deja de estar vacío para las ofertas
// importadas de Turijobs (que no declaran skills). Idempotente: solo ofertas sin job_skills.
//
//   node scripts/backfill-job-skills.mjs [--dry]
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
  const forms = []; // {form, tid}
  const push = (tid, label) => { const n = norm(label); if (n.length >= 4) forms.push({ form: ` ${n} `, tid }); };
  for (const t of titles) push(t.id, t.canonical_name);
  for (const t of tr) push(t.job_title_id, t.name);
  for (const s of syn) push(s.job_title_id, s.synonym);
  forms.sort((a, b) => b.form.length - a.form.length); // preferir el match más largo/específico
  console.log(`Formas de título: ${forms.length}`);

  // 2) skills por título
  const skillsByTitle = new Map();
  for (const r of await pageAll("job_title_skills", "job_title_id, skill_id, is_core")) {
    (skillsByTitle.get(r.job_title_id) ?? skillsByTitle.set(r.job_title_id, []).get(r.job_title_id)).push(r);
  }

  // 3) ofertas sin job_skills
  const jobsAll = await pageAll("jobs", "id, title");
  const withSkills = new Set((await pageAll("job_skills", "job_id")).map((r) => r.job_id));
  const jobs = jobsAll.filter((j) => !withSkills.has(j.id));
  console.log(`Ofertas sin skills: ${jobs.length}`);

  // 4) match + filas job_skills
  const rows = [];
  let matched = 0, noMatch = 0;
  for (const j of jobs) {
    const nt = ` ${norm(j.title)} `;
    const hit = forms.find((f) => nt.includes(f.form));
    const sks = hit ? skillsByTitle.get(hit.tid) : null;
    if (!sks?.length) { noMatch++; continue; }
    matched++;
    for (const s of sks) rows.push({ job_id: j.id, skill_id: s.skill_id, requirement: s.is_core ? "excluyente" : "deseable" });
  }
  console.log(`Match: ${matched} · sin match: ${noMatch} · filas job_skills: ${rows.length}`);
  if (DRY) { console.log(rows.slice(0, 5)); return; }
  for (const part of chunk(rows, 1000)) { const { error } = await db.from("job_skills").upsert(part, { onConflict: "job_id,skill_id" }); if (error) throw error; }
  console.log("Backfill de job_skills completo.");
}
main().catch((e) => { console.error(e); process.exit(1); });
