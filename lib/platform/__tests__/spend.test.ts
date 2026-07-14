import { describe, it, expect } from "vitest";
import { aggregateSpend, type SpendRow } from "@/lib/platform/spend";

// Tokens en múltiplos de 1M para números limpios contra el pricing (gpt-4o 2.5/10,
// gpt-4o-mini 0.15/0.6 por 1M — lib/agent-budget.ts).
const row = (over: Partial<SpendRow> & { model?: string; pin?: number; pout?: number }): SpendRow => ({
  company_id: over.company_id === undefined ? "c1" : over.company_id,
  agent: over.agent === undefined ? "assistant" : over.agent,
  created_at: over.created_at ?? "2026-07-01T10:00:00.000Z",
  input: {
    _usage: {
      model: over.model ?? "gpt-4o-mini",
      prompt_tokens: (over.pin ?? 0) * 1_000_000,
      completion_tokens: (over.pout ?? 0) * 1_000_000,
      completions: 1,
      truncated: false,
    },
  },
});

describe("aggregateSpend — gasto de IA a nivel plataforma (§9.1)", () => {
  const rows: SpendRow[] = [
    row({ company_id: "c1", agent: "assistant", model: "gpt-4o-mini", pin: 1, pout: 1 }), // 0.15+0.6 = 0.75
    row({ company_id: "c1", agent: "cv-parser", model: "gpt-4o-mini", pin: 2, pout: 0 }), // 0.30
    row({ company_id: "c2", agent: "assistant", model: "gpt-4o", pin: 1, pout: 1, created_at: "2026-07-02T09:00:00.000Z" }), // 2.5+10 = 12.5
  ];

  it("total y nº de runs", () => {
    const a = aggregateSpend(rows);
    expect(a.totalUsd).toBe(13.55);
    expect(a.runs).toBe(3);
  });

  it("byCompany rankeado desc, con runs", () => {
    const { byCompany } = aggregateSpend(rows);
    expect(byCompany).toEqual([
      { companyId: "c2", spendUsd: 12.5, runs: 1 },
      { companyId: "c1", spendUsd: 1.05, runs: 2 },
    ]);
  });

  it("byAgent suma cross-empresa y rankea", () => {
    const { byAgent } = aggregateSpend(rows);
    expect(byAgent[0]).toEqual({ agent: "assistant", spendUsd: 13.25, runs: 2 }); // 0.75 (c1) + 12.5 (c2)
    expect(byAgent[1]).toEqual({ agent: "cv-parser", spendUsd: 0.3, runs: 1 });
  });

  it("byModel separa modelos", () => {
    const { byModel } = aggregateSpend(rows);
    expect(byModel).toEqual([
      { model: "gpt-4o", spendUsd: 12.5 },
      { model: "gpt-4o-mini", spendUsd: 1.05 },
    ]);
  });

  it("byDay ordenado ascendente por fecha", () => {
    const { byDay } = aggregateSpend(rows);
    expect(byDay).toEqual([
      { day: "2026-07-01", spendUsd: 1.05 },
      { day: "2026-07-02", spendUsd: 12.5 },
    ]);
  });

  it("filas sin _usage cuentan como run pero suman $0", () => {
    const a = aggregateSpend([
      { company_id: "c1", agent: "assistant", created_at: "2026-07-01T00:00:00Z", input: null },
      { company_id: "c1", agent: "assistant", created_at: "2026-07-01T00:00:00Z", input: {} },
    ]);
    expect(a.totalUsd).toBe(0);
    expect(a.runs).toBe(2);
    expect(a.byCompany[0].runs).toBe(2);
  });

  it("sin filas → agregación vacía y cero, no lanza", () => {
    const a = aggregateSpend([]);
    expect(a).toEqual({ totalUsd: 0, runs: 0, byCompany: [], byAgent: [], byModel: [], byDay: [] });
  });

  it("company_id/agent nulos no se pierden (se agrupan como '—')", () => {
    const a = aggregateSpend([row({ company_id: null, agent: null, pin: 1, pout: 1 })]);
    expect(a.byCompany[0].companyId).toBe("—");
    expect(a.byAgent[0].agent).toBe("—");
    expect(a.totalUsd).toBe(0.75);
  });
});
