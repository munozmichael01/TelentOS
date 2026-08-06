import type {
  AbsenceRequest, AllowancePolicy, AllowanceType, EmployeeAllowance, AllowanceAdjustmentLog,
} from "@/lib/types";

/**
 * Saldo de bolsas (vacaciones y demás) de un empleado.
 *
 * Estaba calculado en línea dentro de la ficha del empleado del admin. El portal necesita
 * exactamente el mismo número —si el empleado ve 14 días y RR.HH. ve 15, el dato no sirve— así
 * que vive aquí y lo consumen las dos pantallas.
 */

export type PolicyJoin = Pick<
  AllowancePolicy,
  "id" | "name" | "amount" | "cycle_type" | "cycle_start_month" | "expiry_rule" | "expiry_period_months" | "carryover_limit" | "allowance_type_id"
> & { allowance_types: Pick<AllowanceType, "id" | "name" | "unit"> | null };

export type AllowanceRow = Pick<EmployeeAllowance, "id" | "valid_from" | "valid_until"> & {
  allowance_policies: PolicyJoin | null;
};

export type BalanceAbsenceRow = Pick<AbsenceRequest, "status" | "working_days_count"> & {
  absence_types: { deducts_from_allowance: boolean; allowance_type_id: string | null } | null;
};

export type PolicyBalance = {
  allowanceId: string; policyName: string; typeName: string; typeUnit: string;
  /** Bolsa a la que pertenece: es lo que empareja una ausencia con el saldo que descuenta. */
  allowanceTypeId: string | null;
  granted: number; isProrated: boolean;
  carryover: number; manual: number; holidayDeductions: number; expired: number;
  usedApproved: number; usedPending: number;
  available: number; expiryDate: string | null;
  validFrom: string; validUntil: string | null;
};

/** Ciclo vigente de la bolsa. Si aún no se ha alcanzado el mes de inicio, seguimos en el anterior. */
export function cycleFor(cycleStartMonth: number, now = new Date()): { start: Date; end: Date } {
  const m = (cycleStartMonth ?? 1) - 1;
  const currentYear = now.getFullYear();
  const cycleThisYear = new Date(currentYear, m, 1);
  const year = now < cycleThisYear ? currentYear - 1 : currentYear;
  return { start: new Date(year, m, 1), end: new Date(year + 1, m, 0) };
}

export function expiryDate(policy: PolicyJoin | null, cycleEnd: Date): string | null {
  if (!policy || policy.expiry_rule === "never") return null;
  if (policy.expiry_rule === "immediate") return cycleEnd.toISOString().slice(0, 10);
  if (policy.expiry_rule === "after_period" && policy.expiry_period_months) {
    const d = new Date(cycleEnd);
    d.setMonth(d.getMonth() + Number(policy.expiry_period_months));
    return d.toISOString().slice(0, 10);
  }
  return null;
}

export function computeBalances(
  allowanceRows: AllowanceRow[],
  absenceRows: BalanceAbsenceRow[],
  adjustmentLogs: AllowanceAdjustmentLog[],
  now = new Date(),
): PolicyBalance[] {
  return allowanceRows.map((a) => {
    const policy = a.allowance_policies;
    const atype = policy?.allowance_types ?? null;
    const { start: cycleStart, end: cycleEnd } = cycleFor(policy?.cycle_start_month ?? 1, now);

    // Prorrateo: quien entra a mitad de ciclo no devenga el año entero.
    const effectiveStart = new Date(Math.max(cycleStart.getTime(), new Date(a.valid_from + "T00:00:00").getTime()));
    const isProrated = effectiveStart > cycleStart;
    const totalMs = cycleEnd.getTime() - cycleStart.getTime();
    const remainMs = cycleEnd.getTime() - effectiveStart.getTime();
    const amount = Number(policy?.amount ?? 0);
    const granted = isProrated ? Math.ceil(amount * remainMs / totalMs) : amount;

    const logs = adjustmentLogs.filter((l) => l.employee_allowance_id === a.id);
    const sumByType = (type: AllowanceAdjustmentLog["type"]) =>
      logs.filter((l) => l.type === type).reduce((s, l) => s + Number(l.amount), 0);
    const carryover = sumByType("carryover");
    const manual = sumByType("manual_hr");
    const holidayDeductions = sumByType("company_holiday");
    const expired = sumByType("expiry");

    // Solo descuentan las ausencias del tipo de bolsa de esta política.
    const policyTypeId: string | null = policy?.allowance_type_id ?? null;
    const relevant = absenceRows.filter((r) => {
      const rt = r.absence_types;
      return rt?.deducts_from_allowance === true &&
        (policyTypeId === null || rt?.allowance_type_id === policyTypeId);
    });
    const sumDays = (status: string) =>
      relevant.filter((r) => r.status === status).reduce((s, r) => s + Number(r.working_days_count ?? 0), 0);
    const usedApproved = sumDays("approved");
    const usedPending = sumDays("pending");

    // Lo pendiente ya se resta: si no, el empleado pediría dos veces los mismos días.
    const available = Math.max(0, granted + carryover + manual + holidayDeductions + expired - usedApproved - usedPending);

    return {
      allowanceId: a.id, policyName: policy?.name ?? "—", allowanceTypeId: policyTypeId,
      typeName: atype?.name ?? "—", typeUnit: atype?.unit ?? "days",
      granted, isProrated, carryover, manual, holidayDeductions, expired,
      usedApproved, usedPending, available,
      expiryDate: expiryDate(policy, cycleEnd),
      validFrom: a.valid_from, validUntil: a.valid_until,
    };
  });
}

const ALLOWANCE_SELECT =
  "id, valid_from, valid_until, allowance_policies(id, name, amount, cycle_type, cycle_start_month, expiry_rule, expiry_period_months, carryover_limit, allowance_type_id, allowance_types(id, name, unit))";

/**
 * Carga bolsas + ausencias + ajustes de un empleado y devuelve el saldo ya calculado.
 * El cliente que se pasa define lo que se ve: con la sesión del empleado, la RLS solo deja
 * las suyas.
 */
export async function loadEmployeeBalances(
  // El cliente de Supabase no está tipado en el proyecto; el cast vive en esta frontera.
  supabase: { from: (t: string) => any },
  employeeId: string,
): Promise<PolicyBalance[]> {
  const [{ data: allowances }, { data: absences }] = await Promise.all([
    supabase.from("employee_allowances").select(ALLOWANCE_SELECT)
      .eq("employee_id", employeeId).order("valid_from", { ascending: false }),
    supabase.from("absence_requests")
      .select("status, working_days_count, absence_types(deducts_from_allowance, allowance_type_id)")
      .eq("employee_id", employeeId),
  ]);

  const allowanceRows = (allowances ?? []) as AllowanceRow[];
  if (allowanceRows.length === 0) return [];

  const { data: logs } = await supabase.from("allowance_adjustment_log")
    .select("*").in("employee_allowance_id", allowanceRows.map((a) => a.id));

  return computeBalances(
    allowanceRows,
    (absences ?? []) as BalanceAbsenceRow[],
    (logs ?? []) as AllowanceAdjustmentLog[],
  );
}
