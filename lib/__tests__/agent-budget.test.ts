import { describe, it, expect } from "vitest";
import { costOf, DEFAULT_MONTHLY_BUDGET_USD } from "@/lib/agent-budget";

describe("costOf — coste USD desde la telemetría (precios doc §1)", () => {
  it("gpt-4o: 1M in + 1M out = $2.50 + $10", () => {
    expect(costOf({ model: "gpt-4o", prompt_tokens: 1_000_000, completion_tokens: 1_000_000, completions: 1, truncated: false })).toBeCloseTo(12.5, 4);
  });
  it("gpt-4o-mini es ~40× más barato en input", () => {
    const mini = costOf({ model: "gpt-4o-mini", prompt_tokens: 1_000_000, completion_tokens: 0, completions: 1, truncated: false });
    const big = costOf({ model: "gpt-4o", prompt_tokens: 1_000_000, completion_tokens: 0, completions: 1, truncated: false });
    expect(mini).toBeCloseTo(0.15, 4);
    expect(big / mini).toBeCloseTo(16.67, 1);
  });
  it("invocación real del asistente (~2.777 in / 232 out gpt-4o) cuesta céntimos", () => {
    const c = costOf({ model: "gpt-4o", prompt_tokens: 2777, completion_tokens: 232, completions: 2, truncated: false });
    expect(c).toBeGreaterThan(0.008);
    expect(c).toBeLessThan(0.012);
  });
  it("modelo desconocido usa tarifa conservadora (gpt-4o), nunca 0", () => {
    expect(costOf({ model: "modelo-x", prompt_tokens: 1_000_000, completion_tokens: 0, completions: 1, truncated: false })).toBeCloseTo(2.5, 4);
  });
  it("sin usage → 0 (fallback heurístico no factura)", () => {
    expect(costOf(null)).toBe(0);
    expect(costOf(undefined)).toBe(0);
  });
  it("el presupuesto por defecto deja holgura sobre el uso esperado (~$8-12/mes)", () => {
    expect(DEFAULT_MONTHLY_BUDGET_USD).toBeGreaterThanOrEqual(20);
  });
});
