import { z } from "zod";
import { runAgent, type AgentResult } from "@/agents/core";
import { SYSTEM_PROMPT } from "./prompt";
import { fallbackSummary, type ReviewFinding } from "@/lib/payroll/copilot";

/**
 * Redactor del payroll copilot (patrón insights: determinista calcula, LLM redacta).
 * Los findings llegan ya calculados por lib/payroll/copilot.ts; aquí solo se
 * escribe el resumen ejecutivo. Sin tools, modelo barato, techo corto de tokens.
 */

const SummarySchema = z.object({
  summary: z.string().min(1).max(400),
});

export type CopilotSummary = z.infer<typeof SummarySchema>;

export async function runPayrollCopilotSummary(opts: {
  companyId: string;
  periodLabel: string;
  findings: ReviewFinding[];
}): Promise<AgentResult<CopilotSummary>> {
  const { companyId, periodLabel, findings } = opts;

  // Sin avisos no hay nada que redactar — determinista directo, cero coste.
  if (findings.length === 0) {
    return { output: { summary: fallbackSummary([]) }, status: "ok" };
  }

  const user =
    `Corrida: ${periodLabel}. Avisos calculados (${findings.length}):\n` +
    JSON.stringify(
      findings.map((f) => ({ severity: f.severity, kind: f.kind, texto: f.text })),
      null,
      1,
    );

  return runAgent<CopilotSummary>({
    agent: "payroll-copilot",
    model: "gpt-4o-mini",
    maxTokens: 300,
    system: SYSTEM_PROMPT,
    user,
    tools: [],
    input: { companyId, periodLabel, findings: findings.length },
    validate: (v) => SummarySchema.parse(v),
    fallback: () => ({ summary: fallbackSummary(findings) }),
  });
}
