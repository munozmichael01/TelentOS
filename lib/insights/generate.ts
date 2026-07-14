/**
 * Motor de insights del plano proactivo — generador compartido.
 *
 * Una única función `generateInsightsForCompany(db, companyId)` que:
 *  1. calcula las señales de forma DETERMINISTA (scope + entidades + acción),
 *  2. deja que el LLM SOLO redacte el texto (vía `runAgent` → presupuesto + auditoría),
 *  3. persiste en `agent_insights` (cierra los abiertos, inserta los nuevos).
 *
 * La usan dos disparadores: el refresh manual (endpoint, con sesión) y el cron
 * (todas las empresas, sin sesión). Por eso recibe un admin client ya resuelto y
 * un `companyId` explícito — NUNCA `.limit(1)` — y todas las lecturas van
 * scopeadas por empresa (applications no tiene company_id: se filtra vía `jobs!inner`).
 */
import { z } from "zod";
import { runAgent } from "@/agents/core";
import type { createAdminClient } from "@/lib/supabase/server";

type AdminDb = ReturnType<typeof createAdminClient>;

// ── Helpers de humanización ─────────────────────────────────────────────────
const SOURCE_LABELS: Record<string, string> = {
  career_site: "Career Site", infojobs: "Infojobs", linkedin: "LinkedIn",
  indeed: "Indeed", glassdoor: "Glassdoor", directo: "Directo",
};
function humanizeSrc(s: string) {
  const key = s.toLowerCase().replace(/[-\s]/g, "_");
  return SOURCE_LABELS[key] ?? (s.charAt(0).toUpperCase() + s.slice(1).toLowerCase());
}
function srcSlug(s: string) { return s.toLowerCase().replace(/[\s-]/g, "_"); }

const VIOLATION_LABELS: Record<string, string> = {
  max_hours_exceeded: "Exceso de horas",
  early_start: "Fichaje tardío",
  missing_break: "Sin descanso",
  insufficient_break: "Descanso insuficiente",
};

// Frases prohibidas en el texto del insight (§2.4.1): la recomendación la
// comunica el botón, no la prosa.
const PROHIBITED = /se recomienda|es crucial|es importante|sería beneficioso|para optimizar|considera |debería |podría /i;

// ── Prompt del redactor ─────────────────────────────────────────────────────
// El LLM SOLO redacta: scope, entidades y acción ya están fijados por el código.
// runAgent fuerza response_format json_object → el contrato es un OBJETO { items: [...] }.
const SYSTEM_PROMPT = `Eres el redactor de un sistema ATS. Para cada señal del array de entrada escribe UNA SOLA FRASE de máx 140 caracteres.

REGLAS ABSOLUTAS:
1. Incluye siempre: entidad nombrada (persona/oferta/canal) + dato numérico + contexto.
2. Prohibido: "se recomienda", "es crucial", "sería beneficioso", "para optimizar", "considera", "debería", "podría", "es importante". La recomendación la comunica el botón, no el texto.
3. Humaniza slugs: career_site→"Career Site", infojobs→"Infojobs", linkedin→"LinkedIn".
4. Sin markdown. Sin asteriscos. Sin guiones al inicio.
5. Máx 140 caracteres — cuenta antes de responder.
6. Abrevia apellidos a inicial cuando hay varios nombres (Elena V., Rubén O.).

Responde SOLO con JSON, un objeto con la clave "items": un array del MISMO orden y MISMA longitud que la entrada:
{ "items": [ { "text": "..." }, ... ] }`;

const EnhancedSchema = z.object({ items: z.array(z.object({ text: z.string() })) });

// ── Tipos ────────────────────────────────────────────────────────────────────
type Insight = {
  text: string;
  scope: string;
  entities: { id: string; label: string }[];
  action: { label: string; href: string };
  signal: Record<string, unknown>; // solo entrada del LLM; no se persiste
};

export type GenerateResult = { generated: number; insights: { text: string; scope: string }[] };

/**
 * Genera y persiste los insights de UNA empresa. Nunca lanza por fallo del LLM
 * (degrada al texto determinista); sí puede lanzar si la persistencia falla, para
 * que el disparador lo reporte. `companyId` es obligatorio y explícito.
 */
export async function generateInsightsForCompany(db: AdminDb, companyId: string): Promise<GenerateResult> {
  const today = new Date().toISOString().slice(0, 10);
  const nowMs = Date.now();

  // ── 1. Recolectar datos de señal (capa determinista) ──────────────────────
  // applications no tiene company_id → se scopea vía jobs!inner + jobs.company_id.
  const [stagedApps, channelData, complianceViolations, onboardingOverdue] = await Promise.all([
    db
      .from("applications")
      .select("id, fit_score, stage_id, candidates(id, name), jobs!inner(title, id, company_id), job_stages(name), application_events(created_at)")
      .eq("jobs.company_id", companyId)
      .eq("status", "open")
      .not("stage_id", "is", null)
      .limit(80),

    db
      .from("applications")
      .select("source, utm, job_id, fit_score, jobs!inner(title, id, company_id)")
      .eq("jobs.company_id", companyId)
      .not("source", "is", null)
      .limit(200),

    db
      .from("compliance_violations")
      .select("id, employee_id, violation_type, employees!employee_id(name)")
      .eq("company_id", companyId)
      .is("acknowledged_at", null)
      .limit(20),

    db
      .from("onboarding_tasks")
      .select("id, employee_id, title, due_date, employees!inner(name, company_id)")
      .eq("employees.company_id", companyId)
      .neq("status", "done")
      .lt("due_date", today)
      .order("due_date", { ascending: true })
      .limit(10),
  ]);

  // ── 2. Candidatos estancados (agrupados por oferta) ───────────────────────
  type StalledEntry = { candidateId: string; appId: string; name: string; job: string; jobId: string; days: number; stage: string };
  const stalled: StalledEntry[] = [];
  for (const app of stagedApps.data ?? []) {
    const events = (app.application_events as { created_at: string }[] | null) ?? [];
    if (!events.length) continue;
    const latestMs = Math.max(...events.map((e) => new Date(e.created_at).getTime()));
    const days = Math.floor((nowMs - latestMs) / 86_400_000);
    if (days < 5) continue;
    const candidate = app.candidates as unknown as { id: string; name: string } | null;
    const job = app.jobs as unknown as { title: string; id: string } | null;
    const stage = app.job_stages as unknown as { name: string } | null;
    if (!candidate || !job) continue;
    stalled.push({ candidateId: candidate.id, appId: app.id, name: candidate.name, job: job.title, jobId: job.id, days, stage: stage?.name ?? "pipeline" });
  }

  // ── 3. Ranking de canales ─────────────────────────────────────────────────
  type SrcStats = { count: number; fitSum: number; fitCount: number; jobs: Map<string, string> };
  const bySource: Record<string, SrcStats> = {};
  for (const app of channelData.data ?? []) {
    const utm = app.utm as Record<string, string> | null;
    const rawSrc = utm?.utm_source || (app.source as string) || "directo";
    const slug = srcSlug(rawSrc);
    if (!bySource[slug]) bySource[slug] = { count: 0, fitSum: 0, fitCount: 0, jobs: new Map() };
    bySource[slug].count++;
    if (app.fit_score != null) { bySource[slug].fitSum += app.fit_score; bySource[slug].fitCount++; }
    const job = app.jobs as unknown as { title: string; id: string } | null;
    if (job) bySource[slug].jobs.set(job.id, job.title);
  }
  const channelRanking = Object.entries(bySource)
    .map(([slug, s]) => ({ slug, label: humanizeSrc(slug), count: s.count, avgFit: s.fitCount > 0 ? Math.round(s.fitSum / s.fitCount) : null, jobs: Array.from(s.jobs.values()) }))
    .sort((a, b) => b.count - a.count);

  // ── 4. Construir insights estructurados (scope + entidades + acción) ──────
  const insights: Insight[] = [];

  // Señal A: candidatos estancados — agrupar por oferta, top oferta
  if (stalled.length > 0) {
    const byJob: Record<string, StalledEntry[]> = {};
    for (const s of stalled) { (byJob[s.job] ??= []).push(s); }
    const [jobTitle, entries] = Object.entries(byJob).sort((a, b) => b[1].length - a[1].length)[0];
    const top = entries.slice(0, 3);
    const avgDays = Math.round(entries.reduce((s, e) => s + e.days, 0) / entries.length);
    const abbrevNames = top.map(e => { const p = e.name.split(" "); return `${p[0]} ${p[1]?.[0] ?? ""}.`.trim(); });

    const fallbackText = entries.length === 1
      ? `${entries[0].name} lleva ${entries[0].days} días parado en ${entries[0].stage} · ${jobTitle}.`
      : `${abbrevNames.join(", ")} llevan ${avgDays} días parados en ${entries[0].stage} · ${jobTitle}.`;

    insights.push({
      text: fallbackText,
      scope: jobTitle,
      entities: top.map(e => ({ id: e.candidateId, label: e.name })),
      action: entries.length === 1
        ? { label: `Ver a ${entries[0].name.split(" ")[0]}`, href: `/applications/${entries[0].appId}` }
        : { label: `Ver ${jobTitle}`, href: `/jobs/${entries[0].jobId}` },
      signal: { signal: "stalled", job: jobTitle, stage: entries[0].stage, candidates: top.map(e => ({ name: e.name, days: e.days })), total: entries.length },
    });
  }

  // Señal B: rendimiento de canales
  if (channelRanking.length >= 2) {
    const top = channelRanking[0];
    const second = channelRanking[1];
    const allJobs = top.jobs.concat(second.jobs);
    const uniqueJobs = allJobs.filter((j, i) => allJobs.indexOf(j) === i);
    const jobScope = uniqueJobs.slice(0, 2).join(", ") || "tus ofertas";

    if (top.avgFit != null && second.avgFit != null && Math.abs(top.avgFit - second.avgFit) >= 5) {
      const better = top.avgFit >= second.avgFit ? top : second;
      const worse = top.avgFit >= second.avgFit ? second : top;
      insights.push({
        text: `En ${jobScope}, ${better.label} trae fit ${better.avgFit} vs ${worse.avgFit} de ${worse.label} (${better.count} vs ${worse.count}).`,
        scope: jobScope,
        entities: [{ id: better.slug, label: better.label }, { id: worse.slug, label: worse.label }],
        action: { label: `Ver ${better.label}`, href: `/canales?source=${better.slug}` },
        signal: { signal: "channel_compare", jobs: jobScope, better: { name: better.label, fit: better.avgFit, count: better.count }, worse: { name: worse.label, fit: worse.avgFit, count: worse.count } },
      });
    } else {
      insights.push({
        text: `${top.label} lidera en ${jobScope} con ${top.count} candidatura${top.count > 1 ? "s" : ""}${top.avgFit != null ? ` (fit ${top.avgFit})` : ""}.`,
        scope: jobScope,
        entities: [{ id: top.slug, label: top.label }],
        action: { label: `Ver ${top.label}`, href: `/canales?source=${top.slug}` },
        signal: { signal: "channel_top", jobs: jobScope, source: { name: top.label, count: top.count, fit: top.avgFit } },
      });
    }
  } else if (channelRanking.length === 1 && channelRanking[0].count >= 2) {
    const top = channelRanking[0];
    const jobScope = top.jobs.slice(0, 2).join(", ") || "tus ofertas";
    insights.push({
      text: `${top.label} es el único canal activo en ${jobScope} con ${top.count} candidaturas${top.avgFit != null ? ` (fit ${top.avgFit})` : ""}.`,
      scope: jobScope,
      entities: [{ id: top.slug, label: top.label }],
      action: { label: `Ver ${top.label}`, href: `/canales?source=${top.slug}` },
      signal: { signal: "channel_single", jobs: jobScope, source: { name: top.label, count: top.count, fit: top.avgFit } },
    });
  }

  // Señal C: infracciones de compliance — agrupar por tipo, el más frecuente
  if ((complianceViolations.data?.length ?? 0) >= 1) {
    const byType: Record<string, { employees: { id: string; name: string }[] }> = {};
    for (const v of complianceViolations.data ?? []) {
      const name = (v.employees as unknown as { name: string } | null)?.name ?? "—";
      (byType[v.violation_type] ??= { employees: [] }).employees.push({ id: v.employee_id, name });
    }
    const [topType, { employees }] = Object.entries(byType).sort((a, b) => b[1].employees.length - a[1].employees.length)[0];
    const typeLabel = VIOLATION_LABELS[topType] ?? topType;
    const topEmp = employees.slice(0, 3);
    const abbrevNames = topEmp.map(e => { const p = e.name.split(" "); return `${p[0]} ${p[1]?.[0] ?? ""}.`.trim(); });
    const total = complianceViolations.data!.length;

    insights.push({
      text: `${abbrevNames.join(", ")} — ${total} infracción${total > 1 ? "es" : ""} de "${typeLabel}" sin reconocer.`,
      scope: typeLabel,
      entities: topEmp.map(e => ({ id: e.id, label: e.name })),
      action: { label: "Ver compliance", href: "/settings/compliance" },
      signal: { signal: "compliance", violation_type: typeLabel, employees: topEmp.map(e => e.name), count: total },
    });
  }

  // Señal D: onboarding vencido — agrupar por empleado, el más vencido
  if ((onboardingOverdue.data?.length ?? 0) >= 1) {
    const byEmp: Record<string, { name: string; count: number; oldestDue: string }> = {};
    for (const t of onboardingOverdue.data ?? []) {
      const name = (t.employees as unknown as { name: string } | null)?.name ?? "—";
      if (!byEmp[t.employee_id]) byEmp[t.employee_id] = { name, count: 0, oldestDue: t.due_date };
      byEmp[t.employee_id].count++;
      if (t.due_date < byEmp[t.employee_id].oldestDue) byEmp[t.employee_id].oldestDue = t.due_date;
    }
    const [empId, empData] = Object.entries(byEmp).sort((a, b) => b[1].count - a[1].count)[0];
    const dueLabel = new Date(empData.oldestDue + "T12:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" });
    const firstName = empData.name.split(" ")[0];

    insights.push({
      text: empData.count === 1
        ? `${empData.name} tiene 1 tarea de onboarding vencida desde el ${dueLabel}.`
        : `${empData.name} acumula ${empData.count} tareas de onboarding vencidas desde el ${dueLabel}.`,
      scope: "Onboarding",
      entities: [{ id: empId, label: empData.name }],
      action: { label: `Ver a ${firstName}`, href: `/employees/${empId}` },
      signal: { signal: "onboarding", employees: Object.entries(byEmp).slice(0, 3).map(([, e]) => ({ name: e.name, tasks: e.count, oldest_due: e.oldestDue })) },
    });
  }

  // Fallback: cuando ninguna señal específica dispara
  if (insights.length === 0) {
    const totalApps = channelData.data?.length ?? 0;
    insights.push({
      text: totalApps > 0
        ? `Pipeline con ${totalApps} candidatura${totalApps > 1 ? "s" : ""} activas. Sin alertas en este momento.`
        : "Sin candidaturas activas. Publica una oferta para empezar a captar datos.",
      scope: "General",
      entities: [],
      action: { label: "Ver ofertas", href: "/jobs" },
      signal: { signal: "fallback", total_apps: totalApps },
    });
  }

  // ── 5. Redacción por LLM (solo redacta; nunca calcula) ────────────────────
  // Vía runAgent → hereda presupuesto por empresa + auditoría en agent_runs.
  // Solo se envían señales reales (no el fallback): las empresas sin señal no gastan.
  const nonFallback = insights.filter(i => i.scope !== "General");
  if (nonFallback.length > 0) {
    const res = await runAgent<{ items: { text: string }[] }>({
      agent: "dashboard-insights",
      model: "gpt-4o-mini",
      maxTokens: 400,
      system: SYSTEM_PROMPT,
      user: JSON.stringify(nonFallback.map(i => i.signal)),
      tools: [],
      input: { companyId },
      validate: (v) => {
        const parsed = EnhancedSchema.parse(v);
        if (parsed.items.length !== nonFallback.length) {
          throw new Error(`items debe tener ${nonFallback.length} elementos, tiene ${parsed.items.length}`);
        }
        return parsed;
      },
      // Fallback: conserva el texto determinista ya calculado.
      fallback: () => ({ items: nonFallback.map(i => ({ text: i.text })) }),
    });

    let j = 0;
    for (const ins of insights) {
      if (ins.scope === "General") continue;
      const candidate = res.output.items[j++]?.text?.trim() ?? "";
      // Solo aplica si: no vacío, dentro de longitud, y sin frases prohibidas.
      if (candidate && candidate.length <= 160 && !PROHIBITED.test(candidate)) {
        ins.text = candidate;
      }
    }
  }

  // ── 6. Validar antes de insertar (§2.4.1: rechazar sin scope o sin entidades) ─
  const valid = insights.filter(ins => {
    if (ins.scope === "General") return true; // el fallback siempre pasa
    return ins.scope.trim().length > 0 && ins.entities.length > 0;
  }).slice(0, 5);

  // ── 7. Persistir (admin client: cierra abiertos, inserta nuevos) ──────────
  const { error: closeErr } = await db
    .from("agent_insights")
    .update({ status: "ignored" })
    .eq("company_id", companyId)
    .eq("status", "open");
  if (closeErr) throw new Error(`Cerrar insights anteriores: ${closeErr.message} — ¿existe agent_insights en Supabase?`);

  if (valid.length > 0) {
    const { error: insertErr } = await db.from("agent_insights").insert(
      valid.map(ins => ({
        company_id: companyId,
        text: ins.text,
        scope: ins.scope,
        entities: ins.entities,
        action: ins.action,
        status: "open",
        generated_at: new Date().toISOString(),
      }))
    );
    if (insertErr) throw new Error(`Guardar insights: ${insertErr.message}`);
  }

  return { generated: valid.length, insights: valid.map(i => ({ text: i.text, scope: i.scope })) };
}
