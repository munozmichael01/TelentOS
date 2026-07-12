import { describe, it, expect } from "vitest";
import {
  derivePeriod,
  selectVigentProfile,
  hasSalaryChangeInPeriod,
  computeProration,
  computeBankPayment,
  computeEmployeeResult,
  type ProfileInput,
  type ComponentInput,
  type PaymentInput,
  type EmployeeInput,
} from "@/lib/payroll/compute";

// Helpers de fixtures — perfil mensual USD por transferencia con banco completo.
function profile(over: Partial<ProfileInput> = {}): ProfileInput {
  return {
    id: "p1",
    employee_id: "e1",
    base_salary: 3000,
    currency: "USD",
    frequency: "monthly",
    effective_from: "2026-01-01",
    effective_to: null,
    payment_method: "transfer",
    bank_name: "Banco",
    bank_account_last4: "1234",
    ...over,
  };
}
function emp(over: Partial<EmployeeInput> = {}): EmployeeInput {
  return { id: "e1", name: "Empleado", start_date: null, ...over };
}
const JUN = derivePeriod("2026-06"); // 30 días
const JUL = derivePeriod("2026-07"); // 31 días

describe("derivePeriod (spec §7.2.1 regla 3: días naturales reales)", () => {
  it("junio → 30 días, límites correctos", () => {
    expect(JUN).toEqual({ period_start: "2026-06-01", period_end: "2026-06-30", totalDays: 30 });
  });
  it("julio → 31 días", () => expect(JUL.totalDays).toBe(31));
  it("febrero bisiesto (2028) → 29 días", () =>
    expect(derivePeriod("2028-02").totalDays).toBe(29));
  it("febrero no bisiesto (2026) → 28 días", () =>
    expect(derivePeriod("2026-02").period_end).toBe("2026-02-28"));
});

describe("selectVigentProfile (AC-2d: perfil vigente en el período, no el actual)", () => {
  it("elige el que cubre el último día del período", () => {
    const viejo = profile({ id: "old", effective_from: "2026-01-01", effective_to: "2026-05-31" });
    const nuevo = profile({ id: "new", effective_from: "2026-06-01", effective_to: null });
    expect(selectVigentProfile([viejo, nuevo], JUN.period_end)?.id).toBe("new");
  });
  it("un perfil futuro (empieza después del período) no es vigente", () => {
    const futuro = profile({ id: "fut", effective_from: "2026-07-01" });
    expect(selectVigentProfile([futuro], JUN.period_end)).toBeNull();
  });
  it("un perfil cerrado antes del período no es vigente", () => {
    const cerrado = profile({ effective_from: "2026-01-01", effective_to: "2026-04-30" });
    expect(selectVigentProfile([cerrado], JUN.period_end)).toBeNull();
  });
  it("sin perfiles → null", () => expect(selectVigentProfile([], JUN.period_end)).toBeNull());
});

describe("computeProration (AC-2e: alta a mitad de período)", () => {
  it("alta día 15 de julio (31 días), base 3.100 → 1.700 y '17/31 días'", () => {
    const r = computeProration(3100, "2026-07-15", JUL);
    expect(r.amount).toBe(1700);
    expect(r.quantityLabel).toBe("17/31 días");
  });
  it("alta anterior al período → sin prorrateo (importe completo)", () => {
    const r = computeProration(3000, "2026-01-01", JUN);
    expect(r).toEqual({ amount: 3000, quantityLabel: null });
  });
  it("sin start_date → sin prorrateo", () => {
    expect(computeProration(3000, null, JUN)).toEqual({ amount: 3000, quantityLabel: null });
  });
  it("alta el primer día del período → sin prorrateo (mes completo)", () => {
    // start_date == period_start no dispara prorrateo (regla: start > period_start)
    expect(computeProration(3000, "2026-06-01", JUN).quantityLabel).toBeNull();
  });
  it("alta el último día → 1 día, redondeo a 2 decimales", () => {
    const r = computeProration(3000, "2026-06-30", JUN);
    expect(r.quantityLabel).toBe("1/30 días");
    expect(r.amount).toBe(100); // 3000 * 1/30
  });
});

describe("computeBankPayment (line item de banco de horas, generic: base/160h)", () => {
  it("6h con base 3.200 → 120.00", () => {
    // 3200/160 = 20/h → 6h = 120
    expect(computeBankPayment(3200, 360)).toEqual({ amount: 120, hLabel: "6h" });
  });
  it("etiqueta con minutos", () =>
    expect(computeBankPayment(3200, 90).hLabel).toBe("1h 30m"));
  it("balance negativo se toma en valor absoluto", () =>
    expect(computeBankPayment(3200, -360).amount).toBe(120));
});

describe("hasSalaryChangeInPeriod (AC-2g)", () => {
  it("cambio con vigencia dentro del período → true", () => {
    const a = profile({ id: "a", effective_from: "2026-01-01", effective_to: "2026-06-14" });
    const b = profile({ id: "b", effective_from: "2026-06-15" });
    expect(hasSalaryChangeInPeriod([a, b], JUN)).toBe(true);
  });
  it("sin cambios en el período → false", () => {
    const a = profile({ effective_from: "2026-01-01" });
    expect(hasSalaryChangeInPeriod([a], JUN)).toBe(false);
  });
  it("cambio con vigencia el primer día del período no cuenta (regla: > period_start)", () => {
    const a = profile({ effective_from: "2026-06-01" });
    expect(hasSalaryChangeInPeriod([a], JUN)).toBe(false);
  });
});

describe("computeEmployeeResult — incidencias (reglas 1, 6, 8)", () => {
  it("activo sin perfil vigente → incidencia, no línea", () => {
    const r = computeEmployeeResult(emp(), [], [], [], JUN, "USD");
    expect(r).toEqual({ kind: "incident", reason: "Sin perfil salarial vigente" });
  });
  it("AC-2h: perfil en VES en corrida USD → incidencia 'moneda distinta', sin conversión", () => {
    const r = computeEmployeeResult(emp(), [profile({ currency: "VES" })], [], [], JUN, "USD");
    expect(r.kind).toBe("incident");
    if (r.kind === "incident") expect(r.reason).toContain("Moneda distinta");
  });
  it("frecuencia biweekly → incidencia 'frecuencia no soportada'", () => {
    const r = computeEmployeeResult(emp(), [profile({ frequency: "biweekly" })], [], [], JUN, "USD");
    expect(r.kind).toBe("incident");
    if (r.kind === "incident") expect(r.reason).toContain("Frecuencia no soportada");
  });
});

describe("computeEmployeeResult — línea (AC-2b: gross = suma de items; net = gross)", () => {
  it("solo salario base: gross = base, net = employer_cost = gross", () => {
    const r = computeEmployeeResult(emp(), [profile({ base_salary: 3000 })], [], [], JUN, "USD");
    expect(r.kind).toBe("line");
    if (r.kind !== "line") return;
    expect(r.gross).toBe(3000);
    expect(r.net).toBe(3000);
    expect(r.employer_cost).toBe(3000);
    expect(r.items).toHaveLength(1);
    expect(r.items[0].label).toBe("Salario base");
  });

  it("base + componente fijo + pago de banco: gross = suma exacta de los 3 items", () => {
    const components: ComponentInput[] = [
      { pay_profile_id: "p1", name: "Bono", component_type: "fixed", amount: 500 },
      { pay_profile_id: "p1", name: "Comisión sin importe", component_type: "variable", amount: null },
      { pay_profile_id: "p1", name: "Objetivo anual", component_type: "conditional", amount: 999 },
    ];
    const payments: PaymentInput[] = [{ id: "pay1", employee_id: "e1", balance_minutes: 360 }];
    const r = computeEmployeeResult(emp(), [profile({ base_salary: 3200 })], components, payments, JUN, "USD");
    expect(r.kind).toBe("line");
    if (r.kind !== "line") return;
    // 3200 (base) + 500 (fijo) + 120 (6h @ 3200/160) = 3820; variable-sin-importe y conditional NO entran
    expect(r.items.map((i) => i.label)).toEqual([
      "Salario base",
      "Bono",
      "Horas compensadas (6h)",
    ]);
    expect(r.gross).toBe(3820);
    expect(r.gross).toBe(r.items.reduce((s, i) => s + i.amount, 0));
    expect(r.consumedPaymentIds).toEqual(["pay1"]);
  });

  it("AC-2g: la línea del cambio intra-período usa el perfil nuevo y marca has_salary_change", () => {
    const viejo = profile({ id: "old", base_salary: 3000, effective_from: "2026-01-01", effective_to: "2026-06-14" });
    const nuevo = profile({ id: "new", base_salary: 3500, effective_from: "2026-06-15", effective_to: null });
    const r = computeEmployeeResult(emp(), [viejo, nuevo], [], [], JUN, "USD");
    expect(r.kind).toBe("line");
    if (r.kind !== "line") return;
    expect(r.gross).toBe(3500); // perfil nuevo, sin prorrateo de tramos en V1
    expect(r.has_salary_change).toBe(true);
  });

  it("has_bank_issue: transfer sin datos bancarios → true", () => {
    const r = computeEmployeeResult(emp(), [profile({ bank_account_last4: null })], [], [], JUN, "USD");
    if (r.kind !== "line") throw new Error("esperaba línea");
    expect(r.has_bank_issue).toBe(true);
  });

  it("AC-2f (snapshot): el importe sale del perfil de entrada, no de un estado externo", () => {
    // Regenerar con un perfil de importe distinto produce otro gross; una línea ya
    // generada no se recomputa (el motor borra y reconstruye en regeneración).
    const antes = computeEmployeeResult(emp(), [profile({ base_salary: 3000 })], [], [], JUN, "USD");
    const despues = computeEmployeeResult(emp(), [profile({ base_salary: 4000 })], [], [], JUN, "USD");
    if (antes.kind !== "line" || despues.kind !== "line") throw new Error("esperaba líneas");
    expect(antes.gross).toBe(3000);
    expect(despues.gross).toBe(4000);
  });
});

describe("AC-2a (caso canónico): 3 con perfil + 1 sin perfil + 1 pago de banco", () => {
  it("genera 3 líneas, 1 incidencia, y el pago aparece como item en su empleado", () => {
    const employees = [emp({ id: "e1", name: "Ana" }), emp({ id: "e2", name: "Ben" }), emp({ id: "e3", name: "Cid" }), emp({ id: "e4", name: "Sin perfil" })];
    const profiles = [
      profile({ id: "pa", employee_id: "e1", base_salary: 3000 }),
      profile({ id: "pb", employee_id: "e2", base_salary: 2000 }),
      profile({ id: "pc", employee_id: "e3", base_salary: 3200 }),
      // e4 no tiene perfil
    ];
    const payments: PaymentInput[] = [{ id: "pay1", employee_id: "e3", balance_minutes: 360 }];

    const results = employees.map((e) =>
      computeEmployeeResult(e, profiles, [], payments, JUN, "USD"),
    );
    const lines = results.filter((r) => r.kind === "line");
    const incidents = results.filter((r) => r.kind === "incident");

    expect(lines).toHaveLength(3);
    expect(incidents).toHaveLength(1);

    const cid = results[2];
    if (cid.kind !== "line") throw new Error("Cid debería tener línea");
    expect(cid.items.some((i) => i.label.startsWith("Horas compensadas"))).toBe(true);
    expect(cid.gross).toBe(3320); // 3200 + 120
    expect(cid.consumedPaymentIds).toEqual(["pay1"]);

    // Total de la corrida = suma de líneas (AC-2b a nivel corrida)
    const runGross = lines.reduce((s, r) => (r.kind === "line" ? s + r.gross : s), 0);
    expect(runGross).toBe(3000 + 2000 + 3320);
  });
});
