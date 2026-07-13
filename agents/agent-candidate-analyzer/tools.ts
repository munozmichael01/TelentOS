import type { AgentTool } from "@/agents/core";
import { createClient } from "@/lib/supabase/server";
import { explainFitScore, type FitExplanation, type SkillRef } from "@/lib/fit-explain";
import { countryName } from "@/lib/countries";
import { languageLevelLabel } from "@/lib/languages";

type SkillRow = { skill_id: string; skills: { name: string; category: string | null } | null };

export async function getApplicationContext(applicationId: string) {
  const supabase = createClient();
  const { data: app } = await supabase
    .from("applications")
    .select("*, candidates(*), jobs(*), job_stages(name)")
    .eq("id", applicationId)
    .maybeSingle();
  if (!app) return { error: "Candidatura no encontrada" };

  const candidate = app.candidates as unknown as {
    id: string; name: string; email: string; location: string | null;
    city: string | null; country_code: string | null; skills: string[];
    experience_years: number; summary: string | null; cv_url: string | null;
  };
  const job = app.jobs as unknown as {
    id: string; title: string; description: string | null; skills: string[];
    experience_min_years: number; location: string | null;
    city: string | null; country_code: string | null;
  };
  const stage = app.job_stages as unknown as { name: string } | null;

  // Perfil estructurado del candidato (0027/0028) + skills canónicas de la oferta
  // (0029) + historial — RLS scoped por membership vía application→job.
  const [
    { data: candSkillRows },
    { data: jobSkillRows },
    { data: experiences },
    { data: languages },
    { data: education },
    { data: events },
    { data: interviews },
  ] = await Promise.all([
    supabase.from("candidate_skills").select("skill_id, skills(name, category)").eq("candidate_id", candidate.id),
    supabase.from("job_skills").select("skill_id, skills(name, category)").eq("job_id", job.id),
    supabase.from("candidate_experiences").select("title, company, seniority, start_date, end_date, is_current").eq("candidate_id", candidate.id).order("order_index"),
    supabase.from("candidate_languages").select("language, level").eq("candidate_id", candidate.id),
    supabase.from("candidate_education").select("degree, institution, field, start_year, end_year").eq("candidate_id", candidate.id).order("order_index"),
    supabase.from("application_events").select("type,from_stage,to_stage,reason,created_at").eq("application_id", applicationId).order("created_at"),
    supabase.from("interviews").select("scheduled_at,status,interviewer, interview_feedback(overall,comments,ratings)").eq("application_id", applicationId),
  ]);

  const toRefs = (rows: SkillRow[] | null): SkillRef[] =>
    ((rows ?? []) as SkillRow[])
      .filter((r) => r.skills)
      .map((r) => ({ id: r.skill_id, name: r.skills!.name }));

  // Tipos Supabase sin regenerar post-0027/0029: el join anidado se infiere como array
  const candidateSkillRefs = toRefs(candSkillRows as unknown as SkillRow[] | null);
  const jobSkillRefs = toRefs(jobSkillRows as unknown as SkillRow[] | null);

  // Desglose determinista del fit (misma aritmética que el score persistido):
  // el LLM redacta la lectura, este objeto es el porqué del número.
  const fit_breakdown: FitExplanation = explainFitScore(
    { skills: candidate.skills ?? [], experience_years: candidate.experience_years ?? 0, location: candidate.location },
    { skills: job.skills ?? [], experience_min_years: job.experience_min_years ?? 0, location: job.location },
    {
      candidateSkills: candidateSkillRefs,
      jobSkills: jobSkillRefs,
      candidateCity: candidate.city,
      candidateCountry: candidate.country_code,
      jobCity: job.city,
      jobCountry: job.country_code,
    },
  );

  const skillCategories = new Map(
    ((candSkillRows ?? []) as unknown as SkillRow[]).filter((r) => r.skills).map((r) => [r.skills!.name, r.skills!.category]),
  );

  return {
    candidate: {
      name: candidate.name,
      email: candidate.email,
      location: candidate.location,
      city: candidate.city,
      country: countryName(candidate.country_code),
      summary: candidate.summary,
      experience_years: candidate.experience_years,
      cv_url: candidate.cv_url,
      // skills legadas text[] — se mantienen para candidatos sin perfil estructurado
      skills: candidate.skills ?? [],
      structured_skills: candidateSkillRefs.map((s) => ({
        name: s.name,
        category: skillCategories.get(s.name) ?? null,
      })),
      experiences: experiences ?? [],
      languages: ((languages ?? []) as { language: string; level: string | null }[]).map((l) => ({
        language: l.language,
        level: languageLevelLabel(l.level),
      })),
      education: education ?? [],
    },
    job: {
      title: job.title,
      description: job.description,
      skills: job.skills,
      structured_skills: jobSkillRefs.map((s) => s.name),
      experience_min_years: job.experience_min_years,
      location: job.location,
      city: job.city,
      country: countryName(job.country_code),
    },
    fit_score: app.fit_score as number | null,
    fit_breakdown,
    current_stage: stage?.name,
    source: app.source as string,
    history: events ?? [],
    interviews: interviews ?? [],
  };
}

export const tools: AgentTool[] = [
  {
    definition: {
      type: "function",
      function: {
        name: "get_application_context",
        description:
          "Devuelve el contexto completo de una candidatura: perfil estructurado del candidato (skills canónicas con categoría, experiencias, idiomas, educación, ubicación), la oferta con sus skills canónicas, el fit score con su desglose determinista (fit_breakdown: skills matched/missing por nombre y puntos por factor), etapa actual, historial y feedback de entrevistas.",
        parameters: {
          type: "object",
          properties: {
            application_id: { type: "string", description: "UUID de la candidatura" },
          },
          required: ["application_id"],
        },
      },
    },
    execute: (args) => getApplicationContext(String(args.application_id)),
  },
];
