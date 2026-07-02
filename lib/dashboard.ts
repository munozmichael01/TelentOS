import { createClient } from "@/lib/supabase/server";
import { initials } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

export type InboxType = "compliance" | "ausencia" | "candidato" | "onboarding" | "ausente";

export type InboxAction = {
  label: string;
  kind: "primary" | "secondary";
  href?: string;
  /** REST path to call on click (POST unless method specified) */
  apiPath?: string;
  method?: string;
};

export type InboxItem = {
  id: string;
  type: InboxType;
  priority: number;
  entityId: string;
  title: string;
  subtitle: string;
  avatar: { initials: string; bg: string; color: string };
  actions: InboxAction[];
};

export type PulseMetric = {
  key: string;
  label: string;
  value: number | string;
  delta?: string;
  deltaPositive?: boolean;
};

export type AgentInsight = {
  id: string;
  text: string;
  scope: string;
  entities: { id: string; label: string }[];
  action: { label: string; href: string };
  status: "open" | "done" | "ignored";
  generated_at: string;
};

export type ActivityItem = {
  id: string;
  label: string;
  time: string;
  href: string;
  dot: string;
};

export type DashboardData = {
  pulse: PulseMetric[];
  inbox: InboxItem[];
  agentInsights: AgentInsight[];
  activity: ActivityItem[];
  lastInsightAt: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_PALETTES = [
  { bg: "#DCEFE4", color: "#0E5C4A" },
  { bg: "#F6D9D2", color: "#BD4332" },
  { bg: "#E7E0F2", color: "#5A4C86" },
  { bg: "#F8E7C4", color: "#946312" },
  { bg: "#D6E4F2", color: "#2B5E8A" },
];

function avatarFor(name: string) {
  const code = name.charCodeAt(0) + (name.charCodeAt(1) || 0);
  return AVATAR_PALETTES[code % AVATAR_PALETTES.length];
}

const VIOLATION_LABELS: Record<string, string> = {
  max_hours_exceeded: "Exceso de horas",
  early_start: "Fichaje tardío",
  missing_break: "Sin descanso",
  insufficient_break: "Descanso insuficiente",
};

function empty(): DashboardData {
  return { pulse: [], inbox: [], agentInsights: [], activity: [], lastInsightAt: null };
}

// ─── Main aggregator ──────────────────────────────────────────────────────────

export async function getDashboardData(_userId: string): Promise<DashboardData> {
  const supabase = createClient();

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (!company) return empty();

  const today = new Date().toISOString().slice(0, 10);

  const [
    absencePending,
    complianceUnack,
    onboardingOverdue,
    absentToday,
    stagedApps,
    activeJobs,
    activeEmployees,
    openApplications,
    insights,
    recentActivity,
  ] = await Promise.all([
    // Ausencias pendientes
    supabase
      .from("absence_requests")
      .select("id, employee_id, start_date, end_date, employees!employee_id(name), absence_types(name)")
      .eq("company_id", company.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(10),

    // Infracciones sin reconocer
    supabase
      .from("compliance_violations")
      .select("id, employee_id, violation_type, description, employees(name)")
      .eq("company_id", company.id)
      .is("acknowledged_at", null)
      .order("date", { ascending: false })
      .limit(10),

    // Onboarding vencido (scoped via inner join on employees)
    supabase
      .from("onboarding_tasks")
      .select("id, employee_id, title, due_date, employees!inner(name, company_id)")
      .eq("employees.company_id", company.id)
      .neq("status", "done")
      .lt("due_date", today)
      .order("due_date", { ascending: true })
      .limit(10),

    // Ausentes hoy
    supabase
      .from("absence_requests")
      .select("id, employee_id, employees!employee_id(name), absence_types(name)")
      .eq("company_id", company.id)
      .eq("status", "approved")
      .lte("start_date", today)
      .gte("end_date", today)
      .limit(10),

    // Candidaturas abiertas con historial de eventos para detectar estancados
    supabase
      .from("applications")
      .select("id, fit_score, stage_id, candidates(name), jobs(title), job_stages(name), application_events(created_at)")
      .eq("status", "open")
      .not("stage_id", "is", null)
      .limit(80),

    // Métricas de pulso
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("employees").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("applications").select("id", { count: "exact", head: true }).eq("status", "open"),

    // Insights del agente
    supabase
      .from("agent_insights")
      .select("*")
      .eq("company_id", company.id)
      .order("generated_at", { ascending: false })
      .limit(10),

    // Actividad reciente (últimas candidaturas)
    supabase
      .from("applications")
      .select("id, fit_score, created_at, source, candidates(name), jobs(title)")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  // ── Candidatos estancados (>5 días sin evento en etapa activa) ────────────
  const STALL_DAYS = 5;
  const nowMs = Date.now();
  const stalledItems: InboxItem[] = [];

  for (const app of stagedApps.data ?? []) {
    const events = (app.application_events as { created_at: string }[] | null) ?? [];
    if (events.length === 0) continue;
    const latestMs = Math.max(...events.map((e) => new Date(e.created_at).getTime()));
    const daysStalled = Math.floor((nowMs - latestMs) / 86_400_000);
    if (daysStalled < STALL_DAYS) continue;

    const candidate = app.candidates as unknown as { name: string } | null;
    const job = app.jobs as unknown as { title: string } | null;
    const stage = app.job_stages as unknown as { name: string } | null;
    if (!candidate || !job) continue;

    const pal = avatarFor(candidate.name);
    stalledItems.push({
      id: `candidato-${app.id}`,
      type: "candidato",
      priority: 70,
      entityId: app.id,
      title: `${candidate.name} · ${job.title}`,
      subtitle: `Fit ${app.fit_score ?? "—"} · ${daysStalled} días en ${stage?.name ?? "etapa"} sin movimiento`,
      avatar: { initials: initials(candidate.name), bg: pal.bg, color: pal.color },
      actions: [{ label: "Ver candidatura", kind: "primary", href: `/applications/${app.id}` }],
    });
  }

  // ── Inbox items ──────────────────────────────────────────────────────────
  const inbox: InboxItem[] = [
    // Compliance (priority 90)
    ...(complianceUnack.data ?? []).map((v) => {
      const name = (v.employees as unknown as { name: string } | null)?.name ?? "—";
      return {
        id: `compliance-${v.id}`,
        type: "compliance" as const,
        priority: 90,
        entityId: v.id,
        title: `${name} · ${VIOLATION_LABELS[v.violation_type] ?? v.violation_type}`,
        subtitle: v.description ?? "",
        avatar: { initials: initials(name), bg: "#F6D9D2", color: "#BD4332" },
        actions: [{ label: "Revisar", kind: "primary" as const, href: "/settings/compliance" }],
      };
    }),

    // Ausencias pendientes (priority 80)
    ...(absencePending.data ?? []).map((r) => {
      const name = (r.employees as unknown as { name: string } | null)?.name ?? "—";
      const typeName = (r.absence_types as unknown as { name: string } | null)?.name ?? "Ausencia";
      const pal = avatarFor(name);
      return {
        id: `ausencia-${r.id}`,
        type: "ausencia" as const,
        priority: 80,
        entityId: r.id,
        title: `${name} · ${typeName}`,
        subtitle: `Del ${r.start_date} al ${r.end_date}`,
        avatar: { initials: initials(name), bg: pal.bg, color: pal.color },
        actions: [
          { label: "Aprobar", kind: "primary" as const, apiPath: `/api/absence-requests/${r.id}/approve`, method: "POST" },
          { label: "Rechazar", kind: "secondary" as const, apiPath: `/api/absence-requests/${r.id}/reject`, method: "POST" },
        ],
      };
    }),

    // Candidatos estancados (priority 70)
    ...stalledItems,

    // Onboarding vencido (priority 60)
    ...(onboardingOverdue.data ?? []).map((t) => {
      const emp = t.employees as unknown as { name: string; company_id: string } | null;
      const name = emp?.name ?? "—";
      return {
        id: `onboarding-${t.id}`,
        type: "onboarding" as const,
        priority: 60,
        entityId: t.id,
        title: `${name} · ${t.title}`,
        subtitle: `Fecha límite: ${t.due_date}`,
        avatar: { initials: initials(name), bg: "#F8E7C4", color: "#946312" },
        actions: [{ label: "Ver tareas", kind: "primary" as const, href: `/employees/${t.employee_id}` }],
      };
    }),

    // Ausentes hoy (priority 50)
    ...(absentToday.data ?? []).map((r) => {
      const name = (r.employees as unknown as { name: string } | null)?.name ?? "—";
      const typeName = (r.absence_types as unknown as { name: string } | null)?.name ?? "Ausencia";
      return {
        id: `ausente-${r.id}`,
        type: "ausente" as const,
        priority: 50,
        entityId: r.id,
        title: `${name} · ${typeName}`,
        subtitle: "Ausente hoy",
        avatar: { initials: initials(name), bg: "#D6E4F2", color: "#2B5E8A" },
        actions: [{ label: "Ver empleado", kind: "primary" as const, href: `/employees/${r.employee_id}` }],
      };
    }),
  ].sort((a, b) => b.priority - a.priority);

  // ── Pulse metrics ────────────────────────────────────────────────────────
  const pulse: PulseMetric[] = [
    { key: "pipeline",   label: "Candidaturas abiertas", value: openApplications.count ?? 0 },
    { key: "ofertas",    label: "Ofertas activas",        value: activeJobs.count ?? 0 },
    { key: "empleados",  label: "Empleados activos",      value: activeEmployees.count ?? 0 },
    { key: "ausentes",   label: "Ausentes hoy",           value: absentToday.data?.length ?? 0 },
    { key: "pendientes", label: "Ausencias pendientes",   value: absencePending.data?.length ?? 0 },
    { key: "compliance", label: "Infracciones abiertas",  value: complianceUnack.data?.length ?? 0 },
  ];

  // ── Agent insights ───────────────────────────────────────────────────────
  const agentInsights: AgentInsight[] = (insights.data ?? []).map((i) => ({
    id: i.id,
    text: i.text,
    scope: i.scope,
    entities: (i.entities as { id: string; label: string }[]) ?? [],
    action: (i.action as { label: string; href: string }) ?? { label: "Ver", href: "/" },
    status: i.status as "open" | "done" | "ignored",
    generated_at: i.generated_at,
  }));

  // ── Activity ─────────────────────────────────────────────────────────────
  const activity: ActivityItem[] = (recentActivity.data ?? []).map((a) => {
    const candidateName = (a.candidates as unknown as { name: string } | null)?.name ?? "—";
    const jobTitle = (a.jobs as unknown as { title: string } | null)?.title;
    return {
      id: a.id,
      label: jobTitle ? `${candidateName} · ${jobTitle}` : `${candidateName} · nueva candidatura`,
      time: a.created_at,
      href: `/applications/${a.id}`,
      dot: "#0E5C4A",
    };
  });

  return {
    pulse,
    inbox,
    agentInsights,
    activity,
    lastInsightAt: insights.data?.[0]?.generated_at ?? null,
  };
}
