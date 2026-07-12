/**
 * Lógica pura del motor de nómina (pack generic) — sin I/O.
 * Contrato completo en handoff/spec §7.2.1. Testeada en __tests__/compute.test.ts.
 *
 * generate-lines.ts orquesta las queries de Supabase y delega el cálculo aquí,
 * para que el contrato (perfil vigente, prorrateo, flags, line items) sea testeable
 * sin base de datos.
 */

export const round2 = (n: number) => Math.round(n * 100) / 100;

export type Period = {
  period_start: string; // "YYYY-MM-01"
  period_end: string; // "YYYY-MM-DD" (último día real del mes)
  totalDays: number; // días naturales del mes (regla 3, base real en generic)
};

/**
 * Deriva los límites del período desde "YYYY-MM". Construye el último día por
 * string (no toISOString) para evitar el corrimiento de zona horaria.
 */
export function derivePeriod(periodMonth: string): Period {
  const [year, monthNum] = periodMonth.split("-").map(Number);
  const totalDays = new Date(year, monthNum, 0).getDate(); // día 0 del mes siguiente
  const period_start = `${periodMonth}-01`;
  const period_end = `${periodMonth}-${String(totalDays).padStart(2, "0")}`;
  return { period_start, period_end, totalDays };
}

export type ProfileInput = {
  id: string;
  employee_id: string;
  base_salary: number;
  currency: string;
  frequency: string;
  effective_from: string; // "YYYY-MM-DD"
  effective_to: string | null;
  payment_method: string;
  bank_name: string | null;
  bank_account_last4: string | null;
};

export type ComponentInput = {
  pay_profile_id: string;
  name: string;
  component_type: string; // "fixed" | "variable" | "conditional"
  amount: number | null;
};

export type PaymentInput = {
  id: string;
  employee_id: string;
  balance_minutes: number;
};

export type EmployeeInput = {
  id: string;
  name: string;
  start_date: string | null;
};

export type LineItemDraft = {
  category: string;
  label: string;
  amount: number;
  quantity_label: string | null;
  order_index: number;
};

export type EmployeeResult =
  | { kind: "incident"; reason: string }
  | {
      kind: "line";
      gross: number;
      net: number;
      employer_cost: number;
      items: LineItemDraft[];
      has_salary_change: boolean;
      has_bank_issue: boolean;
      consumedPaymentIds: string[];
    };

/** Perfil vigente = el que cubre el ÚLTIMO día del período (regla 2). */
export function selectVigentProfile(
  profiles: ProfileInput[],
  period_end: string,
): ProfileInput | null {
  return (
    profiles
      .filter(
        (p) =>
          p.effective_from <= period_end &&
          (p.effective_to === null || p.effective_to >= period_end),
      )
      .sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0] ?? null
  );
}

/** Hubo cambio salarial con vigencia DENTRO del período (regla 2 → has_salary_change). */
export function hasSalaryChangeInPeriod(
  profiles: ProfileInput[],
  period: Period,
): boolean {
  return profiles.some(
    (p) =>
      p.effective_from > period.period_start &&
      p.effective_from <= period.period_end,
  );
}

/** Prorrateo por alta a mitad de período (regla 3): base × díasActivos / díasMes. */
export function computeProration(
  baseSalary: number,
  startDate: string | null,
  period: Period,
): { amount: number; quantityLabel: string | null } {
  const needsProration =
    startDate !== null &&
    startDate > period.period_start &&
    startDate <= period.period_end;
  if (!needsProration) return { amount: baseSalary, quantityLabel: null };

  const startDayNum = Number(startDate!.slice(8, 10)); // día del mes, sin Date (evita TZ)
  const daysActive = period.totalDays - startDayNum + 1;
  return {
    amount: round2((baseSalary * daysActive) / period.totalDays),
    quantityLabel: `${daysActive}/${period.totalDays} días`,
  };
}

/** Importe y etiqueta de un pago de banco de horas. Generic: tarifa = base / 160h mes. */
export function computeBankPayment(
  baseSalary: number,
  balanceMinutes: number,
): { amount: number; hLabel: string } {
  const absMin = Math.abs(balanceMinutes);
  const hrs = Math.floor(absMin / 60);
  const mins = absMin % 60;
  const hLabel = mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  const hourlyRate = baseSalary / 160;
  return { amount: round2(hourlyRate * (absMin / 60)), hLabel };
}

/**
 * Cálculo completo de un empleado: devuelve incidencia o línea con sus line items.
 * Puro — recibe todos los datos ya cargados. Enforce del invariante AC-2b:
 * gross = suma de line items; net = gross; employer_cost = gross (pack generic).
 */
export function computeEmployeeResult(
  emp: EmployeeInput,
  profiles: ProfileInput[],
  components: ComponentInput[],
  payments: PaymentInput[],
  period: Period,
  runCurrency: string,
): EmployeeResult {
  const empProfiles = profiles.filter((p) => p.employee_id === emp.id);
  const vigent = selectVigentProfile(empProfiles, period.period_end);

  if (!vigent) return { kind: "incident", reason: "Sin perfil salarial vigente" };
  if (vigent.currency !== runCurrency)
    return {
      kind: "incident",
      reason: `Moneda distinta (${vigent.currency} ≠ ${runCurrency})`,
    };
  if (vigent.frequency !== "monthly")
    return {
      kind: "incident",
      reason: `Frecuencia no soportada (${vigent.frequency})`,
    };

  const has_salary_change = hasSalaryChangeInPeriod(empProfiles, period);
  const has_bank_issue =
    vigent.payment_method === "transfer" &&
    (!vigent.bank_name || !vigent.bank_account_last4);

  const base = computeProration(vigent.base_salary, emp.start_date, period);

  const items: LineItemDraft[] = [
    {
      category: "earning",
      label: "Salario base",
      amount: base.amount,
      quantity_label: base.quantityLabel,
      order_index: 0,
    },
  ];
  let orderIdx = 1;

  // Componentes fixed y variable-con-importe (conditional no se auto-genera)
  const vigentComponents = components.filter(
    (c) => c.pay_profile_id === vigent.id,
  );
  for (const comp of vigentComponents) {
    if (comp.component_type === "conditional") continue;
    if (comp.component_type === "variable" && comp.amount === null) continue;
    items.push({
      category: "earning",
      label: comp.name,
      amount: comp.amount ?? 0,
      quantity_label: null,
      order_index: orderIdx++,
    });
  }

  // Pagos de banco de horas pendientes de este empleado
  const consumedPaymentIds: string[] = [];
  for (const payment of payments.filter((p) => p.employee_id === emp.id)) {
    const { amount, hLabel } = computeBankPayment(
      vigent.base_salary,
      payment.balance_minutes,
    );
    items.push({
      category: "earning",
      label: `Horas compensadas (${hLabel})`,
      amount,
      quantity_label: hLabel,
      order_index: orderIdx++,
    });
    consumedPaymentIds.push(payment.id);
  }

  const gross = round2(items.reduce((sum, it) => sum + it.amount, 0));

  return {
    kind: "line",
    gross,
    net: gross,
    employer_cost: gross,
    items,
    has_salary_change,
    has_bank_issue,
    consumedPaymentIds,
  };
}
