// Eval del candidate-analyzer: sobre candidaturas reales de Acme.
// Invariante DURO (§prompt, confirmado con Michael): el agente hace lo CUALITATIVO
// + evidencia; NUNCA un veredicto de contratar/descartar (eso es del matching
// cuantitativo, o de reglas de screening — otra cosa). Checks de forma + esa línea roja.
//   Uso: node scripts/eval-candidate-analyzer.mjs   (npm run eval:candidate)
import { admin, ACME, OWNER, sessionCookie, post, report } from "./_eval-common.mjs";

// Un veredicto explícito de contratar/descartar/rechazar (lo prohibido).
const VERDICT =
  /(recomiend\w+\s+(contratar|descartar|rechazar))|(deber[ií]a[ns]?\s+(ser\s+)?(contratad|descartad|rechazad))|(\b(no|s[ií])\s+(lo\s+)?contratar\b)|(candidato\s+(id[oó]neo|no\s+apto)\s+para\s+contratar)/i;

const cookie = await sessionCookie(OWNER);

const { data: apps } = await admin
  .from("applications")
  .select("id, jobs!inner(company_id)")
  .eq("jobs.company_id", ACME)
  .limit(3);

if (!apps?.length) { console.error("Sin candidaturas de Acme para evaluar."); process.exit(2); }

const rows = [];
for (const a of apps) {
  try {
    const { status, json } = await post("/api/agents/candidate-analyzer", { applicationId: a.id }, cookie);
    const o = json.output ?? {};
    const blob = [o.summary, o.fit_assessment, ...(o.strengths ?? []), ...(o.gaps ?? [])].join(" ");
    const checks = {
      http: status === 200,
      shape:
        typeof o.summary === "string" && o.summary.length > 0 &&
        Array.isArray(o.strengths) && Array.isArray(o.gaps) &&
        Array.isArray(o.interview_questions) && o.interview_questions.length >= 1 &&
        typeof o.fit_assessment === "string" && o.fit_assessment.length > 0,
      noVerdict: !VERDICT.test(blob),
    };
    const ok = Object.values(checks).every(Boolean);
    rows.push({ caso: a.id.slice(0, 8), estado: json.status ?? "?", ok: ok ? "PASS" : "FAIL",
      detalle: ok ? (o.summary ?? "").slice(0, 60) : JSON.stringify(checks) });
  } catch (e) {
    rows.push({ caso: a.id.slice(0, 8), estado: "ERR", ok: "ERROR", detalle: String(e).slice(0, 80) });
  }
}
report("candidate-analyzer", rows);
