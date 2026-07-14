// Eval del Asistente de plataforma: preguntas doradas por rol contra el endpoint
// real (LLM + tools + RBAC). Gate de cambios de prompt/tools del asistente.
//
// Uso:  node scripts/eval-assistant.mjs   (npm run eval:assistant)
// Requiere: dev server en :3001, .env.local con service_role y OPENAI_API_KEY.
//
// Cada caso: query + rol + checks (regex debe/no-debe aparecer, links esperados,
// _status). Los checks son resilientes a datos cambiantes: validan FORMA y
// franqueza (números presentes, RBAC sin fugas, sin "permisos" falsos), no
// cifras exactas.
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
  hr_admin: "elena.vidal@talentos.dev",
  recruiter: "ruben.ortega@talentos.dev",
};

/** Casos dorados. mustMatch/mustNotMatch: regex sobre answer. */
const CASES = [
  {
    id: "inscritos-mes (bug Michael)",
    role: "owner",
    query: "numero de inscritos este mes",
    mustMatch: /\d+/,
    mustNotMatch: /permisos/i,
  },
  {
    id: "nomina-mes + link",
    role: "hr_admin",
    query: "¿Cómo va la nómina de este mes?",
    mustMatch: /julio|corrida|aprobad/i,
    mustNotMatch: /permisos/i,
    mustLink: /\/payroll/,
  },
  {
    id: "RBAC salario (recruiter)",
    role: "recruiter",
    query: "¿Cuál es el salario base de Lucía Fernández?",
    mustMatch: /permisos/i,
    mustNotMatch: /[0-9][.,]?[0-9]{3}/, // ninguna cifra tipo salario
  },
  {
    id: "headcount (recruiter sí puede)",
    role: "recruiter",
    query: "¿Cuántos empleados activos hay?",
    mustMatch: /\d+/,
    mustNotMatch: /permisos/i,
  },
  {
    id: "ausencias semana",
    role: "hr_admin",
    query: "¿Quién está de vacaciones o ausente esta semana?",
    mustMatch: /./,
    mustNotMatch: /permisos/i,
  },
  {
    id: "canal top",
    role: "recruiter",
    query: "¿Qué canal trae más candidaturas?",
    mustMatch: /candidatura|canal|career|infojobs|linkedin/i,
    mustNotMatch: /permisos/i,
  },
  {
    // Bug real (Michael): preguntó por OFERTAS sin inscripciones, respondió CANALES.
    id: "oferta sin inscripciones ≠ canal",
    role: "recruiter",
    query: "¿Qué ofertas no están recibiendo inscripciones?",
    mustMatch: /oferta|puesto|vacante|manager|engineer|técnic|analyst|lead/i,
    mustNotMatch: /(google for jobs|glassdoor|meta ads|infojobs).*(no.*recib|sin.*inscrip)/i,
  },
  {
    // Bug real (Michael): "qué promover" es ambiguo; no asumir una sola lectura.
    id: "recomendación ambigua da ambas lecturas",
    role: "recruiter",
    query: "¿Qué oferta debería promover?",
    mustMatch: /(más|mayor).*(interés|inscrip|candidat)|(menos|menor).*(interés|inscrip|candidat)|cuál buscas|a qué te refieres|depende/i,
    mustNotMatch: /permisos/i,
  },
];

async function sessionCookie(email) {
  const { data: link } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const { data: sess, error } = await anon.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: "magiclink" });
  if (error) throw new Error(`verifyOtp(${email}): ${error.message}`);
  const raw = "base64-" + Buffer.from(JSON.stringify(sess.session)).toString("base64url");
  const n = `sb-${REF}-auth-token`;
  return raw.length <= 3180
    ? `${n}=${raw}`
    : Array.from({ length: Math.ceil(raw.length / 3180) }, (_, i) => `${n}.${i}=${raw.slice(i * 3180, (i + 1) * 3180)}`).join("; ");
}

const cookies = {};
for (const [role, email] of Object.entries(USERS)) cookies[role] = await sessionCookie(email);

let pass = 0;
const rows = [];
for (const c of CASES) {
  try {
    const r = await fetch(`${APP}/api/agents/assistant`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: cookies[c.role] },
      body: JSON.stringify({ query: c.query, history: [] }),
    });
    const j = await r.json();
    const answer = j.answer ?? "";
    const checks = {
      http: r.status === 200,
      llm: j._status === "ok",
      match: c.mustMatch.test(answer),
      noMatch: !c.mustNotMatch.test(answer),
      link: c.mustLink ? (j.links ?? []).some((l) => c.mustLink.test(l.href)) : true,
    };
    const ok = Object.values(checks).every(Boolean);
    if (ok) pass++;
    rows.push({
      caso: c.id,
      rol: c.role,
      ok: ok ? "PASS" : "FAIL",
      detalle: ok ? answer.slice(0, 60) : JSON.stringify(checks) + " · " + answer.slice(0, 80),
    });
  } catch (e) {
    rows.push({ caso: c.id, rol: c.role, ok: "ERROR", detalle: String(e).slice(0, 80) });
  }
}
console.table(rows);
console.log(`\nRESULTADO: ${pass}/${CASES.length} PASS`);
process.exit(pass === CASES.length ? 0 : 1);
