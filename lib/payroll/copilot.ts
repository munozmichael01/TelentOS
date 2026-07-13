/**
 * Payroll copilot — detectores deterministas de la revisión pre-aprobación.
 * (Agentes v2 §3 P-A: "el flujo real de nómina es revisar 40 líneas buscando la
 * que está mal"). Puro y testeable, como compute.ts: recibe datos ya cargados,
 * NUNCA toca importes — solo señala. El LLM (agents/agent-payroll-copilot)
 * redacta el resumen; estos textos deterministas son la base y el fallback.
 */

export type ReviewLineInput = {
  employee_id: string;
  employee_name: string;
  gross: number;
  has_salary_change: boolean;
  has_bank_issue: boolean;
};

export type ReviewFinding = {
  kind:
    | "variation" // bruto varía > umbral vs corrida anterior
    | "new_in_run" // primera nómina del empleado (no estaba en la anterior)
    | "missing_from_run" // estaba en la anterior y no está en esta
    | "salary_change" // cambio salarial intra-período (flag del motor)
    | "bank_issue" // transferencia sin datos bancarios completos
    | "no_profile"; // empleado activo sin línea (sin perfil vigente)
  severity: "warning" | "info";
  employee_id: string | null;
  employee_name: string | null;
  text: string; // determinista y legible — base del redactor y fallback
  data: Record<string, unknown>;
};

const pct = (from: number, to: number) => Math.round(((to - from) / from) * 100);
const money = (n: number) => n.toLocaleString("es-ES");

export function computeRunFindings(opts: {
  currentLines: ReviewLineInput[];
  /** null = no existe corrida anterior comparable (primera corrida) */
  previousLines: ReviewLineInput[] | null;
  previousPeriodLabel?: string | null;
  activeEmployeesWithoutLine: { id: string; name: string }[];
  /** Umbral de variación de bruto (fracción). Default 0.2 = 20%. */
  variationThreshold?: number;
}): ReviewFinding[] {
  const {
    currentLines,
    previousLines,
    previousPeriodLabel,
    activeEmployeesWithoutLine,
    variationThreshold = 0.2,
  } = opts;

  const findings: ReviewFinding[] = [];
  const prevLabel = previousPeriodLabel ?? "la corrida anterior";
  const prevByEmployee = new Map((previousLines ?? []).map((l) => [l.employee_id, l]));

  for (const line of currentLines) {
    const prev = prevByEmployee.get(line.employee_id);

    // Variación de bruto vs corrida anterior (con cruce al cambio salarial)
    if (prev && prev.gross > 0) {
      const delta = (line.gross - prev.gross) / prev.gross;
      if (Math.abs(delta) > variationThreshold) {
        const dir = delta > 0 ? "+" : "";
        const causa = line.has_salary_change
          ? " — coincide con un cambio salarial con vigencia en este período"
          : "";
        findings.push({
          kind: "variation",
          severity: "warning",
          employee_id: line.employee_id,
          employee_name: line.employee_name,
          text: `El bruto de ${line.employee_name} pasó de ${money(prev.gross)} a ${money(line.gross)} (${dir}${pct(prev.gross, line.gross)}% vs ${prevLabel})${causa}.`,
          data: { previous_gross: prev.gross, gross: line.gross, delta_pct: pct(prev.gross, line.gross), has_salary_change: line.has_salary_change },
        });
      } else if (line.has_salary_change) {
        // Cambio salarial sin variación fuerte: aviso propio (no duplicar si ya hay variation)
        findings.push({
          kind: "salary_change",
          severity: "info",
          employee_id: line.employee_id,
          employee_name: line.employee_name,
          text: `${line.employee_name} tiene un cambio salarial con vigencia dentro del período — revisa si la línea necesita ajuste manual.`,
          data: { gross: line.gross },
        });
      }
    } else if (line.has_salary_change) {
      findings.push({
        kind: "salary_change",
        severity: "info",
        employee_id: line.employee_id,
        employee_name: line.employee_name,
        text: `${line.employee_name} tiene un cambio salarial con vigencia dentro del período — revisa si la línea necesita ajuste manual.`,
        data: { gross: line.gross },
      });
    }

    // Primera nómina (solo si hay corrida anterior con la que comparar)
    if (previousLines && !prev) {
      findings.push({
        kind: "new_in_run",
        severity: "info",
        employee_id: line.employee_id,
        employee_name: line.employee_name,
        text: `Primera nómina de ${line.employee_name} (no estaba en ${prevLabel}) — verifica base y prorrateo.`,
        data: { gross: line.gross },
      });
    }

    // Datos bancarios incompletos
    if (line.has_bank_issue) {
      findings.push({
        kind: "bank_issue",
        severity: "warning",
        employee_id: line.employee_id,
        employee_name: line.employee_name,
        text: `${line.employee_name} cobra por transferencia y le faltan datos bancarios — la línea no es pagadera.`,
        data: {},
      });
    }
  }

  // Estaban en la anterior y no están en esta
  if (previousLines) {
    const currentIds = new Set(currentLines.map((l) => l.employee_id));
    for (const prev of previousLines) {
      if (!currentIds.has(prev.employee_id)) {
        findings.push({
          kind: "missing_from_run",
          severity: "warning",
          employee_id: prev.employee_id,
          employee_name: prev.employee_name,
          text: `${prev.employee_name} estaba en ${prevLabel} y no está en esta corrida — confirma si es baja o una omisión.`,
          data: { previous_gross: prev.gross },
        });
      }
    }
  }

  // Activos sin línea (sin perfil vigente)
  for (const emp of activeEmployeesWithoutLine) {
    findings.push({
      kind: "no_profile",
      severity: "warning",
      employee_id: emp.id,
      employee_name: emp.name,
      text: `${emp.name} está en activo y no tiene línea en la corrida (sin perfil salarial vigente).`,
      data: {},
    });
  }

  // Warnings primero, estable por nombre
  return findings.sort((a, b) =>
    a.severity === b.severity
      ? (a.employee_name ?? "").localeCompare(b.employee_name ?? "")
      : a.severity === "warning"
        ? -1
        : 1,
  );
}

/** Resumen determinista — fallback del redactor LLM y baseline de evaluación. */
export function fallbackSummary(findings: ReviewFinding[]): string {
  if (findings.length === 0) return "Sin avisos: la corrida no presenta variaciones ni incidencias frente a la anterior.";
  const warnings = findings.filter((f) => f.severity === "warning");
  const first = warnings[0] ?? findings[0];
  const parts = [
    `${warnings.length} aviso${warnings.length !== 1 ? "s" : ""} y ${findings.length - warnings.length} nota${findings.length - warnings.length !== 1 ? "s" : ""}.`,
  ];
  if (first?.employee_name) parts.push(`Empieza por ${first.employee_name}.`);
  return parts.join(" ");
}
