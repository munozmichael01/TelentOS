import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";

// Reuses existing signal queries (same as getDashboardData) to synthesize
// 3-5 named insights. Stored in agent_insights; the dashboard only reads.

export async function POST() {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (!company) return jsonError("Configura primero la empresa en Ajustes", 412);

  const today = new Date().toISOString().slice(0, 10);
  const nowMs = Date.now();

  // ── Gather outlier context ───────────────────────────────────────────────
  const [stagedApps, channelData, complianceViolations, onboardingOverdue] = await Promise.all([
    supabase
      .from("applications")
      .select("id, fit_score, stage_id, candidates(name), jobs(title, id), job_stages(name), application_events(created_at)")
      .eq("status", "open")
      .not("stage_id", "is", null)
      .limit(80),

    supabase
      .from("applications")
      .select("source, utm, job_id, fit_score, jobs(title)")
      .not("source", "is", null)
      .limit(200),

    supabase
      .from("compliance_violations")
      .select("employee_id, violation_type, employees(name)")
      .eq("company_id", company.id)
      .is("acknowledged_at", null)
      .limit(20),

    supabase
      .from("onboarding_tasks")
      .select("employee_id, title, due_date, employees!inner(name, company_id)")
      .eq("employees.company_id", company.id)
      .neq("status", "done")
      .lt("due_date", today)
      .limit(10),
  ]);

  // ── Find stalled candidates ──────────────────────────────────────────────
  type StalledEntry = { name: string; job: string; jobId: string; days: number; fit: number | null };
  const stalled: StalledEntry[] = [];
  for (const app of stagedApps.data ?? []) {
    const events = (app.application_events as { created_at: string }[] | null) ?? [];
    if (!events.length) continue;
    const latestMs = Math.max(...events.map((e) => new Date(e.created_at).getTime()));
    const days = Math.floor((nowMs - latestMs) / 86_400_000);
    if (days < 5) continue;
    const candidate = app.candidates as unknown as { name: string } | null;
    const job = app.jobs as unknown as { title: string; id: string } | null;
    if (!candidate || !job) continue;
    stalled.push({ name: candidate.name, job: job.title, jobId: job.id, days, fit: app.fit_score });
  }

  // ── Channel performance by source ────────────────────────────────────────
  type SourceStats = { count: number; fitSum: number; fitCount: number; jobs: Set<string> };
  const bySource: Record<string, SourceStats> = {};
  for (const app of channelData.data ?? []) {
    const utm = app.utm as Record<string, string> | null;
    const src = utm?.utm_source || (app.source as string) || "directo";
    if (!bySource[src]) bySource[src] = { count: 0, fitSum: 0, fitCount: 0, jobs: new Set() };
    bySource[src].count++;
    if (app.fit_score != null) { bySource[src].fitSum += app.fit_score; bySource[src].fitCount++; }
    const job = app.jobs as unknown as { title: string } | null;
    if (job) bySource[src].jobs.add(job.title);
  }

  const channelRanking = Object.entries(bySource)
    .map(([src, s]) => ({
      src,
      count: s.count,
      avgFit: s.fitCount > 0 ? Math.round(s.fitSum / s.fitCount) : null,
      jobs: Array.from(s.jobs).slice(0, 3),
    }))
    .sort((a, b) => b.count - a.count);

  // ── Build insights (deterministic fallback; enhanced with LLM if available) ──
  const insights: { text: string; scope: string; entities: { id: string; label: string }[]; action: { label: string; href: string } }[] = [];

  // Insight 1: stalled candidates
  if (stalled.length > 0) {
    const byJob: Record<string, StalledEntry[]> = {};
    for (const s of stalled) {
      if (!byJob[s.job]) byJob[s.job] = [];
      byJob[s.job].push(s);
    }
    const topJob = Object.entries(byJob).sort((a, b) => b[1].length - a[1].length)[0];
    if (topJob) {
      const [jobTitle, entries] = topJob;
      const names = entries.slice(0, 3).map((e) => e.name.split(" ")[0]).join(", ");
      const avgDays = Math.round(entries.reduce((s, e) => s + e.days, 0) / entries.length);
      insights.push({
        text: `${entries.length} candidato${entries.length > 1 ? "s" : ""} en **${jobTitle}** ${entries.length > 1 ? "llevan" : "lleva"} +${avgDays} días sin movimiento en el pipeline: ${names}${entries.length > 3 ? ` y ${entries.length - 3} más` : ""}.`,
        scope: jobTitle,
        entities: entries.slice(0, 3).map((e) => ({ id: e.jobId, label: e.name })),
        action: { label: "Ver candidaturas", href: `/jobs/${entries[0].jobId}` },
      });
    }
  }

  // Insight 2: top channel vs. fit
  if (channelRanking.length >= 2) {
    const top = channelRanking[0];
    const second = channelRanking[1];
    if (top.avgFit && second.avgFit && Math.abs(top.avgFit - second.avgFit) >= 8) {
      const better = top.avgFit >= second.avgFit ? top : second;
      const worse = top.avgFit >= second.avgFit ? second : top;
      insights.push({
        text: `**${better.src}** convierte candidatos con fit medio ${better.avgFit} vs ${worse.avgFit} de **${worse.src}** (${better.count} vs ${worse.count} candidaturas). Considera redirigir presupuesto.`,
        scope: better.jobs.join(", ") || "General",
        entities: [],
        action: { label: "Ver canales", href: "/canales" },
      });
    } else if (top.count >= 3) {
      insights.push({
        text: `**${top.src}** es el canal con más candidaturas (${top.count})${top.avgFit ? ` y fit medio ${top.avgFit}` : ""}. Le sigue **${second.src}** con ${second.count}.`,
        scope: top.jobs.join(", ") || "General",
        entities: [],
        action: { label: "Ver canales", href: "/canales" },
      });
    }
  }

  // Insight 3: compliance violations cluster
  if ((complianceViolations.data?.length ?? 0) >= 3) {
    const byType: Record<string, string[]> = {};
    for (const v of complianceViolations.data ?? []) {
      if (!byType[v.violation_type]) byType[v.violation_type] = [];
      const name = (v.employees as unknown as { name: string } | null)?.name;
      if (name) byType[v.violation_type].push(name.split(" ")[0]);
    }
    const topType = Object.entries(byType).sort((a, b) => b[1].length - a[1].length)[0];
    if (topType) {
      const LABELS: Record<string, string> = { max_hours_exceeded: "exceso de horas", early_start: "fichaje tardío", missing_break: "sin descanso", insufficient_break: "descanso insuficiente" };
      const label = LABELS[topType[0]] ?? topType[0];
      insights.push({
        text: `${topType[1].length} infracción${topType[1].length > 1 ? "es" : ""} de **${label}** pendientes de revisión: ${topType[1].slice(0, 3).join(", ")}${topType[1].length > 3 ? "…" : ""}.`,
        scope: "Compliance",
        entities: [],
        action: { label: "Ver infracciones", href: "/settings/compliance" },
      });
    }
  }

  // Insight 4: overdue onboarding cluster
  if ((onboardingOverdue.data?.length ?? 0) >= 2) {
    const names = (onboardingOverdue.data ?? [])
      .slice(0, 3)
      .map((t) => (t.employees as unknown as { name: string } | null)?.name?.split(" ")[0] ?? "—")
      .join(", ");
    insights.push({
      text: `${onboardingOverdue.data!.length} tarea${onboardingOverdue.data!.length > 1 ? "s" : ""} de onboarding vencida${onboardingOverdue.data!.length > 1 ? "s" : ""}: ${names}${onboardingOverdue.data!.length > 3 ? "…" : ""}. Revisa el plan de incorporación.`,
      scope: "Onboarding",
      entities: [],
      action: { label: "Ver empleados", href: "/employees" },
    });
  }

  // ── Optional LLM enhancement (OpenAI if key available) ──────────────────
  if (process.env.OPENAI_API_KEY && insights.length > 0) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const context = insights.map((ins, i) => `${i + 1}. ${ins.text}`).join("\n");
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 512,
        messages: [{
          role: "user",
          content: `Tienes estos datos de señales de TalentOS:\n${context}\n\nMejora el texto de cada insight para que sea más accionable y específico (máx 2 frases por insight). Responde SOLO con JSON: [{"text": "..."}]`,
        }],
      });
      const raw = completion.choices[0]?.message?.content ?? "";
      const enhanced = JSON.parse(raw.replace(/```json\n?|\n?```/g, "").trim()) as { text: string }[];
      if (Array.isArray(enhanced) && enhanced.length === insights.length) {
        for (let i = 0; i < insights.length; i++) {
          if (enhanced[i]?.text) insights[i].text = enhanced[i].text;
        }
      }
    } catch {
      // silently fall through to deterministic text
    }
  }

  // ── Persist: mark old open insights as ignored, insert new ones ──────────
  const supabaseSvc = createClient();

  // Close previous open insights before inserting new ones
  await supabaseSvc
    .from("agent_insights")
    .update({ status: "ignored" })
    .eq("company_id", company.id)
    .eq("status", "open");

  if (insights.length > 0) {
    await supabaseSvc.from("agent_insights").insert(
      insights.slice(0, 5).map((ins) => ({
        company_id: company.id,
        text: ins.text,
        scope: ins.scope,
        entities: ins.entities,
        action: ins.action,
        status: "open",
        generated_at: new Date().toISOString(),
      }))
    );
  }

  return NextResponse.json({ generated: insights.length, status: "ok" });
}
