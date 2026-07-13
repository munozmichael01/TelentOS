import { NextResponse } from "next/server";
import { requireApiRole, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";
import { computeRunFindings, type ReviewLineInput } from "@/lib/payroll/copilot";
import { runPayrollCopilotSummary } from "@/agents/agent-payroll-copilot";

/**
 * Payroll copilot — revisión pre-aprobación de una corrida (agentes v2 §3 P-A).
 * Detectores deterministas + resumen redactado (LLM con fallback). Solo LEE y
 * señala; jamás modifica importes ni estados. Superficie: botón "Anotar corrida"
 * en pay-run-detail (S1 → S2 del sistema de superficies).
 */

type LineRow = {
  employee_id: string;
  gross: number;
  has_salary_change: boolean;
  has_bank_issue: boolean;
  employees: { name: string } | null;
};

const toInput = (rows: LineRow[]): ReviewLineInput[] =>
  rows.map((r) => ({
    employee_id: r.employee_id,
    employee_name: r.employees?.name ?? "Empleado",
    gross: Number(r.gross),
    has_salary_change: r.has_salary_change,
    has_bank_issue: r.has_bank_issue,
  }));

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const { companyId, error } = await requireApiRole(["owner", "hr_admin"]);
  if (error) return error;

  const db = createAdminClient();

  const { data: run } = await db
    .from("pay_runs")
    .select("id, period_month, period_label, entity_name, status")
    .eq("id", params.id)
    .eq("company_id", companyId!)
    .maybeSingle();
  if (!run) return jsonError("Corrida no encontrada", 404);

  const [{ data: currentRows }, { data: prevRun }] = await Promise.all([
    db
      .from("pay_run_lines")
      .select("employee_id, gross, has_salary_change, has_bank_issue, employees!inner(name)")
      .eq("pay_run_id", run.id),
    db
      .from("pay_runs")
      .select("id, period_label, period_month")
      .eq("company_id", companyId!)
      .eq("entity_name", run.entity_name)
      .lt("period_month", run.period_month)
      .neq("status", "draft")
      .order("period_month", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  let previousLines: ReviewLineInput[] | null = null;
  if (prevRun) {
    const { data: prevRows } = await db
      .from("pay_run_lines")
      .select("employee_id, gross, has_salary_change, has_bank_issue, employees!inner(name)")
      .eq("pay_run_id", prevRun.id);
    previousLines = toInput((prevRows ?? []) as unknown as LineRow[]);
  }

  const currentLines = toInput((currentRows ?? []) as unknown as LineRow[]);

  const { data: activeEmployees } = await db
    .from("employees")
    .select("id, name")
    .eq("company_id", companyId!)
    .eq("status", "active");
  const withLine = new Set(currentLines.map((l) => l.employee_id));
  const activeEmployeesWithoutLine = ((activeEmployees ?? []) as { id: string; name: string }[]).filter(
    (e) => !withLine.has(e.id),
  );

  const findings = computeRunFindings({
    currentLines,
    previousLines,
    previousPeriodLabel: prevRun?.period_label ?? null,
    activeEmployeesWithoutLine,
  });

  const summary = await runPayrollCopilotSummary({
    companyId: companyId!,
    periodLabel: run.period_label,
    findings,
  });

  return NextResponse.json({
    findings,
    summary: summary.output.summary,
    summary_source: summary.status, // "ok" = IA · "fallback" = heurística (badge de procedencia)
    compared_to: prevRun ? { period_label: prevRun.period_label, period_month: prevRun.period_month } : null,
  });
}
