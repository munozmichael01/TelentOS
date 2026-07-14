/**
 * Gasto de IA agregado a nivel plataforma (Platform Console §9.1). Cross-tenant:
 * suma el gasto de TODAS las empresas desde `agent_runs._usage`, reusando el mismo
 * `costOf` del presupuesto por empresa. Solo lectura; alimenta la superficie que
 * diseñará pista Diseño.
 *
 * `aggregateSpend` es PURA (testeable sin BD); `platformSpend` la envuelve con la
 * lectura + nombres de empresa + límites/alertas de presupuesto.
 */
import type { createAdminClient } from "@/lib/supabase/server";
import { costOf, DEFAULT_MONTHLY_BUDGET_USD, type RunUsage } from "@/lib/agent-budget";

type AdminDb = ReturnType<typeof createAdminClient>;

export type SpendRow = {
  company_id: string | null;
  agent: string | null;
  created_at: string;
  input: { _usage?: RunUsage } | null;
};

export type SpendAggregation = {
  totalUsd: number;
  runs: number;
  byCompany: { companyId: string; spendUsd: number; runs: number }[];
  byAgent: { agent: string; spendUsd: number; runs: number }[];
  byModel: { model: string; spendUsd: number }[];
  byDay: { day: string; spendUsd: number }[];
};

const round4 = (n: number) => Math.round(n * 10000) / 10000;
const NO_ID = "—"; // filas sin company_id/agent (no deberían existir, pero no se pierden)

/** Agrega gasto a partir de filas crudas de `agent_runs`. Pura y testeable. */
export function aggregateSpend(rows: SpendRow[]): SpendAggregation {
  let totalUsd = 0;
  const byCompany = new Map<string, { spendUsd: number; runs: number }>();
  const byAgent = new Map<string, { spendUsd: number; runs: number }>();
  const byModel = new Map<string, number>();
  const byDay = new Map<string, number>();

  for (const r of rows) {
    const usage = r.input?._usage;
    const cost = costOf(usage);
    totalUsd += cost;

    const cId = r.company_id ?? NO_ID;
    const c = byCompany.get(cId) ?? { spendUsd: 0, runs: 0 };
    c.spendUsd += cost;
    c.runs += 1;
    byCompany.set(cId, c);

    const ag = r.agent ?? NO_ID;
    const a = byAgent.get(ag) ?? { spendUsd: 0, runs: 0 };
    a.spendUsd += cost;
    a.runs += 1;
    byAgent.set(ag, a);

    if (usage?.model) byModel.set(usage.model, (byModel.get(usage.model) ?? 0) + cost);

    const day = r.created_at.slice(0, 10); // YYYY-MM-DD (UTC de la marca ISO)
    byDay.set(day, (byDay.get(day) ?? 0) + cost);
  }

  return {
    totalUsd: round4(totalUsd),
    runs: rows.length,
    byCompany: Array.from(byCompany)
      .map(([companyId, v]) => ({ companyId, spendUsd: round4(v.spendUsd), runs: v.runs }))
      .sort((a, b) => b.spendUsd - a.spendUsd),
    byAgent: Array.from(byAgent)
      .map(([agent, v]) => ({ agent, spendUsd: round4(v.spendUsd), runs: v.runs }))
      .sort((a, b) => b.spendUsd - a.spendUsd),
    byModel: Array.from(byModel)
      .map(([model, spendUsd]) => ({ model, spendUsd: round4(spendUsd) }))
      .sort((a, b) => b.spendUsd - a.spendUsd),
    byDay: Array.from(byDay)
      .map(([day, spendUsd]) => ({ day, spendUsd: round4(spendUsd) }))
      .sort((a, b) => a.day.localeCompare(b.day)),
  };
}

function monthStartISO(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export type CompanySpend = {
  companyId: string;
  name: string;
  spendUsd: number;
  runs: number;
  limitUsd: number;
  pct: number;
  alert: boolean;
};

export type PlatformSpend = SpendAggregation & {
  sinceISO: string;
  companies: CompanySpend[];
};

/** Límite mensual por empresa: override `companies.ai_monthly_budget_usd` si existe (fast-follow), si no el default. Tolerante a que la columna aún no exista. */
async function resolveLimits(db: AdminDb): Promise<Map<string, number>> {
  try {
    const { data, error } = await db.from("companies").select("id, ai_monthly_budget_usd");
    if (error) return new Map(); // columna aún no migrada → todos al default
    const m = new Map<string, number>();
    for (const r of (data ?? []) as { id: string; ai_monthly_budget_usd?: number }[]) {
      if (typeof r.ai_monthly_budget_usd === "number" && r.ai_monthly_budget_usd > 0) {
        m.set(r.id, r.ai_monthly_budget_usd);
      }
    }
    return m;
  } catch {
    return new Map();
  }
}

/**
 * Gasto de IA agregado de la plataforma. Ventana por defecto: mes en curso, para que
 * el % de presupuesto (y la alerta) sean significativos. `alert` marca empresas ≥80%
 * de su límite — el umbral exacto lo afinará la superficie de Design.
 */
export async function platformSpend(db: AdminDb, sinceISO?: string): Promise<PlatformSpend> {
  const since = sinceISO ?? monthStartISO();

  const { data: rows } = await db
    .from("agent_runs")
    .select("company_id, agent, created_at, input")
    .gte("created_at", since);

  const agg = aggregateSpend((rows ?? []) as SpendRow[]);

  const [{ data: companyRows }, limits] = await Promise.all([
    db.from("companies").select("id, name"),
    resolveLimits(db),
  ]);
  const nameById = new Map(
    ((companyRows ?? []) as { id: string; name: string }[]).map((c) => [c.id, c.name]),
  );

  const companies: CompanySpend[] = agg.byCompany
    .filter((c) => c.companyId !== NO_ID)
    .map((c) => {
      const limitUsd = limits.get(c.companyId) ?? DEFAULT_MONTHLY_BUDGET_USD;
      const pct = Math.round((c.spendUsd / limitUsd) * 100);
      return {
        companyId: c.companyId,
        name: nameById.get(c.companyId) ?? NO_ID,
        spendUsd: c.spendUsd,
        runs: c.runs,
        limitUsd,
        pct,
        alert: pct >= 80,
      };
    });

  return { ...agg, sinceISO: since, companies };
}
