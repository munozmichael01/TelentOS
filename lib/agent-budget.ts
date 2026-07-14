/**
 * Presupuesto de IA por empresa (doc de coste §6.3, último imprescindible).
 * Antes de invocar un agente, si la empresa superó su presupuesto mensual, se
 * DEGRADA al fallback heurístico (que ya existe y cuesta $0) — nunca error.
 *
 * V1: límite por defecto de sistema, calculado del gasto real registrado en
 * `agent_runs._usage`. El override por empresa (columna `companies.ai_monthly_
 * budget_usd`) es fast-follow — cuando exista, `resolveLimit` lo lee.
 */
import type { createAdminClient } from "@/lib/supabase/server";

type AdminDb = ReturnType<typeof createAdminClient>;

export type RunUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  completions: number;
  truncated: boolean;
  model: string;
};

/** Precios USD por 1M de tokens (doc de coste §1, jul 2026). */
const PRICING: Record<string, { in: number; out: number }> = {
  "gpt-4o": { in: 2.5, out: 10 },
  "gpt-4o-mini": { in: 0.15, out: 0.6 },
};
const FALLBACK_PRICE = PRICING["gpt-4o"]; // modelo desconocido → tarifa conservadora

/** Presupuesto mensual por empresa por defecto. El doc de coste estima ~$8-12/mes
 *  por empresa activa con tiering; $50 deja holgura y ataja abuso/runaway. */
export const DEFAULT_MONTHLY_BUDGET_USD = 50;

/** Coste en USD de una invocación a partir de su telemetría. Puro y testeable. */
export function costOf(usage: RunUsage | null | undefined): number {
  if (!usage) return 0;
  const p = PRICING[usage.model] ?? FALLBACK_PRICE;
  return (usage.prompt_tokens / 1e6) * p.in + (usage.completion_tokens / 1e6) * p.out;
}

function monthStartISO(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

/** Gasto acumulado del mes en curso para una empresa (suma de costOf sobre agent_runs). */
export async function monthSpendUsd(db: AdminDb, companyId: string): Promise<number> {
  const { data } = await db
    .from("agent_runs")
    .select("input")
    .eq("company_id", companyId)
    .gte("created_at", monthStartISO());
  let total = 0;
  for (const row of (data ?? []) as { input: { _usage?: RunUsage } | null }[]) {
    total += costOf(row.input?._usage);
  }
  return Math.round(total * 10000) / 10000;
}

async function resolveLimit(db: AdminDb, companyId: string): Promise<number> {
  // Override por empresa si la columna existe (fast-follow); si no, default.
  try {
    const { data, error } = await db
      .from("companies")
      .select("ai_monthly_budget_usd")
      .eq("id", companyId)
      .maybeSingle();
    if (error) return DEFAULT_MONTHLY_BUDGET_USD; // columna aún no migrada
    const v = (data as { ai_monthly_budget_usd?: number } | null)?.ai_monthly_budget_usd;
    return typeof v === "number" && v > 0 ? v : DEFAULT_MONTHLY_BUDGET_USD;
  } catch {
    return DEFAULT_MONTHLY_BUDGET_USD;
  }
}

export type BudgetStatus = { allowed: boolean; spentUsd: number; limitUsd: number; pct: number };

/** ¿Puede la empresa invocar un agente de pago este mes? Nunca lanza. */
export async function checkBudget(db: AdminDb, companyId: string): Promise<BudgetStatus> {
  try {
    const [spentUsd, limitUsd] = await Promise.all([monthSpendUsd(db, companyId), resolveLimit(db, companyId)]);
    return { allowed: spentUsd < limitUsd, spentUsd, limitUsd, pct: Math.round((spentUsd / limitUsd) * 100) };
  } catch {
    // El control de coste jamás debe tumbar el producto: ante error, permite.
    return { allowed: true, spentUsd: 0, limitUsd: DEFAULT_MONTHLY_BUDGET_USD, pct: 0 };
  }
}
