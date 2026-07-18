import { z } from "zod";
import { runAgent, type AgentResult } from "@/agents/core";
import { SYSTEM_PROMPT } from "./prompt";
import { tools, getJobContext } from "./tools";

// Sugiere preguntas de screening para una oferta, on-demand (cuando el recruiter elige
// añadirlas). SUGIERE; no persiste — el humano confirma en la UI. Un filtro DURO es una
// regla del humano ejecutada de forma determinista, no una decisión de IA.

export const SuggestedQuestionSchema = z.object({
  type: z.enum(["yes_no", "single_choice", "text", "url"]),
  prompt: z.string(),
  options: z.array(z.string()).default([]),
  required: z.boolean().default(false),
  mode: z.enum(["filter", "weighted"]).default("weighted"),
  filter_rule: z.object({ match: z.unknown() }).nullable().default(null),
  weight: z.number().default(0),
  rationale: z.string(),
});
export const ScreeningSuggestionsSchema = z.object({
  suggestions: z.array(SuggestedQuestionSchema).max(8),
});
export type ScreeningSuggestions = z.infer<typeof ScreeningSuggestionsSchema>;
export type ScreeningSuggesterInput = { jobId: string; companyId?: string };

// Heurística determinista sin LLM sobre los requisitos estructurados de la oferta.
async function fallbackSuggest(input: ScreeningSuggesterInput): Promise<ScreeningSuggestions> {
  const ctx = await getJobContext(input.jobId);
  if ("error" in ctx) return { suggestions: [] };
  const suggestions: ScreeningSuggestions["suggestions"] = [];

  if ((ctx.experience_min_years ?? 0) > 0) {
    suggestions.push({
      type: "yes_no",
      prompt: `¿Tienes al menos ${ctx.experience_min_years} años de experiencia en un rol similar a ${ctx.title}?`,
      options: [], required: true, mode: "filter", filter_rule: { match: "no" }, weight: 0,
      rationale: `La oferta pide un mínimo de ${ctx.experience_min_years} años; descarta a quien no lo cumple.`,
    });
  }
  for (const s of ctx.skills.filter((k) => k.requirement === "excluyente").slice(0, 3)) {
    suggestions.push({
      type: "yes_no", prompt: `¿Tienes experiencia práctica con ${s.name}?`,
      options: [], required: false, mode: "filter", filter_rule: { match: "no" }, weight: 0,
      rationale: `${s.name} es un requisito excluyente de la oferta.`,
    });
  }
  for (const s of ctx.skills.filter((k) => k.requirement === "deseable").slice(0, 2)) {
    suggestions.push({
      type: "yes_no", prompt: `¿Has trabajado con ${s.name}?`,
      options: [], required: false, mode: "weighted", filter_rule: null, weight: 10,
      rationale: `${s.name} es deseable; suma al fit sin descartar.`,
    });
  }
  if (ctx.modality === "presencial" && (ctx.city || ctx.location)) {
    suggestions.push({
      type: "yes_no", prompt: `¿Puedes trabajar de forma presencial en ${ctx.city ?? ctx.location}?`,
      options: [], required: true, mode: "filter", filter_rule: { match: "no" }, weight: 0,
      rationale: "La oferta es presencial; la ubicación es un requisito objetivo.",
    });
  }
  return { suggestions: suggestions.slice(0, 6) };
}

export async function runScreeningSuggester(
  input: ScreeningSuggesterInput
): Promise<AgentResult<ScreeningSuggestions>> {
  return runAgent<ScreeningSuggestions>({
    agent: "screening-suggester",
    system: SYSTEM_PROMPT,
    user: `Sugiere preguntas de screening para la oferta con id "${input.jobId}". Obtén primero su contexto con la tool.`,
    tools,
    input,
    validate: (v) => ScreeningSuggestionsSchema.parse(v),
    fallback: () => fallbackSuggest(input),
  });
}
