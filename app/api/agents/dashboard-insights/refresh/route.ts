import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// Phrases prohibited in insight text per §2.4.1
const PROHIBITED = /se recomienda|es crucial|es importante|sería beneficioso|para optimizar|considera |debería |podría /i;

// ── System prompt ─────────────────────────────────────────────────────────────
// Per §2.4.1: LLM only redacts text; scope, entities and action are already set.

const SYSTEM_PROMPT = `Eres el redactor de un sistema ATS. Para cada señal en el JSON de entrada escribe UNA SOLA FRASE de máx 140 caracteres.

REGLAS ABSOLUTAS:
1. Incluye siempre: entidad nombrada (persona/oferta/canal) + dato numérico + contexto.
2. Prohibido: "se recomienda", "es crucial", "sería beneficioso", "para optimizar", "considera", "debería", "podría", "es importante". La recomendación la comunica el botón, no el texto.
3. Humaniza slugs: career_site→"Career Site", infojobs→"Infojobs", linkedin→"LinkedIn".
4. Sin markdown. Sin asteriscos. Sin guiones al inicio.
5. Máx 140 caracteres — cuenta antes de responder.
6. Abrevia apellidos a inicial cuando hay varios nombres (Elena V., Rubén O.).

Responde SOLO con JSON (mismo orden, misma longitud que la entrada): [{"text":"..."}, ...]`;

// ── Types ─────────────────────────────────────────────────────────────────────

type Insight = {
  text: string;
  scope: string;
  entities: { id: string; label: string }[];
  action: { label: string; href: string };
  // signal is only used for LLM input; not stored
  signal: Record<string, unknown>;
};

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST() {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const { data: company } = await supabase.from("companies").select("id").limit(1).maybeSingle();
  if (!company) return jsonError("Configura primero la empresa en Ajustes", 412);

  const today = new Date().toISOString().slice(0, 10);
  const nowMs = Date.now();

  // ── 1. Gather signal data (deterministic layer) ───────────────────────────
  const [stagedApps, channelData, complianceViolations, onboardingOverdue] = await Promise.all([
    supabase
      .from("applications")
      .select("id, fit_score, stage_id, candidates(id, name), jobs(title, id), job_stages(name), application_events(created_at)")
      .eq("status", "open")
      .not("stage_id", "is", null)
      .limit(80),

    supabase
      .from("applications")
      .select("source, utm, job_id, fit_score, jobs(title, id)")
      .not("source", "is", null)
      .limit(200),

    supabase
      .from("compliance_violations")
      .select("id, employee_id, violation_type, employees!employee_id(name)")
      .eq("company_id", company.id)
      .is("acknowledged_at", null)
      .limit(20),

    supabase
      .from("onboarding_tasks")
      .select("id, employee_id, title, due_date, employees!inner(name, company_id)")
      .eq("employees.company_id", company.id)
      .neq("status", "done")
      .lt("due_date", today)
      .order("due_date", { ascending: true })
      .limit(10),
  ]);

  // ── 2. Compute stalled candidates (grouped by job) ────────────────────────
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

  // ── 3. Compute channel ranking ────────────────────────────────────────────
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

  // ── 4. Build structured insights (scope + entities + action are set here) ─
  const insights: Insight[] = [];

  // Signal A: stalled candidates — group by job, pick top job
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

  // Signal B: channel performance
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

  // Signal C: compliance violations — group by type, pick most frequent
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

  // Signal D: overdue onboarding — group by employee, pick most overdue
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

  // Fallback: when no specific signals fire
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

  // ── 5. LLM text enhancement (only redacts, does not calculate) ────────────
  // Only send non-fallback signals; LLM receives structured data, returns text only.
  const nonFallback = insights.filter(i => i.scope !== "General");
  if (process.env.OPENAI_API_KEY && nonFallback.length > 0) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 400,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(nonFallback.map(i => i.signal)) },
        ],
      });
      const raw = completion.choices[0]?.message?.content ?? "";
      const enhanced = JSON.parse(raw.replace(/```json\n?|\n?```/g, "").trim()) as { text: string }[];
      if (Array.isArray(enhanced) && enhanced.length === nonFallback.length) {
        let j = 0;
        for (const ins of insights) {
          if (ins.scope === "General") continue;
          const candidate = enhanced[j++]?.text?.trim() ?? "";
          // Only apply if: non-empty, within length, and no prohibited phrases
          if (candidate && candidate.length <= 160 && !PROHIBITED.test(candidate)) {
            ins.text = candidate;
          }
        }
      }
    } catch {
      // Fall through to deterministic text
    }
  }

  // ── 6. Validate before insert (§2.4.1: reject without scope or entities) ──
  const valid = insights.filter(ins => {
    if (ins.scope === "General") return true; // fallback always passes
    return ins.scope.trim().length > 0 && ins.entities.length > 0;
  }).slice(0, 5);

  // ── 7. Persist ────────────────────────────────────────────────────────────
  const supabaseSvc = createClient();

  const { error: closeErr } = await supabaseSvc
    .from("agent_insights")
    .update({ status: "ignored" })
    .eq("company_id", company.id)
    .eq("status", "open");

  if (closeErr) {
    console.error("[dashboard-insights/refresh] close error:", closeErr.message);
    return jsonError(`Error al limpiar insights anteriores: ${closeErr.message} — ¿La tabla agent_insights existe en Supabase?`, 500);
  }

  if (valid.length > 0) {
    const { error: insertErr } = await supabaseSvc.from("agent_insights").insert(
      valid.map(ins => ({
        company_id: company.id,
        text: ins.text,
        scope: ins.scope,
        entities: ins.entities,
        action: ins.action,
        status: "open",
        generated_at: new Date().toISOString(),
      }))
    );
    if (insertErr) {
      console.error("[dashboard-insights/refresh] insert error:", insertErr.message);
      return jsonError(`Error al guardar insights: ${insertErr.message}`, 500);
    }
  }

  return NextResponse.json({ generated: valid.length, insights: valid.map(i => ({ text: i.text, scope: i.scope })), status: "ok" });
}
