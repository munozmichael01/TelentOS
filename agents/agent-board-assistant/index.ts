import { z } from "zod";
import { runAgent, type AgentResult } from "@/agents/core";
import { SYSTEM_PROMPT } from "./prompt";
import { tools, runBoardSearch } from "./tools";
import { BoardSearchFiltersSchema, heuristicParse } from "@/agents/agent-board-search";
import { getCategories } from "@/lib/board/categories";

// Ancla la interpretación: el LLM ve la taxonomía canónica y devuelve la CLAVE en
// `category` (no texto libre), evitando el mapeo difuso a posteriori. Se compone una vez.
const SYSTEM_WITH_TAXONOMY =
  SYSTEM_PROMPT +
  "\n\nCATEGORÍAS canónicas del board. En 'category' devuelve la CLAVE exacta de esta lista " +
  "cuando el rol/área encaje (p. ej. 'product owner' → product_design); si ninguna encaja, " +
  "OMITE 'category' (no inventes una clave):\n" +
  getCategories("es-ve").map((c) => `- ${c.key}: ${c.label}`).join("\n");

// Asistente conversacional del board (gated a logueado). Intake → búsqueda determinista
// (search_board) → narración. El endpoint re-ejecuta searchJobs con estos filtros para
// los JobCards reales: el LLM ordena y narra, las ofertas nunca las inventa.

export const BoardAssistantSchema = z.object({
  answer: z.string(),
  filters: BoardSearchFiltersSchema.default({}),
  intake_needed: z.boolean().default(false),
  suggested_refinements: z.array(z.string()).default([]),
});
export type BoardAssistantResponse = z.infer<typeof BoardAssistantSchema>;
export type BoardAssistantInput = {
  query: string;
  history: { role: "user" | "assistant"; content: string }[];
};

async function fallbackAssistant(input: BoardAssistantInput): Promise<BoardAssistantResponse> {
  const { filters, interpreted } = heuristicParse(input.query);
  const { total } = await runBoardSearch(filters);
  return {
    answer: total > 0
      ? `Encontré ${total} oferta${total === 1 ? "" : "s"} para «${interpreted}». Míralas abajo.`
      : `No encontré ofertas para «${interpreted}». Prueba a ampliar la búsqueda quitando la ubicación o cambiando la modalidad.`,
    filters,
    intake_needed: false,
    suggested_refinements: ["Solo remoto", "Añadir otra ciudad", "Ver más recientes"],
  };
}

export async function runBoardAssistant(
  input: BoardAssistantInput
): Promise<AgentResult<BoardAssistantResponse>> {
  const priorMessages = input.history.map((m) => ({ role: m.role, content: m.content }));
  return runAgent<BoardAssistantResponse>({
    agent: "board-assistant",
    system: SYSTEM_WITH_TAXONOMY,
    user: input.query,
    priorMessages,
    tools,
    input,
    validate: (v) => BoardAssistantSchema.parse(v),
    fallback: () => fallbackAssistant(input),
  });
}
