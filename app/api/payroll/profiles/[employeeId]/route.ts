import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(_: Request, { params }: { params: { employeeId: string } }) {
  const { companyId, error } = await requireApiRole(["owner", "hr_admin"]);
  if (error) return error;

  const db = createAdminClient();

  const [{ data: employee }, { data: profile }] = await Promise.all([
    db
      .from("employees")
      .select("id, name, role_title, department, company_id")
      .eq("id", params.employeeId)
      .eq("company_id", companyId!)
      .maybeSingle(),
    db
      .from("pay_profiles")
      .select("*")
      .eq("employee_id", params.employeeId)
      .eq("company_id", companyId!)
      .maybeSingle(),
  ]);

  if (!employee) return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });

  const { data: components } = profile
    ? await db
        .from("pay_components")
        .select("*")
        .eq("pay_profile_id", profile.id)
        .order("order_index")
    : { data: [] };

  return NextResponse.json({
    employee,
    profile: profile ?? null,
    components: components ?? [],
    currentPayslip: null,
  });
}

export async function PUT(req: Request, { params }: { params: { employeeId: string } }) {
  const { companyId, error } = await requireApiRole(["owner", "hr_admin"]);
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const profileFields = {
    company_id: companyId!,
    employee_id: params.employeeId,
    base_salary: body.base_salary,
    currency: body.currency ?? "USD",
    frequency: body.frequency ?? "monthly",
    effective_from: body.effective_from ?? new Date().toISOString().split("T")[0],
    payment_method: body.payment_method ?? "transfer",
    bank_name: body.bank_name ?? null,
    bank_account_last4: body.bank_account_last4 ?? null,
    country_pack: body.country_pack ?? "ve",
    tax_profile: body.tax_profile ?? null,
    legal_entity: body.legal_entity ?? null,
    employer_cost: body.employer_cost ?? null,
  };

  const db = createAdminClient();
  const { data: existing } = await db
    .from("pay_profiles")
    .select("id")
    .eq("employee_id", params.employeeId)
    .eq("company_id", companyId!)
    .maybeSingle();

  let profile;
  if (existing) {
    const { data } = await db
      .from("pay_profiles")
      .update(profileFields)
      .eq("id", existing.id)
      .select()
      .single();
    profile = data;
  } else {
    const { data } = await db
      .from("pay_profiles")
      .insert(profileFields)
      .select()
      .single();
    profile = data;
  }

  return NextResponse.json({ profile });
}
