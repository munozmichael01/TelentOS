/**
 * Motor de generación de líneas de nómina — pack generic.
 *
 * Contrato completo en handoff/spec §7.2.1.
 * net = gross, employer_cost = gross (pack generic: sin retenciones ni cargas).
 */
import { createAdminClient } from "@/lib/supabase/server";
import {
  computeEmployeeResult,
  derivePeriod,
  type EmployeeInput,
  type ProfileInput,
  type ComponentInput,
  type PaymentInput,
} from "@/lib/payroll/compute";

export type GenerateIncident = {
  employee_id: string;
  name: string;
  reason: string;
};

export type GenerateResult = {
  lineCount: number;
  incidents: GenerateIncident[];
  gross: number;
};

export async function generatePayRunLines(
  runId: string,
  companyId: string,
  generatedBy = "Sistema",
): Promise<GenerateResult> {
  const db = createAdminClient();

  const { data: run } = await db
    .from("pay_runs")
    .select("period_month, currency")
    .eq("id", runId)
    .maybeSingle();
  if (!run) throw new Error("Corrida no encontrada");

  // Derive period boundaries (pure)
  const period = derivePeriod(run.period_month);
  const { period_end } = period;

  // Regeneration: reset any previously included compensation_records, then delete lines
  const { data: existingLines } = await db
    .from("pay_run_lines")
    .select("id")
    .eq("pay_run_id", runId);

  if (existingLines && existingLines.length > 0) {
    await db
      .from("compensation_records")
      .update({ novedad_status: "pending", pay_run_id: null })
      .eq("pay_run_id", runId)
      .eq("novedad_status", "included");
    await db.from("pay_run_lines").delete().eq("pay_run_id", runId);
  }

  // Active employees whose start_date is within or before the period
  const { data: employees } = await db
    .from("employees")
    .select("id, name, start_date")
    .eq("company_id", companyId)
    .eq("status", "active")
    .or(`start_date.is.null,start_date.lte.${period_end}`);

  // All profiles for this company
  const { data: allProfiles } = await db
    .from("pay_profiles")
    .select("*")
    .eq("company_id", companyId);

  const profileIds = (allProfiles ?? []).map((p) => p.id);

  // Active components for those profiles
  const { data: allComponents } = profileIds.length
    ? await db
        .from("pay_components")
        .select("*")
        .in("pay_profile_id", profileIds)
        .eq("active", true)
        .order("order_index")
    : { data: [] };

  // Pending bank payments (compensation_records of type payment)
  const { data: pendingPayments } = await db
    .from("compensation_records")
    .select("id, employee_id, balance_minutes")
    .eq("company_id", companyId)
    .eq("compensation_type", "payment")
    .eq("novedad_status", "pending");

  const incidents: GenerateIncident[] = [];
  let totalGross = 0;
  let employeeCount = 0;
  const includedRecordIds: string[] = [];

  const profileList = (allProfiles ?? []) as ProfileInput[];
  const componentList = (allComponents ?? []) as ComponentInput[];
  const paymentList = (pendingPayments ?? []) as PaymentInput[];

  for (const emp of (employees ?? []) as EmployeeInput[]) {
    const result = computeEmployeeResult(
      emp,
      profileList,
      componentList,
      paymentList,
      period,
      run.currency,
    );

    if (result.kind === "incident") {
      incidents.push({ employee_id: emp.id, name: emp.name, reason: result.reason });
      continue;
    }

    // Generic pack: net = gross, employer_cost = gross (no deductions or employer charges)
    const { data: line } = await db
      .from("pay_run_lines")
      .insert({
        pay_run_id: runId,
        employee_id: emp.id,
        gross: result.gross,
        net: result.net,
        employer_cost: result.employer_cost,
        has_bank_issue: result.has_bank_issue,
        has_salary_change: result.has_salary_change,
      })
      .select()
      .single();

    if (line) {
      await db
        .from("pay_run_line_items")
        .insert(result.items.map((item) => ({ ...item, line_id: line.id })));
      totalGross += result.gross;
      employeeCount++;
      includedRecordIds.push(...result.consumedPaymentIds);
    }
  }

  // Mark bank payments as included
  if (includedRecordIds.length > 0) {
    await db
      .from("compensation_records")
      .update({ novedad_status: "included", pay_run_id: runId })
      .in("id", includedRecordIds);
  }

  const grossR = Math.round(totalGross * 100) / 100;

  // Update pay_run totals
  await db
    .from("pay_runs")
    .update({
      gross: grossR,
      net: grossR,
      employer_cost: grossR,
      employee_count: employeeCount,
    })
    .eq("id", runId);

  // Audit log
  const incidentNote =
    incidents.length > 0
      ? ` ${incidents.length} sin línea: ${incidents.map((i) => i.name).join(", ")}.`
      : "";
  await db.from("pay_run_audit_log").insert({
    pay_run_id: runId,
    text: `Líneas generadas: ${employeeCount} empleado${employeeCount !== 1 ? "s" : ""}.${incidentNote}`,
    who: generatedBy,
  });

  return { lineCount: employeeCount, incidents, gross: grossR };
}
