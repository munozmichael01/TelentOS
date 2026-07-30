// Siembra el expediente (employee_events, migr. 0069) con el evento de ALTA de cada empleado,
// derivado de su `start_date`. No inventa nada: es un hecho que ya está en la ficha y que el
// expediente debería haber registrado cuando ocurrió.
//
// Idempotente: solo crea el evento si esa persona no tiene ya uno de tipo 'hired'.
//
//   node scripts/backfill-employee-events.mjs [--dry]
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

async function main() {
  const { data: employees, error } = await db.from("employees").select("id, name, role_title, start_date");
  if (error) throw error;
  const { data: existing } = await db.from("employee_events").select("employee_id").eq("type", "hired");
  const already = new Set((existing ?? []).map((r) => r.employee_id));

  const rows = (employees ?? [])
    .filter((e) => e.start_date && !already.has(e.id))
    .map((e) => ({
      employee_id: e.id,
      type: "hired",
      summary: e.role_title ?? null,
      payload: { start_date: e.start_date },
      // created_at con la fecha real de alta: el expediente es un historial, no un log de carga.
      created_at: new Date(`${e.start_date}T09:00:00Z`).toISOString(),
    }));

  console.log(`Empleados: ${employees.length} · ya con evento de alta: ${already.size} · a crear: ${rows.length}`);
  if (DRY) { console.log(rows.slice(0, 3)); return; }
  if (!rows.length) return;

  for (let i = 0; i < rows.length; i += 200) {
    const { error: e } = await db.from("employee_events").insert(rows.slice(i, i + 200));
    if (e) throw e;
  }
  console.log(`Expediente sembrado con ${rows.length} eventos de alta.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
