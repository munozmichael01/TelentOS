import { z } from "zod";
import { runAgent, type AgentResult } from "@/agents/core";
import { SYSTEM_PROMPT } from "./prompt";

/**
 * Redactor del career site (agentes, superficie B-9). Redacta UNA sección
 * (about/culture/benefits) → propuesta revisable que RR.HH. aplica sobre el
 * borrador local. Nunca publica (invariante). Redacción → gpt-4o-mini.
 */

export type CareerSection = "about" | "culture" | "benefits";

const IconItem = z.object({ icon: z.string(), name: z.string() });

const SECTION_SCHEMA = {
  about: z.object({ aboutTitle: z.string(), aboutDescription: z.string() }),
  culture: z.object({
    cultureTitle: z.string(),
    cultureDescription: z.string(),
    cultureValues: z.array(IconItem),
  }),
  benefits: z.object({ benefitsTitle: z.string(), benefits: z.array(IconItem) }),
} as const;

export type CareerWriterInput = {
  companyId?: string;
  section: CareerSection;
  prompt?: string;
  current?: Record<string, unknown>;
  company?: { name?: string; description?: string | null; country?: string | null };
};

export type CareerWriterResult = {
  section: CareerSection;
  proposal: Record<string, unknown>;
  rationale?: string;
};

/** Fallback determinista: eco del contenido actual o esqueleto mínimo desde el nombre. */
function fallbackProposal(input: CareerWriterInput): { proposal: Record<string, unknown>; rationale?: string } {
  const name = input.company?.name ?? "la empresa";
  const cur = input.current ?? {};
  if (input.section === "about") {
    return { proposal: { aboutTitle: cur.aboutTitle ?? "Sobre nosotros", aboutDescription: cur.aboutDescription ?? `Conoce a ${name} y por qué es un buen lugar para crecer.` } };
  }
  if (input.section === "culture") {
    return { proposal: { cultureTitle: cur.cultureTitle ?? "Nuestra cultura", cultureDescription: cur.cultureDescription ?? "Cómo trabajamos y qué valoramos.", cultureValues: cur.cultureValues ?? [] } };
  }
  return { proposal: { benefitsTitle: cur.benefitsTitle ?? "Beneficios", benefits: cur.benefits ?? [] } };
}

export async function runCareerWriter(input: CareerWriterInput): Promise<AgentResult<CareerWriterResult>> {
  const schema = SECTION_SCHEMA[input.section];
  const OutSchema = z.object({ proposal: schema, rationale: z.string().optional() });

  const ctx = input.company
    ? `Empresa: ${input.company.name ?? "—"}${input.company.description ? `. Descripción: ${input.company.description}` : ""}${input.company.country ? `. País: ${input.company.country}` : ""}.`
    : "";
  const cur = input.current && Object.keys(input.current).length ? `\nContenido actual de la sección (mejóralo): ${JSON.stringify(input.current)}` : "\nLa sección está vacía.";
  const tone = input.prompt ? `\nIndicación del usuario: ${input.prompt}` : "";
  const user = `Redacta la sección "${input.section}".\n${ctx}${cur}${tone}`;

  const res = await runAgent<{ proposal: Record<string, unknown>; rationale?: string }>({
    agent: "career-writer",
    model: "gpt-4o-mini",
    maxTokens: 700,
    system: SYSTEM_PROMPT,
    user,
    tools: [],
    input: { companyId: input.companyId, section: input.section },
    validate: (v) => OutSchema.parse(v) as { proposal: Record<string, unknown>; rationale?: string },
    fallback: () => fallbackProposal(input),
  });

  return {
    output: { section: input.section, proposal: res.output.proposal, rationale: res.output.rationale },
    status: res.status,
  };
}
