// Eval E2E del agente CV-parser contra el set dorado de evals/cv-parser/ (30 CVs
// sintéticos, 3 layouts × ES/EN, con ground_truth_manifest.csv).
//
// Uso:  node scripts/eval-cv-parser.mjs [--all]
//   - por defecto corre los 6 representativos (2 por layout, ES+EN, incl. freelance);
//   - --all corre los 30 (más coste/tiempo LLM).
// Requiere: dev server en :3001, .env.local con service_role y OPENAI_API_KEY.
// Crea candidatos desechables (nombre "Zz Eval …" ≠ nombre del CV, para detectar
// eco del perfil) y limpia todo al terminar.
//
// Criterio PASS por CV: nombre exacto del CV + años ±1 + ≥3 skills + ≥1 experiencia
// con título + extracted_source=cv_text.
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(ROOT, "package.json"));
const { createClient } = require("@supabase/supabase-js");

const env = Object.fromEntries(
  readFileSync(join(ROOT, ".env.local"), "utf8")
    .split("\n").filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const REF = new URL(URL_).hostname.split(".")[0];
const admin = createClient(URL_, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const anon = createClient(URL_, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const APP = process.env.APP_URL ?? "http://localhost:3001";
const DIR = join(ROOT, "evals", "cv-parser");

const manifest = readFileSync(join(DIR, "ground_truth_manifest.csv"), "utf8")
  .split("\n").slice(1).filter(Boolean)
  .map((l) => {
    const [file, name, role, lang, seniority, , years] = l.split(",");
    return { file, name, role, lang, seniority, years: Number(years) };
  });

const REPRESENTATIVE = new Set([
  "01_Product_Manager_Senior_ES.pdf", "02_Full_Stack_Developer_Senior_ES.pdf",
  "03_Data_Analyst_Senior_ES.pdf", "06_SDR_EN.pdf", "08_Growth_Lead_EN.pdf",
  "30_Freelance_Multirole_EN_ES.pdf",
]);
const cases = process.argv.includes("--all") ? manifest : manifest.filter((m) => REPRESENTATIVE.has(m.file));

// Sesión owner vía magiclink admin (sin contraseña)
const OWNER = process.env.EVAL_OWNER_EMAIL ?? "munozmichael01@gmail.com";
const { data: link, error: le } = await admin.auth.admin.generateLink({ type: "magiclink", email: OWNER });
if (le) { console.error("generateLink:", le.message); process.exit(1); }
const { data: sess, error: oe } = await anon.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: "magiclink" });
if (oe) { console.error("verifyOtp:", oe.message); process.exit(1); }
const raw = "base64-" + Buffer.from(JSON.stringify(sess.session)).toString("base64url");
const cname = `sb-${REF}-auth-token`;
const cookie = raw.length <= 3180 ? `${cname}=${raw}`
  : Array.from({ length: Math.ceil(raw.length / 3180) }, (_, i) => `${cname}.${i}=${raw.slice(i * 3180, (i + 1) * 3180)}`).join("; ");
const { data: member } = await admin.from("company_members").select("company_id").eq("user_id", sess.user.id).maybeSingle();
const { data: job } = await admin.from("jobs").select("id").eq("company_id", member.company_id).limit(1).maybeSingle();

const norm = (s) => (s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
let pass = 0;
const rows = [];
for (const c of cases) {
  const pdf = readFileSync(join(DIR, c.file));
  const path = `test/eval-${Date.now()}-${c.file}`;
  await admin.storage.from("cvs").upload(path, pdf, { contentType: "application/pdf" });
  const { data: cand } = await admin.from("candidates").insert({
    name: `Zz Eval ${c.file.slice(0, 2)}`, email: `eval-${Date.now()}-${c.file.slice(0, 2)}@example.dev`,
    source: "test", cv_url: path,
  }).select().single();
  await admin.from("applications").insert({ candidate_id: cand.id, job_id: job.id });

  try {
    const r = await fetch(`${APP}/api/agents/cv-parser`, {
      method: "POST", headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ candidateId: cand.id }),
    });
    const j = await r.json();
    const p = j.profile ?? {};
    const nameOk = norm(p.name) === norm(c.name);
    const yearsOk = typeof p.experience_years === "number" && Math.abs(p.experience_years - c.years) <= 1;
    const skillsOk = Array.isArray(p.skills) && p.skills.length >= 3;
    const expOk = Array.isArray(p.experiences) && p.experiences.length >= 1 && !!p.experiences[0]?.title;
    const fromCv = p.extracted_source === "cv_text" && j.status === "ok";
    const allOk = nameOk && yearsOk && skillsOk && expOk && fromCv;
    if (allOk) pass++;
    rows.push({
      file: c.file.slice(0, 30), ok: allOk ? "PASS" : "FAIL",
      name: nameOk ? "✓" : `✗(${p.name})`,
      years: yearsOk ? `✓(${p.experience_years})` : `✗(${p.experience_years} vs ${c.years})`,
      skills: skillsOk ? `✓(${p.skills.length})` : "✗",
      exp: expOk ? `✓(${p.experiences.length})` : "✗",
      langs: Array.isArray(p.languages) ? p.languages.length : "-",
      edu: Array.isArray(p.education) ? p.education.length : "-",
    });
  } catch (e) {
    rows.push({ file: c.file.slice(0, 30), ok: "ERROR", name: String(e).slice(0, 40) });
  } finally {
    await admin.from("candidates").delete().eq("id", cand.id);
    await admin.storage.from("cvs").remove([path]);
  }
}
console.table(rows);
console.log(`\nRESULTADO: ${pass}/${cases.length} PASS`);
process.exit(pass === cases.length ? 0 : 1);
