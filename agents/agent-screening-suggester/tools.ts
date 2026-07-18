import type { AgentTool } from "@/agents/core";
import { createClient } from "@/lib/supabase/server";

// Contexto de la oferta para sugerir screening — RLS scoped por membership (la sesión
// del recruiter): solo ofertas de su empresa.
export async function getJobContext(jobId: string) {
  const supabase = createClient();
  const { data: job } = await supabase
    .from("jobs")
    .select("id, title, description, seniority_level, education_level, experience_min_years, modality, location, city")
    .eq("id", jobId)
    .maybeSingle();
  if (!job) return { error: "Oferta no encontrada" };

  const { data: skillRows } = await supabase
    .from("job_skills")
    .select("requirement, skills(name)")
    .eq("job_id", jobId);
  const skills = (skillRows ?? []).map((r) => ({
    name: (r.skills as { name?: string } | null)?.name ?? "",
    requirement: (r.requirement ?? "deseable") as "excluyente" | "deseable",
  })).filter((s) => s.name);

  return {
    id: job.id, title: job.title, description: job.description,
    seniority_level: job.seniority_level, education_level: job.education_level,
    experience_min_years: job.experience_min_years, modality: job.modality,
    location: job.location, city: job.city, skills,
  };
}

export const tools: AgentTool[] = [
  {
    definition: {
      type: "function",
      function: {
        name: "get_job_context",
        description: "Devuelve el contexto de la oferta (título, descripción, seniority, educación, experiencia mínima, modalidad, ubicación y skills con su requirement) para sugerir preguntas de screening.",
        parameters: {
          type: "object",
          properties: { jobId: { type: "string", description: "id de la oferta" } },
          required: ["jobId"],
        },
      },
    },
    execute: async (args) => getJobContext(String(args.jobId)),
  },
];
