import { z } from "zod";
import { runAgent, type AgentResult } from "@/agents/core";
import { SYSTEM_PROMPT } from "./prompt";
import { buildAssistantTools, type AssistantRole } from "./tools";

/**
 * Asistente de plataforma (S4) — el punto central conversacional. Un solo
 * cerebro con packs de tools por vertical y RBAC heredado por tool (lo que el
 * rol no puede ver, no se monta). Solo lee; jamás escribe.
 */

export const AssistantResponseSchema = z.object({
  answer: z.string().min(1),
  links: z
    .array(z.object({ label: z.string(), href: z.string() }))
    .max(5)
    .default([]),
  suggested_questions: z.array(z.string()).max(4).default([]),
});

export type AssistantResponse = z.infer<typeof AssistantResponseSchema>;

export type AssistantInput = {
  companyId: string;
  role: AssistantRole;
  query: string;
  /** Etiqueta de contexto de pantalla ("Corrida Julio 2026", "Canales") — opcional. */
  context?: string | null;
  history: { role: "user" | "assistant"; content: string }[];
};

function fallbackResponse(input: AssistantInput): AssistantResponse {
  return {
    answer:
      "Ahora mismo no puedo consultar los datos (modo sin IA). Prueba desde las pantallas: Empleados, Pay Runs o Canales tienen la información al día.",
    links: [
      { label: "Empleados", href: "/employees" },
      { label: "Pay Runs", href: "/payroll/runs" },
    ],
    suggested_questions: ["¿Cuántos empleados activos hay?", "¿Cómo va el pipeline de reclutamiento?"],
  };
}

export async function runAssistant(input: AssistantInput): Promise<AgentResult<AssistantResponse>> {
  const tools = buildAssistantTools(input.companyId, input.role);

  // El modelo no sabe la fecha: sin esto, "este mes"/"esta semana" fallan.
  const today = new Date().toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const isoMonth = new Date().toISOString().slice(0, 7);
  const preamble = `Hoy es ${today} (mes actual: ${isoMonth}).`;
  const user = input.context
    ? `${preamble}\nContexto de pantalla: ${input.context}\n\nPregunta: ${input.query}`
    : `${preamble}\n\nPregunta: ${input.query}`;

  return runAgent<AssistantResponse>({
    agent: "assistant",
    model: "gpt-4o", // chat multi-dominio con razonamiento — tier alto (doc de coste §6.1)
    maxTokens: 700,
    system: SYSTEM_PROMPT,
    user,
    priorMessages: input.history.slice(-10),
    tools,
    input: { companyId: input.companyId, role: input.role, context: input.context ?? null },
    validate: (v) => AssistantResponseSchema.parse(v),
    fallback: () => fallbackResponse(input),
  });
}
