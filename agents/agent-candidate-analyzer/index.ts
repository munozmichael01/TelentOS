import { runAgent, type AgentResult } from "@/agents/core";
import { SYSTEM_PROMPT } from "./prompt";
import { tools, getApplicationContext } from "./tools";

export type CandidateAnalysis = {
  summary: string;
  strengths: string[];
  gaps: string[];
  interview_questions: string[];
  fit_assessment: string;
};

export type CandidateAnalyzerInput = { applicationId: string };

/** Heurística sin LLM: análisis estructural por solape de skills. */
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
  const candSkills = (ctx.candidate.skills as string[]).map((s: string) => s.toLowerCase());
  const jobSkills = ctx.job.skills as string[];
  const matched = jobSkills.filter((s) =>
    candSkills.some((c) => c.includes(s.toLowerCase()) || s.toLowerCase().includes(c))
  );
  const missing = jobSkills.filter((s) => !matched.includes(s));
  const expGap = ctx.candidate.experience_years < ctx.job.experience_min_years;

  return {
    summary: `${ctx.candidate.name}: ${ctx.candidate.experience_years} años de experiencia, aplica a ${ctx.job.title} desde ${ctx.source}. ${ctx.candidate.summary ?? ""}`.trim(),
    strengths: matched.map((s) => `Cubre el requisito "${s}"`),
    gaps: [
      ...missing.map((s) => `No hay evidencia de "${s}" en el perfil`),
      ...(expGap
        ? [`Experiencia (${ctx.candidate.experience_years} años) por debajo del mínimo requerido (${ctx.job.experience_min_years})`]
        : []),
    ],
    interview_questions: [
      ...missing.slice(0, 3).map((s) => `¿Qué experiencia práctica tienes con ${s}? Pide un ejemplo concreto de proyecto.`),
      ...matched.slice(0, 2).map((s) => `Profundiza en ${s}: ¿cuál fue el reto más difícil que resolviste con ello?`),
      "¿Por qué este rol y esta empresa, y no otra oferta similar?",
    ],
    fit_assessment: `Análisis heurístico (sin OPENAI_API_KEY): cubre ${matched.length}/${jobSkills.length} skills requeridas. Fit score determinista: ${ctx.fit_score ?? "—"}/100.`,
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
    fallback: () => fallbackAnalysis(input),
  });
}
