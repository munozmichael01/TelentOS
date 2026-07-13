import type { AgentTool } from "@/agents/core";
import { createAdminClient } from "@/lib/supabase/server";
import { queryChannelData } from "@/agents/agent-channel-analyst/tools";

/**
 * Packs de tools del Asistente de plataforma (S4), por vertical y con RBAC:
 * cada tool filtra por companyId (del guard, nunca del cliente — lección H2) y
 * solo se monta si el rol la permite. Un recruiter no VE las tools de nómina:
 * el asistente dirá que requiere permisos (regla del prompt), nunca fingirá.
 * Todas son de SOLO LECTURA — el asistente jamás escribe (invariante).
 */

export type AssistantRole = "owner" | "hr_admin" | "recruiter";

// ── Ejecutores (companyId cerrado por closure) ───────────────────────────────

async function getHeadcount(companyId: string) {
  const db = createAdminClient();
  const { data } = await db.from("employees").select("id, department, status").eq("company_id", companyId);
  const rows = data ?? [];
  const byDept: Record<string, number> = {};
  for (const e of rows) {
    if (e.status !== "active") continue;
    const d = (e.department as string) || "Sin departamento";
    byDept[d] = (byDept[d] ?? 0) + 1;
  }
  return {
    active: rows.filter((e) => e.status === "active").length,
    total: rows.length,
    by_department: byDept,
  };
}

async function searchEmployees(companyId: string, args: { name?: string; department?: string; status?: string }) {
  const db = createAdminClient();
  let q = db
    .from("employees")
    .select("id, name, role_title, department, status, start_date")
    .eq("company_id", companyId)
    .limit(500);
  if (args.status) q = q.eq("status", args.status);
  const { data } = await q;
  // Filtros de texto insensibles a acentos (el LLM escribe "Lucia", la DB "Lucía")
  let rows = data ?? [];
  if (args.name) rows = rows.filter((e) => fold(e.name as string).includes(fold(args.name!)));
  if (args.department) rows = rows.filter((e) => fold((e.department as string) ?? "").includes(fold(args.department!)));
  return { employees: rows.slice(0, 15), hint: "url de ficha: /employees/{id}" };
}

/** Normaliza para comparar sin acentos ni mayúsculas ("Lucia" ↔ "Lucía"). */
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

async function getEmployee(companyId: string, args: { name: string }, includeComp: boolean) {
  const db = createAdminClient();
  // El LLM suele escribir nombres sin acentos: ilike no basta. Traemos los
  // nombres de la empresa y matcheamos insensible a diacríticos en JS.
  const { data: all, error: qErr } = await db
    .from("employees")
    .select("id, name, role_title, department, status, start_date")
    .eq("company_id", companyId)
    .limit(500);
  // Un error de query NUNCA debe disfrazarse de "no encontré" (lección del eval).
  if (qErr) return { error: `No pude consultar empleados: ${qErr.message}` };
  const q = fold(args.name);
  const emp = (all ?? []).find((e) => fold(e.name as string).includes(q));
  if (!emp) return { error: `No encontré a "${args.name}" en la empresa` };

  const today = new Date().toISOString().slice(0, 10);
  const { data: absences } = await db
    .from("absence_requests")
    .select("start_date, end_date, status")
    .eq("employee_id", emp.id)
    .gte("end_date", today)
    .order("start_date")
    .limit(5);

  let compensation: unknown = "REQUIERE_PERMISOS_DE_NOMINA";
  if (includeComp) {
    const { data: profile } = await db
      .from("pay_profiles")
      .select("base_salary, currency, frequency, effective_from")
      .eq("employee_id", emp.id)
      .is("effective_to", null)
      .maybeSingle();
    compensation = profile ?? "sin perfil salarial";
  }

  return { employee: emp, upcoming_absences: absences ?? [], compensation, profile_url: `/employees/${emp.id}` };
}

async function getAbsenceOverlaps(companyId: string, args: { from?: string; to?: string; department?: string }) {
  const db = createAdminClient();
  const from = args.from ?? new Date().toISOString().slice(0, 10);
  const to = args.to ?? new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const { data } = await db
    .from("absence_requests")
    .select("start_date, end_date, status, employees!inner(id, name, department, company_id)")
    .eq("employees.company_id", companyId)
    .in("status", ["approved", "pending"])
    .lte("start_date", to)
    .gte("end_date", from)
    .order("start_date");
  let rows = (data ?? []) as unknown as Array<{ start_date: string; end_date: string; status: string; employees: { name: string; department: string | null } }>;
  if (args.department) rows = rows.filter((r) => (r.employees.department ?? "").toLowerCase().includes(args.department!.toLowerCase()));
  return {
    period: { from, to },
    absences: rows.map((r) => ({ name: r.employees.name, department: r.employees.department, start: r.start_date, end: r.end_date, status: r.status })),
  };
}

async function getRecruitingStats(companyId: string, args: { period_month?: string }) {
  const db = createAdminClient();
  const month = args.period_month ?? new Date().toISOString().slice(0, 7);
  const from = `${month}-01`;
  const to = `${month}-31`;
  const { data } = await db
    .from("applications")
    .select("id, source, created_at, jobs!inner(company_id, title)")
    .eq("jobs.company_id", companyId)
    .gte("created_at", from)
    .lte("created_at", `${to}T23:59:59`);
  const rows = (data ?? []) as unknown as Array<{ source: string | null; jobs: { title: string } }>;
  const bySource: Record<string, number> = {};
  const byJob: Record<string, number> = {};
  for (const a of rows) {
    bySource[a.source ?? "desconocido"] = (bySource[a.source ?? "desconocido"] ?? 0) + 1;
    byJob[a.jobs.title] = (byJob[a.jobs.title] ?? 0) + 1;
  }
  return { period_month: month, total_applications: rows.length, by_source: bySource, by_job: byJob };
}

async function getPipelineSnapshot(companyId: string, args: { job_title?: string }) {
  const db = createAdminClient();
  let jobsQ = db.from("jobs").select("id, title, status").eq("company_id", companyId).eq("status", "active").limit(10);
  if (args.job_title) jobsQ = jobsQ.ilike("title", `%${args.job_title}%`);
  const { data: jobs } = await jobsQ;
  const out = [];
  for (const job of jobs ?? []) {
    const { data: apps } = await db
      .from("applications")
      .select("fit_score, job_stages(name), candidates(name)")
      .eq("job_id", job.id)
      .order("fit_score", { ascending: false })
      .limit(30);
    const rows = (apps ?? []) as unknown as Array<{ fit_score: number | null; job_stages: { name: string } | null; candidates: { name: string } | null }>;
    const byStage: Record<string, number> = {};
    for (const a of rows) {
      const s = a.job_stages?.name ?? "Sin etapa";
      byStage[s] = (byStage[s] ?? 0) + 1;
    }
    out.push({
      job: job.title,
      job_url: `/jobs/${job.id}`,
      total: rows.length,
      by_stage: byStage,
      top_candidates: rows.slice(0, 3).map((a) => ({ name: a.candidates?.name, fit: a.fit_score })),
    });
  }
  return { jobs: out };
}

async function getPayrollStatus(companyId: string, args: { period?: string }) {
  const db = createAdminClient();
  let q = db
    .from("pay_runs")
    .select("id, period_label, period_month, status, gross, employee_count, entity_name")
    .eq("company_id", companyId)
    .order("period_month", { ascending: false })
    .limit(6);
  if (args.period) q = q.eq("period_month", args.period);
  const { data: runs } = await q;
  const { data: noProfile } = await db
    .from("employees")
    .select("id, name")
    .eq("company_id", companyId)
    .eq("status", "active");
  const { data: withProfile } = await db
    .from("pay_profiles")
    .select("employee_id")
    .eq("company_id", companyId)
    .is("effective_to", null);
  const covered = new Set((withProfile ?? []).map((p) => p.employee_id));
  return {
    runs: (runs ?? []).map((r) => ({ ...r, url: `/payroll/runs/${r.id}` })),
    active_without_profile: (noProfile ?? []).filter((e) => !covered.has(e.id)).map((e) => e.name),
  };
}

// ── Definiciones + RBAC ──────────────────────────────────────────────────────

const def = (name: string, description: string, properties: Record<string, unknown> = {}, required: string[] = []) => ({
  type: "function" as const,
  function: { name, description, parameters: { type: "object", properties, required } },
});

/** Monta las tools disponibles para el rol. Lo que el rol no puede ver, no existe. */
export function buildAssistantTools(companyId: string, role: AssistantRole): AgentTool[] {
  const canPayroll = role === "owner" || role === "hr_admin";

  const tools: AgentTool[] = [
    {
      definition: def("get_headcount", "Plantilla actual: empleados activos, totales y por departamento."),
      execute: () => getHeadcount(companyId),
    },
    {
      definition: def(
        "search_employees",
        "Busca empleados por nombre, departamento o estado. Devuelve ficha básica y URL.",
        { name: { type: "string" }, department: { type: "string" }, status: { type: "string", description: "active|inactive" } },
      ),
      execute: (a) => searchEmployees(companyId, a as { name?: string }),
    },
    {
      definition: def(
        "get_employee",
        "Ficha de UN empleado por nombre: perfil, ausencias próximas y compensación (si tu rol lo permite).",
        { name: { type: "string", description: "Nombre o parte del nombre" } },
        ["name"],
      ),
      execute: (a) => getEmployee(companyId, a as { name: string }, canPayroll),
    },
    {
      definition: def(
        "get_absence_overlaps",
        "Ausencias (aprobadas y pendientes) que caen en un rango de fechas, opcionalmente por departamento. Para detectar solapamientos de cobertura.",
        { from: { type: "string", description: "YYYY-MM-DD" }, to: { type: "string" }, department: { type: "string" } },
      ),
      execute: (a) => getAbsenceOverlaps(companyId, a as Record<string, string>),
    },
    {
      definition: def(
        "get_recruiting_stats",
        "Candidaturas (inscritos) de un mes: total, por origen/canal y por oferta. Para '¿cuántos inscritos este mes?'.",
        { period_month: { type: "string", description: "YYYY-MM; por defecto el mes actual" } },
      ),
      execute: (a) => getRecruitingStats(companyId, a as { period_month?: string }),
    },
    {
      definition: def(
        "get_pipeline_snapshot",
        "Estado del pipeline de reclutamiento: candidatos por etapa y top por fit, por oferta activa.",
        { job_title: { type: "string", description: "Filtra por título de oferta" } },
      ),
      execute: (a) => getPipelineSnapshot(companyId, a as { job_title?: string }),
    },
    {
      definition: def(
        "get_channel_performance",
        "Rendimiento de los canales de captación (candidaturas, CPA, campañas estancadas) del último período.",
        { period: { type: "string", description: "7d|30d|90d" } },
      ),
      execute: (a) => queryChannelData(companyId, { period: ((a as { period?: string }).period ?? "30d") as "30d" }),
    },
  ];

  if (canPayroll) {
    tools.push({
      definition: def(
        "get_payroll_status",
        "Estado de las corridas de nómina (últimas 6 o un período concreto) y empleados activos sin perfil salarial.",
        { period: { type: "string", description: "YYYY-MM" } },
      ),
      execute: (a) => getPayrollStatus(companyId, a as { period?: string }),
    });
  }

  return tools;
}
