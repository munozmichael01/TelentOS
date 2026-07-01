import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";

export async function POST(req: Request) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body?.name?.trim()) return jsonError("El nombre es obligatorio");

  const { data: company } = await supabase.from("companies").select("id").limit(1).maybeSingle();
  if (!company) return jsonError("Configura primero la empresa en Ajustes", 412);

  const { data: employee, error: dbError } = await supabase
    .from("employees")
    .insert({
      company_id: company.id,
      name: body.name.trim(),
      email: body.email ?? null,
      role_title: body.role_title ?? null,
      department: body.department ?? null,
      start_date: body.start_date ?? null,
      contract_type: body.contract_type ?? "indefinido",
      manager_id: body.manager_id || null,
    })
    .select()
    .single();
  if (dbError) return jsonError(dbError.message, 500);

  // Auto-assign default allowance policy and schedule template
  const today = new Date().toISOString().split("T")[0];

  const [{ data: defaultPolicy }, { data: defaultTemplate }] = await Promise.all([
    supabase
      .from("allowance_policies")
      .select("id")
      .eq("company_id", company.id)
      .eq("is_default", true)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("work_schedule_templates")
      .select("id")
      .eq("company_id", company.id)
      .eq("is_default", true)
      .limit(1)
      .maybeSingle(),
  ]);

  await Promise.all([
    defaultPolicy
      ? supabase.from("employee_allowances").insert({
          employee_id: employee.id,
          policy_id: defaultPolicy.id,
          valid_from: today,
          valid_until: null,
        })
      : Promise.resolve(),
    defaultTemplate
      ? supabase.from("employee_schedules").insert({
          employee_id: employee.id,
          template_id: defaultTemplate.id,
          valid_from: today,
          valid_until: null,
        })
      : Promise.resolve(),
  ]);

  return NextResponse.json({ employee });
}
