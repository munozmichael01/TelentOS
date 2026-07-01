import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const { data: company } = await supabase.from("companies").select("id").limit(1).maybeSingle();
  if (!company) return jsonError("Empresa no configurada", 412);

  // Verify the employee belongs to this company
  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("id", params.id)
    .eq("company_id", company.id)
    .maybeSingle();
  if (!employee) return jsonError("Empleado no encontrado", 404);

  const { data, error: dbError } = await supabase
    .from("employee_allowances")
    .select(
      "*, policy:allowance_policies(id, name, amount, cycle_type, allow_negative, allowance_type:allowance_types(id, name, unit))"
    )
    .eq("employee_id", params.id)
    .order("valid_from", { ascending: false });
  if (dbError) return jsonError(dbError.message, 500);

  return NextResponse.json({ allowances: data });
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body?.policy_id) return jsonError("El campo 'policy_id' es obligatorio");
  if (!body?.valid_from) return jsonError("El campo 'valid_from' es obligatorio");

  const { data: company } = await supabase.from("companies").select("id").limit(1).maybeSingle();
  if (!company) return jsonError("Empresa no configurada", 412);

  // Verify the employee belongs to this company
  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("id", params.id)
    .eq("company_id", company.id)
    .maybeSingle();
  if (!employee) return jsonError("Empleado no encontrado", 404);

  // Verify the policy belongs to this company
  const { data: policy } = await supabase
    .from("allowance_policies")
    .select("id")
    .eq("id", body.policy_id)
    .eq("company_id", company.id)
    .maybeSingle();
  if (!policy) return jsonError("Política no encontrada", 404);

  const { data, error: dbError } = await supabase
    .from("employee_allowances")
    .insert({
      employee_id: params.id,
      policy_id: body.policy_id,
      valid_from: body.valid_from,
      valid_until: body.valid_until ?? null,
    })
    .select(
      "*, policy:allowance_policies(id, name, amount, cycle_type, allow_negative, allowance_type:allowance_types(id, name, unit))"
    )
    .single();
  if (dbError) return jsonError(dbError.message, 500);

  return NextResponse.json({ allowance: data }, { status: 201 });
}
