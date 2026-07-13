import { describe, it, expect } from "vitest";
import { computeRunFindings, fallbackSummary, type ReviewLineInput } from "@/lib/payroll/copilot";

const line = (over: Partial<ReviewLineInput>): ReviewLineInput => ({
  employee_id: "e1",
  employee_name: "Empleado",
  gross: 3000,
  has_salary_change: false,
  has_bank_issue: false,
  ...over,
});

describe("computeRunFindings — detectores del payroll copilot (nunca tocan importes)", () => {
  it("variación >20% vs corrida anterior → warning con delta y cruce a cambio salarial", () => {
    const findings = computeRunFindings({
      currentLines: [line({ gross: 4020, has_salary_change: true })],
      previousLines: [line({ gross: 3000 })],
      previousPeriodLabel: "junio",
      activeEmployeesWithoutLine: [],
    });
    expect(findings).toHaveLength(1);
    expect(findings[0].kind).toBe("variation");
    expect(findings[0].severity).toBe("warning");
    expect(findings[0].data.delta_pct).toBe(34);
    expect(findings[0].text).toContain("coincide con un cambio salarial");
  });

  it("variación dentro del umbral → sin finding; umbral configurable", () => {
    const base = {
      currentLines: [line({ gross: 3300 })],
      previousLines: [line({ gross: 3000 })],
      activeEmployeesWithoutLine: [],
    };
    expect(computeRunFindings(base)).toHaveLength(0); // 10% < 20%
    expect(computeRunFindings({ ...base, variationThreshold: 0.05 })).toHaveLength(1);
  });

  it("cambio salarial sin variación fuerte → nota propia (sin duplicar con variation)", () => {
    const findings = computeRunFindings({
      currentLines: [line({ gross: 3050, has_salary_change: true })],
      previousLines: [line({ gross: 3000 })],
      activeEmployeesWithoutLine: [],
    });
    expect(findings.map((f) => f.kind)).toEqual(["salary_change"]);
  });

  it("nuevo en nómina e desaparecido de la anterior", () => {
    const findings = computeRunFindings({
      currentLines: [line({ employee_id: "nuevo", employee_name: "Nora" })],
      previousLines: [line({ employee_id: "viejo", employee_name: "Víctor" })],
      previousPeriodLabel: "junio",
      activeEmployeesWithoutLine: [],
    });
    const kinds = findings.map((f) => f.kind).sort();
    expect(kinds).toEqual(["missing_from_run", "new_in_run"]);
    expect(findings.find((f) => f.kind === "missing_from_run")?.severity).toBe("warning");
    expect(findings.find((f) => f.kind === "new_in_run")?.severity).toBe("info");
  });

  it("primera corrida (sin anterior): no marca a todos como nuevos", () => {
    const findings = computeRunFindings({
      currentLines: [line({}), line({ employee_id: "e2", employee_name: "Bea" })],
      previousLines: null,
      activeEmployeesWithoutLine: [],
    });
    expect(findings.filter((f) => f.kind === "new_in_run")).toHaveLength(0);
  });

  it("banco incompleto y activo sin línea → warnings; orden: warnings antes que infos", () => {
    const findings = computeRunFindings({
      currentLines: [
        line({ employee_id: "nuevo", employee_name: "Ana" }),
        line({ employee_id: "e3", employee_name: "Zoe", has_bank_issue: true }),
      ],
      previousLines: [line({ employee_id: "e3", employee_name: "Zoe", gross: 3000 })],
      activeEmployeesWithoutLine: [{ id: "e9", name: "Leo" }],
    });
    expect(findings[0].severity).toBe("warning");
    expect(findings[findings.length - 1].severity).toBe("info");
    expect(findings.some((f) => f.kind === "bank_issue" && f.employee_name === "Zoe")).toBe(true);
    expect(findings.some((f) => f.kind === "no_profile" && f.employee_name === "Leo")).toBe(true);
  });
});

describe("fallbackSummary", () => {
  it("sin findings → mensaje limpio", () => {
    expect(fallbackSummary([])).toContain("Sin avisos");
  });
  it("cuenta avisos/notas y prioriza el primer warning", () => {
    const findings = computeRunFindings({
      currentLines: [line({ gross: 4500, employee_name: "Elena" })],
      previousLines: [line({ gross: 3000, employee_name: "Elena" })],
      activeEmployeesWithoutLine: [],
    });
    const s = fallbackSummary(findings);
    expect(s).toContain("1 aviso");
    expect(s).toContain("Elena");
  });
});
