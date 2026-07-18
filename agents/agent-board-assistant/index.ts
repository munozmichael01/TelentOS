import { z } from "zod";
import { runAgent, type AgentResult } from "@/agents/core";
import { SYSTEM_PROMPT } from "./prompt";
import { tools, runBoardSearch } from "./tools";
import { BoardSearchFiltersSchema, heuristicParse } from "@/agents/agent-board-search";

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
    system: SYSTEM_PROMPT,
    user: input.query,
    priorMessages,
    tools,
    input,
    validate: (v) => BoardAssistantSchema.parse(v),
    fallback: () => fallbackAssistant(input),
  });
}
