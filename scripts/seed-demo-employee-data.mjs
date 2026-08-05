// Datos de DEMO para una ficha de empleado concreta, para poder ver el portal con contenido:
// ausencias, registro de horas y líneas de nómina. No inventa nada estructural — usa los tipos
// de ausencia y las nóminas que la empresa ya tiene.
//
// Es para demo/QA. Idempotente: si la persona ya tiene datos de un bloque, no lo repite.
//
//   node scripts/seed-demo-employee-data.mjs <email> [--dry]
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

const EMAIL = process.argv[2];
const DRY = process.argv.includes("--dry");
if (!EMAIL) { console.error("Uso: node scripts/seed-demo-employee-data.mjs <email> [--dry]"); process.exit(1); }

const iso = (d) => d.toISOString().slice(0, 10);
// La jornada se guarda en timestamptz: la zona tiene que ser la de la persona, no una fija.
const TZ_BY_COUNTRY = { VE: "America/Caracas", ES: "Europe/Madrid", BR: "America/Sao_Paulo", US: "America/New_York", MX: "America/Mexico_City", PT: "Europe/Lisbon" };
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };

async function main() {
  const { data: emp } = await db.from("employees")
    .select("id, name, company_id, start_date, country").eq("email", EMAIL).maybeSingle();
  if (!emp) { console.error(`No hay ficha con email ${EMAIL}`); process.exit(1); }
  console.log(`Ficha: ${emp.name} (${emp.id})`);

  // ── Ausencias ────────────────────────────────────────────────────────────────
  const { count: absCount } = await db.from("absence_requests")
    .select("*", { count: "exact", head: true }).eq("employee_id", emp.id);
  let absences = [];
  if (absCount) {
    console.log(`Ausencias: ya tiene ${absCount}, se omite`);
  } else {
    const { data: types } = await db.from("absence_types")
      .select("id, name").eq("company_id", emp.company_id).eq("is_active", true);
    const byName = (n) => types?.find((t) => t.name.toLowerCase().includes(n))?.id ?? types?.[0]?.id;
    absences = [
      { type: byName("vacacion"), from: daysAgo(40), to: daysAgo(34), days: 5, status: "approved" },
      { type: byName("cita médica") ?? byName("medica"), from: daysAgo(12), to: daysAgo(12), days: 1, status: "approved" },
      // Futura: daysAgo(-n) es "dentro de n días", así que la de INICIO lleva el número mayor.
      { type: byName("vacacion"), from: daysAgo(-19), to: daysAgo(-25), days: 5, status: "pending" },
    ].filter((a) => a.type).map((a) => ({
      company_id: emp.company_id, employee_id: emp.id, absence_type_id: a.type,
      start_date: iso(a.from), end_date: iso(a.to), working_days_count: a.days, status: a.status,
      created_by_employee_id: emp.id,
    }));
  }

  // ── Horas: últimos 15 días naturales, solo laborables ─────────────────────────
  const { count: hoursCount } = await db.from("time_entries")
    .select("*", { count: "exact", head: true }).eq("employee_id", emp.id);
  let entries = [];
  if (hoursCount) {
    console.log(`Horas: ya tiene ${hoursCount}, se omite`);
  } else {
    const tz = TZ_BY_COUNTRY[emp.country] ?? "Europe/Madrid";
    for (let i = 1; i <= 15; i++) {
      const d = daysAgo(i);
      const dow = d.getDay();
      if (dow === 0 || dow === 6) continue;         // fin de semana
      const short = i % 5 === 0;                     // algún día más corto, para que no sea plano
      // start_time/end_time son timestamptz, no `time`: llevan la fecha completa.
      entries.push({
        company_id: emp.company_id, employee_id: emp.id, date: iso(d),
        start_time: `${iso(d)}T09:00:00Z`,
        end_time: `${iso(d)}T${short ? "15:30:00" : "18:00:00"}Z`,
        duration_minutes: short ? 390 : 480, entry_type: "work", source: "manual",
        timezone: tz,
      });
    }
  }

  // ── Nómina: líneas en las nóminas ya cerradas de su empresa ───────────────────
  const { count: linesCount } = await db.from("pay_run_lines")
    .select("*", { count: "exact", head: true }).eq("employee_id", emp.id);
  let lines = [];
  if (linesCount) {
    console.log(`Nómina: ya tiene ${linesCount} líneas, se omite`);
  } else {
    const { data: runs } = await db.from("pay_runs")
      .select("id, period_label, status, currency").eq("company_id", emp.company_id)
      .in("status", ["approved", "exported", "paid"]).order("period_month", { ascending: false }).limit(4);
    const GROSS = 4200;
    lines = (runs ?? []).map((r) => ({
      pay_run_id: r.id, employee_id: emp.id,
      gross: GROSS, net: Math.round(GROSS * 0.79), employer_cost: Math.round(GROSS * 1.31),
      status: "approved",
    }));
  }

  console.log(`A crear → ausencias: ${absences.length} · horas: ${entries.length} · líneas de nómina: ${lines.length}`);
  if (DRY) return;

  if (absences.length) { const { error } = await db.from("absence_requests").insert(absences); if (error) throw error; }
  if (entries.length) { const { error } = await db.from("time_entries").insert(entries); if (error) throw error; }
  if (lines.length) { const { error } = await db.from("pay_run_lines").insert(lines); if (error) throw error; }
  console.log("Datos de demo creados.");
}
main().catch((e) => { console.error(e); process.exit(1); });
