import { z } from "zod";
import { runAgent, type AgentResult } from "@/agents/core";
import { SYSTEM_PROMPT } from "./prompt";
import { tools, getApplicationContext } from "./tools";

// Schema zod = contrato del agente (validado en core con 1 reintento in-conversation).
export const CandidateAnalysisSchema = z.object({
  summary: z.string(),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  interview_questions: z.array(z.string()),
  fit_assessment: z.string(),
});

export type CandidateAnalysis = z.infer<typeof CandidateAnalysisSchema>;

export type CandidateAnalyzerInput = { applicationId: string };

/** Heurística sin LLM sobre el mismo desglose determinista que usa el agente. */
async function fallbackAnalysis(input: CandidateAnalyzerInput): Promise<CandidateAnalysis> {
  const ctx = await getApplicationContext(input.applicationId);
  if ("error" in ctx) {
    return {
      summary: "No se pudo cargar la candidatura.",
      strengths: [],
      gaps: [],
      interview_questions: [],
      fit_assessment: "Sin datos.",
    };
  }
  const { matched, missing, mode } = ctx.fit_breakdown.skills;
  const { requiredYears, actualYears } = ctx.fit_breakdown.experience;
  const expGap = requiredYears > 0 && actualYears < requiredYears;

  return {
    summary: `${ctx.candidate.name}: ${actualYears} años de experiencia, aplica a ${ctx.job.title} desde ${ctx.source}. ${ctx.candidate.summary ?? ""}`.trim(),
    strengths: matched.map((s) => `Cubre el requisito "${s}"`),
    gaps: [
      ...missing.map((s) => `No hay evidencia de "${s}" en el perfil`),
      ...(expGap
        ? [`Experiencia (${actualYears} años) por debajo del mínimo requerido (${requiredYears})`]
        : []),
    ],
    interview_questions: [
      ...missing.slice(0, 3).map((s) => `¿Qué experiencia práctica tienes con ${s}? Pide un ejemplo concreto de proyecto.`),
      ...matched.slice(0, 2).map((s) => `Profundiza en ${s}: ¿cuál fue el reto más difícil que resolviste con ello?`),
      "¿Por qué este rol y esta empresa, y no otra oferta similar?",
    ],
    fit_assessment:
      `Análisis heurístico: fit ${ctx.fit_breakdown.score}/100 — cubre ${matched.length}/${matched.length + missing.length} skills ` +
      `(${ctx.fit_breakdown.skills.points}/60 pts, matching ${mode}), experiencia ${ctx.fit_breakdown.experience.points}/25, ` +
      `ubicación ${ctx.fit_breakdown.location.points}/15 (${ctx.fit_breakdown.location.verdict}).`,
  };
}

export async function runCandidateAnalyzer(
  input: CandidateAnalyzerInput
): Promise<AgentResult<CandidateAnalysis>> {
  return runAgent<CandidateAnalysis>({
    agent: "candidate-analyzer",
    system: SYSTEM_PROMPT,
    user: `Analiza la candidatura con id "${input.applicationId}". Obtén primero su contexto con la tool.`,
    tools,
    input,
    validate: (v) => CandidateAnalysisSchema.parse(v),
    fallback: () => fallbackAnalysis(input),
  });
}
