import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Infraestructura común de los agentes en-flujo.
 *
 * Principios:
 *  - Los agentes SUGIEREN; nunca escriben en la base de datos. La persistencia
 *    de sus propuestas ocurre solo cuando el humano confirma en la UI.
 *  - Toda invocación queda registrada en `agent_runs` (auditoría).
 *  - Sin OPENAI_API_KEY el agente degrada a un fallback heurístico determinista
 *    construido sobre las mismas tools, para que el producto sea demostrable
 *    end-to-end sin coste de API.
 */

export type AgentTool = {
  definition: ChatCompletionTool;
  execute: (args: Record<string, unknown>) => Promise<unknown> | unknown;
};

export type AgentResult<T> = {
  output: T;
  status: "ok" | "fallback";
};

const DEFAULT_MODEL = "gpt-4o";
const MAX_TOOL_TURNS = 6;
// Techo de facturación y latencia (doc de coste §6.2): los outputs medidos de todos
// los agentes actuales caben en 1.024 tok; quien necesite más lo pide explícito.
const DEFAULT_MAX_TOKENS = 1024;

export function hasOpenAI() {
  return Boolean(process.env.OPENAI_API_KEY);
}

async function logRun(agent: string, input: unknown, output: unknown, status: string) {
  try {
    // service_role: 0015 dejó agent_runs sin políticas de INSERT para
    // authenticated y el log fallaba en silencio (catch de abajo).
    const supabase = createAdminClient();
    const companyId =
      input && typeof input === "object" && "companyId" in input
        ? (input as { companyId?: string }).companyId ?? null
        : null;
    await supabase.from("agent_runs").insert({
      agent,
      company_id: companyId,
      input: input ?? {},
      output: output ?? {},
      status,
    });
  } catch {
    // la auditoría nunca debe romper el flujo
  }
}

export async function runAgent<T>(opts: {
  agent: string;
  system: string;
  user: string;
  priorMessages?: ChatCompletionMessageParam[];
  tools: AgentTool[];
  input: unknown;
  fallback: () => Promise<T> | T;
  /** Override model per agent — default: gpt-4o. Use gpt-4o-mini for extraction tasks. */
  model?: string;
  /**
   * Validación del output antes de entregarlo a la UI (auditoría §1: JSON.parse
   * directo). Debe LANZAR con mensaje descriptivo si el valor no cumple — encaja
   * `schema.parse` de zod tal cual. Un fallo → 1 reintento con feedback del error
   * al modelo; segundo fallo → fallback heurístico.
   */
  validate?: (value: unknown) => T;
  /** Techo de tokens de output por agente — default 1024. */
  maxTokens?: number;
}): Promise<AgentResult<T>> {
  const {
    agent, system, user, priorMessages, tools, input, fallback,
    model = DEFAULT_MODEL, validate, maxTokens = DEFAULT_MAX_TOKENS,
  } = opts;

  if (!hasOpenAI()) {
    const output = await fallback();
    await logRun(agent, input, output, "fallback");
    return { output, status: "fallback" };
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: system },
      ...(priorMessages ?? []),
      { role: "user", content: user },
    ];

    let retryUsed = false;

    for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
      const completion = await openai.chat.completions.create({
        model,
        messages,
        tools: tools.length ? tools.map((t) => t.definition) : undefined,
        response_format: { type: "json_object" },
        temperature: 0.4,
        max_tokens: maxTokens,
      });

      const msg = completion.choices[0].message;
      messages.push(msg);

      if (msg.tool_calls?.length) {
        for (const call of msg.tool_calls) {
          const tool = tools.find(
            (t) => t.definition.function.name === call.function.name
          );
          let result: unknown;
          try {
            result = tool
              ? await tool.execute(JSON.parse(call.function.arguments || "{}"))
              : { error: `Tool desconocida: ${call.function.name}` };
          } catch (e) {
            result = { error: String(e) };
          }
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify(result),
          });
        }
        continue;
      }

      // Output final: parse + validación (si el agente define schema). Un output
      // inválido no llega jamás a la UI: 1 reintento con el error como feedback,
      // y si reincide, fallback heurístico.
      try {
        const parsed = JSON.parse(msg.content ?? "{}");
        const output = validate ? validate(parsed) : (parsed as T);
        await logRun(agent, input, output, "ok");
        return { output, status: "ok" };
      } catch (validationErr) {
        if (retryUsed) throw validationErr;
        retryUsed = true;
        messages.push({
          role: "user",
          content:
            `Tu última respuesta no cumple el formato requerido: ${String(validationErr).slice(0, 400)}. ` +
            `Responde de nuevo SOLO con el objeto JSON corregido, sin explicaciones.`,
        });
        continue;
      }
    }
    throw new Error("Máximo de turnos de tools alcanzado");
  } catch (e) {
    // Degradación elegante: heurística determinista + log del error
    const output = await fallback();
    await logRun(agent, input, { fallback: output, error: String(e) }, "fallback");
    return { output, status: "fallback" };
  }
}
