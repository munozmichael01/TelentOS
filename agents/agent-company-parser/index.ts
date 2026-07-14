import { z } from "zod";
import { runAgent, type AgentResult } from "@/agents/core";
import { SYSTEM_PROMPT } from "./prompt";

/**
 * Parser de empresa (agentes). Extrae un perfil estructurado del TEXTO de la web de
 * la empresa para pre-rellenar el intake del career site — patrón cv-parser apuntado
 * a una empresa. Extrae, NUNCA inventa: sin dato en el texto → campo vacío. El fetch
 * seguro (anti-SSRF) y la extracción de redes viven en `lib/safe-fetch.ts`; aquí solo
 * la lectura estructurada por LLM.
 */

const Metric = z.object({ value: z.string(), label: z.string() });
const OutSchema = z.object({
  about: z.string(),
  values: z.array(z.string()),
  benefits: z.array(z.string()),
  metrics: z.array(Metric),
});

export type CompanyProfile = z.infer<typeof OutSchema>;

export async function runCompanyParser(opts: { companyId?: string; text: string }): Promise<AgentResult<CompanyProfile>> {
  const user = `Texto de la web de la empresa (extráelo fielmente, no inventes):\n\n${opts.text.slice(0, 8000)}`;

  return runAgent<CompanyProfile>({
    agent: "company-parser",
    model: "gpt-4o-mini",
    maxTokens: 700,
    system: SYSTEM_PROMPT,
    user,
    tools: [],
    input: { companyId: opts.companyId },
    validate: (v) => OutSchema.parse(v),
    // Sin IA o ante error: perfil vacío (el usuario rellena el intake a mano).
    fallback: () => ({ about: "", values: [], benefits: [], metrics: [] }),
  });
}
