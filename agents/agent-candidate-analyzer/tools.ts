import type { AgentTool } from "@/agents/core";
import { createClient } from "@/lib/supabase/server";

export async function getApplicationContext(applicationId: string) {
  const supabase = createClient();
  const { data: app } = await supabase
    .from("applications")
    .select("*, candidates(*), jobs(*), job_stages(name)")
    .eq("id", applicationId)
    .maybeSingle();
  if (!app) return { error: "Candidatura no encontrada" };

  const candidate = app.candidates as unknown as {
    name: string; email: string; location: string | null; skills: string[];
    experience_years: number; summary: string | null; cv_url: string | null;
  };
  const job = app.jobs as unknown as {
    title: string; description: string | null; skills: string[];
    experience_min_years: number; location: string | null;
  };
  const stage = app.job_stages as unknown as { name: string } | null;

  const { data: events } = await supabase
    .from("application_events")
    .select("type,from_stage,to_stage,reason,created_at")
    .eq("application_id", applicationId)
    .order("created_at");

  const { data: interviews } = await supabase
    .from("interviews")
    .select("scheduled_at,status,interviewer, interview_feedback(overall,comments,ratings)")
    .eq("application_id", applicationId);

  return {
    candidate,
    job: {
      title: job.title,
      description: job.description,
      skills: job.skills,
      experience_min_years: job.experience_min_years,
      location: job.location,
    },
    fit_score: app.fit_score as number | null,
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
          "Devuelve el contexto completo de una candidatura: candidato, oferta, fit score, etapa actual, historial y feedback de entrevistas.",
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
