/**
 * Backfill del registro de altas por producto (`app_metadata.audiences`).
 *
 * Antes el reparto era un valor único `app_metadata.audience` con tres estados: `candidate`,
 * `employee` y ausente (= personal de empresa). Ausente significaba "entra al admin", así que
 * era default-allow. Ahora sin alta no se entra a ningún producto, y este script reconstruye
 * las altas de las cuentas que ya existían.
 *
 * Se toma la UNIÓN de los hechos y el claim viejo: durante una migración no se quita acceso a
 * nadie. Si alguien tenía `audience=candidate` pero ya no tiene ficha de candidato, conserva su
 * alta — que caduque es cosa del producto cuando lo detecte, no de este barrido.
 *
 *   node scripts/backfill-audiences.mjs [--apply]
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const APPLY = process.argv.includes("--apply");
const ORDER = ["staff", "employee", "candidate"];

// Supabase pagina a 1000 por defecto: sin esto se pierden filas en silencio.
async function all(table, cols) {
  const out = []; const size = 1000;
  for (let from = 0; ; from += size) {
    const { data, error } = await admin.from(table).select(cols).range(from, from + size - 1);
    if (error) throw error;
    out.push(...(data ?? []));
    if ((data ?? []).length < size) return out;
  }
}

const [members, employees, candidates] = await Promise.all([
  all("company_members", "user_id, role"),
  all("employees", "user_id"),
  all("candidates", "user_id"),
]);
const staffIds = new Set(members.filter((m) => m.user_id && m.role !== "employee").map((m) => m.user_id));
const employeeIds = new Set(employees.filter((e) => e.user_id).map((e) => e.user_id));
const candidateIds = new Set(candidates.filter((c) => c.user_id).map((c) => c.user_id));

const users = [];
for (let page = 1; ; page++) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
  if (error) throw error;
  users.push(...data.users);
  if (data.users.length < 200) break;
}

let changed = 0, locked = 0;
for (const u of users) {
  const facts = ORDER.filter((a) =>
    (a === "staff" && staffIds.has(u.id)) ||
    (a === "employee" && employeeIds.has(u.id)) ||
    (a === "candidate" && candidateIds.has(u.id)));

  // Ausencia de claim NO era "ninguna audiencia": era personal de empresa, y así llegaba al
  // onboarding quien se había registrado sin crear todavía su empresa. Arrastrarlo como `staff`
  // es lo que evita echar a esas cuentas. Para las cuentas NUEVAS el default sigue siendo denegar.
  const legacy = u.app_metadata?.audience;
  const carried = legacy === "candidate" ? ["candidate"] : legacy === "employee" ? ["employee"] : ["staff"];
  const next = ORDER.filter((a) => facts.includes(a) || carried.includes(a));

  const prev = Array.isArray(u.app_metadata?.audiences) ? u.app_metadata.audiences : null;
  const same = prev && prev.length === next.length && next.every((a) => prev.includes(a));
  if (same) continue;

  if (next.length === 0) locked++;
  console.log(`${next.length ? "  " : "⚠ "}${(u.email ?? u.id).padEnd(34)} ${legacy ?? "(sin claim)"} → [${next.join(", ") || "ninguna"}]`);
  changed++;
  if (APPLY) {
    const { error } = await admin.auth.admin.updateUserById(u.id, {
      app_metadata: { ...(u.app_metadata ?? {}), audiences: next },
    });
    if (error) console.error("   ❌", error.message);
  }
}
console.log(`\n${users.length} cuentas · ${changed} a cambiar · ${locked} se quedarían sin ningún producto`);
if (!APPLY) console.log("Simulación. Añade --apply para escribir.");
