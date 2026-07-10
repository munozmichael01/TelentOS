import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(_: Request, { params }: { params: { employeeId: string } }) {
  const { companyId, error } = await requireApiRole(["owner", "hr_admin"]);
  if (error) return error;

  const db = createAdminClient();

  const [{ data: employee }, { data: profiles }, { data: company }] = await Promise.all([
    db
      .from("employees")
      .select("id, name, role_title, department, company_id, start_date")
      .eq("id", params.employeeId)
      .eq("company_id", companyId!)
      .maybeSingle(),
    db
      .from("pay_profiles")
      .select("*")
      .eq("employee_id", params.employeeId)
      .eq("company_id", companyId!)
      .order("effective_from", { ascending: false }),
    db
      .from("companies")
      .select("id, country")
      .eq("id", companyId!)
      .maybeSingle(),
  ]);

  if (!employee) return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });

  const allProfiles = profiles ?? [];
  const activeProfile = allProfiles.find((p) => !p.effective_to) ?? null;

  const { data: components } = activeProfile
    ? await db
        .from("pay_components")
        .select("*")
        .eq("pay_profile_id", activeProfile.id)
        .order("order_index")
    : { data: [] };

  // Fetch latest payslip for this employee
  const { data: latestPayslip } = activeProfile
    ? await db
        .from("payslips")
        .select("id, slip_number, generated_at, pay_run_line_id")
        .eq("pay_run_line_id", activeProfile.id) // join via line
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  return NextResponse.json({
    employee,
    profile: activeProfile,
    profiles: allProfiles,
    components: components ?? [],
    currentPayslip: latestPayslip ?? null,
    company: company ?? null,
  });
}

/**
 * PUT — crea o actualiza un perfil salarial con soporte de historial.
 *
 * Lógica:
 * - Si no hay perfil activo → INSERT (primer perfil del empleado).
 * - Si effective_from = mismo día que el perfil activo → UPDATE (corrección).
 * - Si effective_from > effective_from del activo → cierra el activo
 *   (effective_to = new_from - 1 día) e INSERT uno nuevo.
 */
export async function PUT(req: Request, { params }: { params: { employeeId: string } }) {
  const { companyId, error } = await requireApiRole(["owner", "hr_admin"]);
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body || typeof body.base_salary !== "number") {
    return NextResponse.json({ error: "base_salary requerido" }, { status: 400 });
  }

  const newFrom: string = body.effective_from ?? new Date().toISOString().split("T")[0];

  const db = createAdminClient();

  const { data: active } = await db
    .from("pay_profiles")
    .select("id, effective_from")
    .eq("employee_id", params.employeeId)
    .eq("company_id", companyId!)
    .is("effective_to", null)
    .maybeSingle();

  const profileFields = {
    company_id: companyId!,
    employee_id: params.employeeId,
    base_salary: body.base_salary,
    currency: body.currency ?? "USD",
    frequency: body.frequency ?? "monthly",
    effective_from: newFrom,
    effective_to: null as string | null,
    payment_method: body.payment_method ?? "transfer",
    bank_name: body.bank_name ?? null,
    bank_account_last4: body.bank_account_last4 ?? null,
    country_pack: body.country_pack ?? "generic",
    tax_profile: body.tax_profile ?? null,
    legal_entity: body.legal_entity ?? null,
    employer_cost: body.employer_cost ?? null,
  };

  let profile;

  if (!active) {
    // No active profile → create first one
    const { data } = await db.from("pay_profiles").insert(profileFields).select().single();
    profile = data;
  } else if (active.effective_from === newFrom) {
    // Same date → UPDATE (correction, no history entry)
    const { data } = await db
      .from("pay_profiles")
      .update(profileFields)
      .eq("id", active.id)
      .select()
      .single();
    profile = data;
  } else {
    // Future date → close active, insert new (creates history)
    const dayBefore = new Date(newFrom);
    dayBefore.setDate(dayBefore.getDate() - 1);
    const closingDate = dayBefore.toISOString().split("T")[0];

    await db
      .from("pay_profiles")
      .update({ effective_to: closingDate })
      .eq("id", active.id);

    const { data } = await db.from("pay_profiles").insert(profileFields).select().single();
    profile = data;
  }

  return NextResponse.json({ profile });
}
