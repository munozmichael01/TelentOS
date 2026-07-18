import { z } from "zod";
import { runAgent, type AgentResult } from "@/agents/core";
import { SYSTEM_PROMPT } from "./prompt";

// Intérprete de búsqueda del board: texto libre → filtros deterministas. Barato
// (gpt-4o-mini, extracción), sin tools ni DB. La búsqueda real la ejecuta searchJobs
// con estos filtros. Solo se invoca cuando NO hay selección de un job title
// estructurado del autocomplete (esa vía no pasa por LLM).

export const BoardSearchFiltersSchema = z.object({
  q: z.string().optional(),
  location: z.string().optional(),
  modality: z.enum(["presencial", "hibrido", "remoto"]).optional(),
  contract: z.string().optional(),
  category: z.string().optional(),
  salaryMin: z.number().optional(),
});
export const NlSearchResultSchema = z.object({
  filters: BoardSearchFiltersSchema,
  interpreted: z.string(),
});
export type NlSearchResult = z.infer<typeof NlSearchResultSchema>;

// Heurística determinista sin LLM (misma forma de salida) — patrones ES/EN/PT.
export function heuristicParse(text: string): NlSearchResult {
  const raw = text.trim();
  const t = raw.toLowerCase();
  const filters: NlSearchResult["filters"] = {};

  if (/\b(remoto|remote|home office|desde casa|teletrabajo|em casa)\b/.test(t)) filters.modality = "remoto";
  else if (/\b(h[íi]brid[oa]|hybrid)\b/.test(t)) filters.modality = "hibrido";
  else if (/\b(presencial|en oficina|on ?site|no escrit[óo]rio)\b/.test(t)) filters.modality = "presencial";

  const sal = t.match(/(?:m[áa]s de|desde|from|min(?:imo)?|a partir de)\s*\$?\s*([\d.]+)/);
  if (sal) {
    const n = Number(sal[1].replace(/\./g, ""));
    if (Number.isFinite(n) && n > 0) filters.salaryMin = n;
  }

  const loc = raw.match(/\b(?:en|in|na|no)\s+([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ]+)?)/);
  if (loc && !/^(remoto|remote)$/i.test(loc[1])) filters.location = loc[1].trim();

  // q = texto sin los tokens ya reconocidos
  let q = raw
    .replace(/\b(remoto|remote|home office|desde casa|teletrabajo|em casa|h[íi]brid[oa]|hybrid|presencial|en oficina|on ?site)\b/gi, "")
    .replace(/(?:m[áa]s de|desde|from|min(?:imo)?|a partir de)\s*\$?\s*[\d.]+/gi, "")
    .replace(/\b(?:en|in|na|no)\s+[A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ]+)?/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (q) filters.q = q;

  const parts = [filters.q, filters.location, filters.modality].filter(Boolean);
  return { filters, interpreted: parts.length ? parts.join(" · ") : "Todas las ofertas" };
}

export async function runBoardSearchParser(input: { text: string }): Promise<AgentResult<NlSearchResult>> {
  return runAgent<NlSearchResult>({
    agent: "board-search-parser",
    system: SYSTEM_PROMPT,
    user: input.text,
    tools: [],
    input,
    model: "gpt-4o-mini",
    maxTokens: 256,
    validate: (v) => NlSearchResultSchema.parse(v),
    fallback: () => heuristicParse(input.text),
  });
}
