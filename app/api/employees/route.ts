import { NextResponse } from "next/server";
import { requireApiRole, jsonError } from "@/lib/api";
import { getCompanyId } from "@/lib/workspace";

export async function POST(req: Request) {
  const { supabase, error } = await requireApiRole(["owner", "hr_admin"]);
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body?.name?.trim()) return jsonError("El nombre es obligatorio");

  const _cid = await getCompanyId(); const company = _cid ? { id: _cid } : null;
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
      phone: body.phone ?? null,
      emergency_contact_name: body.emergency_contact_name ?? null,
      emergency_contact_phone: body.emergency_contact_phone ?? null,
      seniority_level: body.seniority_level ?? null,
      country: body.country ?? null,
      city: body.city ?? null,
      work_location: body.work_location ?? null,
      work_modality: body.work_modality || null,
      legal_entity: body.legal_entity ?? null,
      benefits: Array.isArray(body.benefits) ? body.benefits : [],
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
