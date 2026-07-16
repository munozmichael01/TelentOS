// Utilidades compartidas de los evals de agentes (patrón de eval-payroll-copilot /
// eval-assistant): carga .env.local, clientes Supabase, cookie de sesión por magic
// link, y un reporter común. Requiere: dev server en :3001 + .env.local con
// service_role y OPENAI_API_KEY.
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(ROOT, "package.json"));
const { createClient } = require("@supabase/supabase-js");

export const env = Object.fromEntries(
  readFileSync(join(ROOT, ".env.local"), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);

const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const REF = new URL(URL_).hostname.split(".")[0];
export const admin = createClient(URL_, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const anon = createClient(URL_, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });

export const APP = process.env.APP_URL ?? "http://localhost:3001";
export const OWNER = "munozmichael01@gmail.com";
export const ACME = "00000000-0000-0000-0000-000000000001";

export async function sessionCookie(email) {
  const { data: link } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const { data: sess, error } = await anon.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: "magiclink" });
  if (error) throw new Error(`verifyOtp(${email}): ${error.message}`);
  const raw = "base64-" + Buffer.from(JSON.stringify(sess.session)).toString("base64url");
  const n = `sb-${REF}-auth-token`;
  return raw.length <= 3180
    ? `${n}=${raw}`
    : Array.from({ length: Math.ceil(raw.length / 3180) }, (_, i) => `${n}.${i}=${raw.slice(i * 3180, (i + 1) * 3180)}`).join("; ");
}

export async function post(path, body, cookie) {
  const r = await fetch(`${APP}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, json: j };
}

/** Reporta y sale con código 0 si todos PASS, 1 si alguno falla. */
export function report(name, rows) {
  const pass = rows.filter((r) => r.ok === "PASS").length;
  console.table(rows);
  console.log(`\n[${name}] RESULTADO: ${pass}/${rows.length} PASS`);
  process.exit(pass === rows.length ? 0 : 1);
}
