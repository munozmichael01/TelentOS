import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import { createClient } from "@/lib/supabase/server";

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

const MODEL = "gpt-4o";
const MAX_TOOL_TURNS = 6;

export function hasOpenAI() {
  return Boolean(process.env.OPENAI_API_KEY);
}

async function logRun(agent: string, input: unknown, output: unknown, status: string) {
  try {
    const supabase = createClient();
    await supabase.from("agent_runs").insert({
      agent,
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
}): Promise<AgentResult<T>> {
  const { agent, system, user, priorMessages, tools, input, fallback } = opts;

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

    for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages,
        tools: tools.length ? tools.map((t) => t.definition) : undefined,
        response_format: { type: "json_object" },
        temperature: 0.4,
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

      const output = JSON.parse(msg.content ?? "{}") as T;
      await logRun(agent, input, output, "ok");
      return { output, status: "ok" };
    }
    throw new Error("Máximo de turnos de tools alcanzado");
  } catch (e) {
    // Degradación elegante: heurística determinista + log del error
    const output = await fallback();
    await logRun(agent, input, { fallback: output, error: String(e) }, "fallback");
    return { output, status: "fallback" };
  }
}
