// Eval del onboarding-builder: sobre empleados reales de Acme.
// Invariantes: checklist coherente (≥3 tareas), cada tarea con título + responsable +
// fecha relativa (due_offset_days), sin tareas vacías. Sin `persist` → sin escritura.
//   Uso: node scripts/eval-onboarding-builder.mjs   (npm run eval:onboarding)
import { admin, ACME, OWNER, sessionCookie, post, report } from "./_eval-common.mjs";

const cookie = await sessionCookie(OWNER);

const { data: emps } = await admin
  .from("employees")
  .select("id, role_title")
  .eq("company_id", ACME)
  .limit(2);
if (!emps?.length) { console.error("Sin empleados de Acme para evaluar."); process.exit(2); }

const rows = [];
for (const e of emps) {
  try {
    const { status, json } = await post("/api/agents/onboarding-builder", { employeeId: e.id }, cookie);
    const o = json.output ?? {};
    const tasks = Array.isArray(o.tasks) ? o.tasks : [];
    const titles = new Set(tasks.map((t) => (t.title ?? "").trim()).filter(Boolean));
    const checks = {
      http: status === 200,
      count: tasks.length >= 3,
      fields: tasks.every((t) => (t.title ?? "").trim() && (t.assignee ?? "").trim() && typeof t.due_offset_days === "number"),
      distinct: titles.size === tasks.length, // sin títulos vacíos ni duplicados
      rationale: typeof o.rationale === "string" && o.rationale.length > 0,
    };
    const ok = Object.values(checks).every(Boolean);
    rows.push({ caso: (e.role_title ?? e.id.slice(0, 8)).slice(0, 20), estado: json.status ?? "?", ok: ok ? "PASS" : "FAIL",
      detalle: ok ? `${tasks.length} tareas` : JSON.stringify(checks) });
  } catch (err) {
    rows.push({ caso: e.id.slice(0, 8), estado: "ERR", ok: "ERROR", detalle: String(err).slice(0, 80) });
  }
}
report("onboarding-builder", rows);
