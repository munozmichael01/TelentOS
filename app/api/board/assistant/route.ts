import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api";
import { runBoardAssistant } from "@/agents/agent-board-assistant";
import { searchJobs } from "@/lib/job-board/search";
import { resolveSkillIds } from "@/lib/skills";
import { computeRecruiterFit, type JobSkillReq } from "@/lib/job-board/fit";
import type { EducationLevel, SeniorityLevel } from "@/lib/types";

// Asistente del board — GATED a candidato logueado (decisión de producto). El agente
// ordena el intake y narra; aquí re-ejecutamos la búsqueda determinista con sus filtros
// para devolver los JobCards autoritativos (nunca dependen del LLM).
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return jsonError("Inicia sesión para usar el asistente", 401);

  const body = await req.json().catch(() => null);
  const query = typeof body?.query === "string" ? body.query.trim() : "";
  if (!query) return jsonError("Escribe tu consulta");
  if (query.length > 500) return jsonError("Consulta demasiado larga", 422);

  const history = (Array.isArray(body?.history) ? body.history : [])
    .filter((m: unknown): m is { role: string; content: string } =>
      !!m && typeof m === "object" && "role" in m && "content" in m)
    .filter((m: { role: string }) => m.role === "user" || m.role === "assistant")
    .map((m: { role: string; content: string }) => ({ role: m.role as "user" | "assistant", content: String(m.content) }))
    .slice(-10);

  const result = await runBoardAssistant({ query, history });

  // JobCards autoritativos: búsqueda determinista con los filtros finales del agente
  // (salvo que pida más intake, en cuyo caso aún no hay filtros que ejecutar).
  let jobs: unknown[] = [];
  let total = 0;
  if (!result.output.intake_needed) {
    const res = await searchJobs(supabase, { ...result.output.filters, pageSize: 12 });
    jobs = res.jobs;
    total = res.total;

    // Fit por oferta: el perfil del candidato (su ficha ATS) vs cada oferta. Lo que hace
    // que sea un "asistente" y no un listado. Solo si tiene ficha con datos.
    const jobRows = jobs as { id: string }[];
    if (jobRows.length) {
      // Admin: candidates/job_skills tienen RLS por empresa; un candidato no las lee con RLS.
      // Scopeado por user.id (que controlamos tras el guard de sesión).
      const admin = createAdminClient();
      const { data: cands } = await admin.from("candidates")
        .select("skills, experience_years, education_level, city, country_code, location")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(1);
      const cand = cands?.[0];
      if (cand) {
        const ids = jobRows.map((j) => j.id);
        const [{ data: reqs }, { data: jSkills }, candSkillIds] = await Promise.all([
          admin.from("jobs").select("id, experience_min_years, education_level, seniority_level, country_code, city, location").in("id", ids),
          admin.from("job_skills").select("job_id, skill_id, requirement").in("job_id", ids),
          resolveSkillIds(admin, Array.isArray(cand.skills) ? cand.skills : []),
        ]);
        const reqById = new Map((reqs ?? []).map((r) => [r.id, r]));
        const skillsByJob = new Map<string, { skillId: string; requirement: JobSkillReq["requirement"] }[]>();
        for (const s of jSkills ?? []) {
          const arr = skillsByJob.get(s.job_id) ?? [];
          arr.push({ skillId: s.skill_id, requirement: (s.requirement ?? "deseable") as JobSkillReq["requirement"] });
          skillsByJob.set(s.job_id, arr);
        }
        jobs = jobRows.map((j) => {
          const r = reqById.get(j.id);
          const fit = computeRecruiterFit({
            job: { skills: skillsByJob.get(j.id) ?? [], experienceMinYears: r?.experience_min_years ?? 0, educationLevel: (r?.education_level ?? null) as EducationLevel | null, seniorityLevel: (r?.seniority_level ?? null) as SeniorityLevel | null, country: r?.country_code ?? null, city: r?.city ?? null, location: r?.location ?? null },
            candidate: { skillIds: candSkillIds, experienceYears: cand.experience_years ?? 0, educationLevel: (cand.education_level ?? null) as EducationLevel | null, seniorityLevel: null, country: cand.country_code ?? null, city: cand.city ?? null, location: cand.location ?? null },
          });
          return { ...j, fit: fit.score };
        });
      }
    }
  }

  return NextResponse.json({
    answer: result.output.answer,
    filters: result.output.filters,
    intake_needed: result.output.intake_needed,
    suggested_refinements: result.output.suggested_refinements,
    jobs, total,
    _status: result.status,
  });
}
