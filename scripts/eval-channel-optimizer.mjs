// Eval del channel-optimizer: sobre una oferta real de Acme.
// Invariante DURO (confirmado con Michael): la suma del presupuesto repartido NO
// supera el presupuesto dado. (Más reglas cuando se configuren canales.)
//   Uso: node scripts/eval-channel-optimizer.mjs   (npm run eval:channel)
//   Nota: el endpoint persiste un distribution_plan (pending) por llamada — datos de demo.
import { admin, ACME, OWNER, sessionCookie, post, report } from "./_eval-common.mjs";

const cookie = await sessionCookie(OWNER);

const { data: jobs } = await admin.from("jobs").select("id, title").eq("company_id", ACME).limit(1);
if (!jobs?.length) { console.error("Sin ofertas de Acme para evaluar."); process.exit(2); }
const jobId = jobs[0].id;

const CASES = [
  { id: "volumen-500", objective: "volume", budget: 500 },
  { id: "calidad-200", objective: "quality", budget: 200 },
];

const rows = [];
for (const c of CASES) {
  try {
    const { status, json } = await post("/api/agents/channel-optimizer", { jobId, objective: c.objective, budget: c.budget }, cookie);
    const o = json.output ?? {};
    const recs = Array.isArray(o.recommendations) ? o.recommendations : [];
    const sum = recs.reduce((s, r) => s + (Number(r.budget) || 0), 0);
    const checks = {
      http: status === 200,
      shape: recs.length > 0 && recs.every((r) => r.channel_name && typeof r.copy === "string") && typeof o.rationale === "string",
      budget: sum <= c.budget, // ← el invariante duro
    };
    const ok = Object.values(checks).every(Boolean);
    rows.push({ caso: c.id, estado: json.status ?? "?", ok: ok ? "PASS" : "FAIL",
      detalle: ok ? `${recs.length} canales · reparto ${sum}/${c.budget}€` : `reparto ${sum}/${c.budget} · ${JSON.stringify(checks)}` });
  } catch (e) {
    rows.push({ caso: c.id, estado: "ERR", ok: "ERROR", detalle: String(e).slice(0, 80) });
  }
}
report("channel-optimizer", rows);
