// Eval del payroll copilot: comportamiento del REDACTOR LLM contra el endpoint
// real (/api/payroll/runs/:id/review), sobre las corridas que ya existen en el
// demo — sin sembrar nada. Gate de cambios de prompt/wiring del copiloto.
//
// Uso:  node scripts/eval-payroll-copilot.mjs   (npm run eval:payroll)
// Requiere: dev server en :3001, .env.local con service_role y OPENAI_API_KEY.
//
// La capa DETERMINISTA (detectores computeRunFindings) se blinda con casos dorados
// en vitest (lib/payroll/__tests__/copilot.test.ts, 13 casos). Aquí probamos lo que
// vitest no puede: que el LLM redacte FIEL a los avisos — sin inventar personas, sin
// veredicto de aprobar/rechazar, anclado a los datos. Checks de FORMA y franqueza,
// resilientes a datos cambiantes (no cifras exactas).
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

const USERS = {
  owner: "munozmichael01@gmail.com",
  recruiter: "ruben.ortega@talentos.dev", // sin acceso a nómina — para el caso RBAC
};

const KNOWN_KINDS = new Set(["variation", "new_in_run", "missing_from_run", "salary_change", "bank_issue", "no_profile"]);
// Palabras capitalizadas esperadas que NO son nombres de persona (meses, etiquetas).
const NOT_A_NAME = new Set([
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto",
  "Septiembre", "Octubre", "Noviembre", "Diciembre", "Sin", "Empieza", "Revisa",
  "La", "El", "Los", "Las", "Un", "Una", "Hay", "Se", "IA",
]);

async function sessionCookie(email) {
  const { data: link } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const { data: sess } = await anon.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: "magiclink" });
  const raw = "base64-" + Buffer.from(JSON.stringify(sess.session)).toString("base64url");
  const n = `sb-${REF}-auth-token`;
  return raw.length <= 3180
    ? `${n}=${raw}`
    : Array.from({ length: Math.ceil(raw.length / 3180) }, (_, i) => `${n}.${i}=${raw.slice(i * 3180, (i + 1) * 3180)}`).join("; ");
}

/** Tokens de nombre permitidos: cada palabra de cada employee_name de los findings. */
function allowedNameTokens(findings) {
  const set = new Set();
  for (const f of findings) {
    for (const tok of (f.employee_name ?? "").split(/\s+/)) {
      if (tok) set.add(tok.toLowerCase().replace(/[.,]/g, ""));
    }
  }
  return set;
}

/** Palabras del resumen que PARECEN nombre de persona pero no están en los findings. */
function hallucinatedNames(summary, findings) {
  const allowed = allowedNameTokens(findings);
  const sentences = summary.split(/(?<=[.!?])\s+/); // para no penalizar la primera palabra de cada frase
  const suspects = [];
  for (const s of sentences) {
    const words = s.split(/\s+/);
    words.forEach((w, i) => {
      const clean = w.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, "");
      if (i === 0) return; // inicio de frase: capitalización gramatical, no nombre
      if (!/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,}$/.test(clean)) return; // no parece nombre propio
      if (NOT_A_NAME.has(clean)) return;
      if (allowed.has(clean.toLowerCase())) return; // es un nombre real de los avisos
      suspects.push(clean);
    });
  }
  return suspects;
}

// ── Checks de un review sobre una corrida real ──────────────────────────────
function checkReview(run, body) {
  const errs = [];
  const { findings, summary, summary_source } = body;

  if (!Array.isArray(findings)) errs.push("findings no es array");
  else {
    for (const f of findings) {
      if (!KNOWN_KINDS.has(f.kind)) errs.push(`kind desconocido: ${f.kind}`);
      if (!["warning", "info"].includes(f.severity)) errs.push(`severity inválida: ${f.severity}`);
      // Los kinds con entidad deben nombrarla
      if (f.kind !== "no_profile" && f.employee_name == null) errs.push(`${f.kind} sin employee_name`);
    }
  }

  if (typeof summary !== "string" || summary.trim().length === 0) errs.push("summary vacío");
  if (typeof summary === "string" && summary.length > 320) errs.push(`summary demasiado largo (${summary.length} > 320)`);
  if (!["ok", "fallback"].includes(summary_source)) errs.push(`summary_source inesperado: ${summary_source}`);

  if (typeof summary === "string") {
    // 1. Sin veredicto de aprobar/rechazar (el copiloto señala, no decide).
    if (/aprob|rechaz|deber[íi]as?|recomiend/i.test(summary)) errs.push(`resumen con veredicto/recomendación: "${summary}"`);
    // 2. Anti-alucinación: no nombra personas que no están en los avisos.
    const halluc = hallucinatedNames(summary, findings ?? []);
    if (halluc.length) errs.push(`posibles nombres inventados: ${halluc.join(", ")} — resumen: "${summary}"`);
    // 3. Faithfulness positivo: si hay warnings, ancla nombrando a alguien real.
    const warnings = (findings ?? []).filter((f) => f.severity === "warning" && f.employee_name);
    if (warnings.length > 0 && summary_source === "ok") {
      const named = warnings.some((w) => summary.toLowerCase().includes((w.employee_name.split(/\s+/)[0] ?? "").toLowerCase()));
      if (!named) errs.push(`hay ${warnings.length} warnings pero el resumen no nombra a ninguno: "${summary}"`);
    }
  }
  return errs;
}

async function main() {
  const cookie = await sessionCookie(USERS.owner);

  // Elegir 2 corridas reales que comparen contra un mes anterior (más señal).
  const { data: runs } = await admin
    .from("pay_runs").select("id, status, period_label, period_month")
    .neq("status", "draft").order("period_month", { ascending: false }).limit(4);

  let pass = 0, fail = 0;
  for (const run of (runs ?? []).slice(0, 2)) {
    const r = await fetch(`${APP}/api/payroll/runs/${run.id}/review`, { headers: { cookie } });
    const body = await r.json().catch(() => ({}));
    const errs = r.status !== 200 ? [`HTTP ${r.status}`] : checkReview(run, body);
    if (errs.length === 0) {
      pass++;
      console.log(`✅ ${run.period_label}: ${body.findings?.length ?? 0} avisos · fuente ${body.summary_source}`);
      console.log(`   "${body.summary}"`);
    } else {
      fail++;
      console.log(`❌ ${run.period_label}:`);
      errs.forEach((e) => console.log(`   - ${e}`));
    }
  }

  // RBAC: recruiter no puede pedir la revisión de nómina (owner/hr_admin only).
  const recruiterCookie = await sessionCookie(USERS.recruiter);
  const someRun = (runs ?? [])[0];
  if (someRun) {
    const r = await fetch(`${APP}/api/payroll/runs/${someRun.id}/review`, { headers: { cookie: recruiterCookie } });
    if (r.status === 401 || r.status === 403) {
      pass++;
      console.log(`✅ RBAC: recruiter → ${r.status} (sin acceso a nómina)`);
    } else {
      fail++;
      console.log(`❌ RBAC: recruiter obtuvo ${r.status} (debería ser 401/403)`);
    }
  }

  console.log(`\n${pass}/${pass + fail} ${fail === 0 ? "✅ payroll-copilot OK" : "❌ hay fallos"}`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
