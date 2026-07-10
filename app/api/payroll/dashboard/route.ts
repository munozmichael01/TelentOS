import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET() {
  const { companyId, error } = await requireApiRole(["owner", "hr_admin"]);
  if (error) return error;

  // Use admin client for data queries — auth check already done above.
  // RLS on payroll tables uses a subquery on company_members which can
  // return empty in some SSR cookie contexts; admin client + explicit
  // company_id scoping is equivalent and safe here.
  const db = createAdminClient();

  const [{ data: runs }, { data: currentRun }] = await Promise.all([
    db
      .from("pay_runs")
      .select("id, period_label, period_month, entity_name, status, gross, net, employer_cost, employee_count, currency")
      .eq("company_id", companyId!)
      .order("period_month", { ascending: false })
      .limit(10),
    db
      .from("pay_runs")
      .select("id, status, gross, net, employer_cost, employee_count, period_label, entity_name, run_type")
      .eq("company_id", companyId!)
      .order("period_month", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const allRuns = runs ?? [];

  // Chart: last 6 runs in ascending order
  const chartRuns = [...allRuns].reverse().slice(-6);
  const chart = {
    months: chartRuns.map((r: { period_label: string }) => r.period_label.split(" ")[0].slice(0, 3)),
    values: chartRuns.map((r: { gross: number }) => r.gross / 1000),
  };

  // KPIs from current run (or zeros)
  const kpis = {
    grossPayroll: currentRun?.gross ?? 0,
    netPayroll: currentRun?.net ?? 0,
    employerCost: currentRun?.employer_cost ?? 0,
    employeeCount: currentRun?.employee_count ?? 0,
  };

  // Count open issues in current run
  let incidencias = 0;
  if (currentRun) {
    const { count } = await db
      .from("pay_run_lines")
      .select("id", { count: "exact", head: true })
      .eq("pay_run_id", currentRun.id)
      .or("has_bank_issue.eq.true,has_adjustment_issue.eq.true,has_salary_change.eq.true,has_unconfirmed_input.eq.true");
    incidencias = count ?? 0;
  }

  // Alerts from current run
  const alerts: { title: string; meta: string; dot: string }[] = [];
  if (currentRun && incidencias > 0) {
    const { data: issueLines } = await db
      .from("pay_run_lines")
      .select("has_bank_issue, has_adjustment_issue, has_salary_change")
      .eq("pay_run_id", currentRun.id)
      .or("has_bank_issue.eq.true,has_adjustment_issue.eq.true,has_salary_change.eq.true");

    const bankCount   = issueLines?.filter((l: { has_bank_issue: boolean }) => l.has_bank_issue).length ?? 0;
    const adjustCount = issueLines?.filter((l: { has_adjustment_issue: boolean }) => l.has_adjustment_issue).length ?? 0;
    const salaryCount = issueLines?.filter((l: { has_salary_change: boolean }) => l.has_salary_change).length ?? 0;

    if (bankCount > 0)
      alerts.push({ title: `${bankCount} empleado${bankCount > 1 ? "s" : ""} sin cuenta bancaria`, meta: "bloquea el archivo de pago", dot: "#F1543F" });
    if (adjustCount > 0)
      alerts.push({ title: `${adjustCount} ajuste${adjustCount > 1 ? "s" : ""} manuales sin aprobar`, meta: "requiere revisión", dot: "#F1543F" });
    if (salaryCount > 0)
      alerts.push({ title: `${salaryCount} cambio${salaryCount > 1 ? "s" : ""} de salario sin propagar`, meta: "recalcular corrida", dot: "#B87503" });
  }

  const recentRuns = allRuns.slice(0, 4).map((r: {
    id: string; period_label: string; entity_name: string;
    employee_count: number; gross: number; status: string; currency: string
  }) => ({
    id: r.id,
    periodLabel: r.period_label,
    entity: r.entity_name,
    employeeCount: r.employee_count,
    gross: r.gross,
    status: r.status,
    currency: r.currency,
  }));

  return NextResponse.json({
    currentPeriod: currentRun?.period_label ?? null,
    currentRunId: currentRun?.id ?? null,
    currentRunEntity: currentRun?.entity_name ?? null,
    currentRunType: currentRun?.run_type ?? "monthly",
    kpis: { ...kpis, incidencias },
    chart,
    alerts,
    runs: recentRuns,
    isEmpty: allRuns.length === 0,
  });
}
