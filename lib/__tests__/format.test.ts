import { describe, it, expect } from "vitest";
import { formatMoney } from "@/lib/format";

describe("formatMoney (spec payroll §1.1: moneda por registro)", () => {
  it("USD por defecto, sin decimales", () => expect(formatMoney(3100)).toBe("$3,100"));
  it("EUR explícito", () => expect(formatMoney(1700, "EUR")).toBe("€1,700"));
  it("VES no rompe (pack VE)", () => expect(formatMoney(500, "VES")).toContain("500"));
  it("decimales opcionales", () => expect(formatMoney(1234.5, "USD", 2)).toBe("$1,234.50"));
  it("moneda inválida degrada legible, no lanza", () =>
    expect(formatMoney(100, "XXX_BAD")).toBe("XXX_BAD 100"));
});
