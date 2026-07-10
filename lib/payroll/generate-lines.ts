/**
 * Motor de generación de líneas de nómina — pack generic.
 *
 * Contrato completo en handoff/spec §7.2.1.
 * net = gross, employer_cost = gross (pack generic: sin retenciones ni cargas).
 */
import { createAdminClient } from "@/lib/supabase/server";

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

  // Derive period boundaries
  const [year, monthNum] = run.period_month.split("-").map(Number);
  const period_start = `${run.period_month}-01`;
  const lastDayDate = new Date(year, monthNum, 0); // day 0 of next month = last day
  const period_end = lastDayDate.toISOString().split("T")[0];
  const totalDays = lastDayDate.getDate();

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

  for (const emp of employees ?? []) {
    const empProfiles = (allProfiles ?? []).filter(
      (p) => p.employee_id === emp.id,
    );

    // Vigent profile = covers the LAST DAY of the period (rule 2)
    const vigentProfile =
      empProfiles
        .filter(
          (p) =>
            p.effective_from <= period_end &&
            (p.effective_to === null || p.effective_to >= period_end),
        )
        .sort((a, b) =>
          b.effective_from.localeCompare(a.effective_from),
        )[0] ?? null;

    if (!vigentProfile) {
      incidents.push({
        employee_id: emp.id,
        name: emp.name,
        reason: "Sin perfil salarial vigente",
      });
      continue;
    }

    // Rule 6: currency must match the run
    if (vigentProfile.currency !== run.currency) {
      incidents.push({
        employee_id: emp.id,
        name: emp.name,
        reason: `Moneda distinta (${vigentProfile.currency} ≠ ${run.currency})`,
      });
      continue;
    }

    // Rule 8: V1 only supports monthly
    if (vigentProfile.frequency !== "monthly") {
      incidents.push({
        employee_id: emp.id,
        name: emp.name,
        reason: `Frecuencia no soportada (${vigentProfile.frequency})`,
      });
      continue;
    }

    // Flag: salary change within the period (rule 2)
    const hasSalaryChange = empProfiles.some(
      (p) =>
        p.effective_from > period_start && p.effective_from <= period_end,
    );

    // Flag: missing bank details for transfer payments
    const hasBankIssue =
      vigentProfile.payment_method === "transfer" &&
      (!vigentProfile.bank_name || !vigentProfile.bank_account_last4);

    // Rule 3: prorate if employee started mid-period
    const startDate = emp.start_date as string | null;
    const needsProration =
      startDate !== null &&
      startDate > period_start &&
      startDate <= period_end;

    let baseSalaryAmt = vigentProfile.base_salary;
    let salaryQtyLabel: string | null = null;

    if (needsProration) {
      const startDayNum = new Date(startDate + "T00:00:00").getDate();
      const daysActive = totalDays - startDayNum + 1;
      baseSalaryAmt =
        Math.round(
          (vigentProfile.base_salary * daysActive) / totalDays * 100,
        ) / 100;
      salaryQtyLabel = `${daysActive}/${totalDays} días`;
    }

    // Build line items
    const lineItems: Array<{
      category: string;
      label: string;
      amount: number;
      quantity_label: string | null;
      order_index: number;
    }> = [
      {
        category: "earning",
        label: "Salario base",
        amount: baseSalaryAmt,
        quantity_label: salaryQtyLabel,
        order_index: 0,
      },
    ];

    let lineGross = baseSalaryAmt;
    let orderIdx = 1;

    // Fixed and variable (with amount) components — not conditional
    const components = (allComponents ?? []).filter(
      (c) => c.pay_profile_id === vigentProfile.id,
    );
    for (const comp of components) {
      if (comp.component_type === "conditional") continue;
      if (comp.component_type === "variable" && comp.amount === null) continue;
      const amt = (comp.amount as number) ?? 0;
      lineGross += amt;
      lineItems.push({
        category: "earning",
        label: comp.name,
        amount: amt,
        quantity_label: null,
        order_index: orderIdx++,
      });
    }

    // Pending bank payments for this employee
    const empPayments = (pendingPayments ?? []).filter(
      (p) => p.employee_id === emp.id,
    );
    for (const payment of empPayments) {
      const absMin = Math.abs(payment.balance_minutes as number);
      const hrs = Math.floor(absMin / 60);
      const mins = absMin % 60;
      const hLabel = mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
      // Generic: hourly rate = base / 160h per month
      const hourlyRate = vigentProfile.base_salary / 160;
      const payAmt = Math.round(hourlyRate * (absMin / 60) * 100) / 100;
      lineGross += payAmt;
      lineItems.push({
        category: "earning",
        label: `Horas compensadas (${hLabel})`,
        amount: payAmt,
        quantity_label: hLabel,
        order_index: orderIdx++,
      });
      includedRecordIds.push(payment.id as string);
    }

    const lineGrossR = Math.round(lineGross * 100) / 100;

    // Generic pack: net = gross, employer_cost = gross (no deductions or employer charges)
    const { data: line } = await db
      .from("pay_run_lines")
      .insert({
        pay_run_id: runId,
        employee_id: emp.id,
        gross: lineGrossR,
        net: lineGrossR,
        employer_cost: lineGrossR,
        has_bank_issue: hasBankIssue,
        has_salary_change: hasSalaryChange,
      })
      .select()
      .single();

    if (line) {
      await db
        .from("pay_run_line_items")
        .insert(lineItems.map((item) => ({ ...item, line_id: line.id })));
      totalGross += lineGrossR;
      employeeCount++;
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
