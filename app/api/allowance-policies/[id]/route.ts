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

  const { data, error: dbError } = await supabase
    .from("allowance_policies")
    .select("*, allowance_type:allowance_types(id, name, unit)")
    .eq("id", params.id)
    .eq("company_id", company.id)
    .maybeSingle();
  if (dbError) return jsonError(dbError.message, 500);
  if (!data) return jsonError("Política no encontrada", 404);

  return NextResponse.json({ allowance_policy: data });
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body || Object.keys(body).length === 0) return jsonError("No hay campos para actualizar");

  const { data: company } = await supabase.from("companies").select("id").limit(1).maybeSingle();
  if (!company) return jsonError("Empresa no configurada", 412);

  const validCycleTypes = ["annual", "monthly"];
  if (body.cycle_type && !validCycleTypes.includes(body.cycle_type)) {
    return jsonError(`'cycle_type' debe ser uno de: ${validCycleTypes.join(", ")}`);
  }
  const validTimings = ["start_of_cycle", "end_of_cycle"];
  if (body.assignment_timing && !validTimings.includes(body.assignment_timing)) {
    return jsonError(`'assignment_timing' debe ser uno de: ${validTimings.join(", ")}`);
  }
  const validExpiry = ["immediate", "never", "after_period"];
  if (body.expiry_rule && !validExpiry.includes(body.expiry_rule)) {
    return jsonError(`'expiry_rule' debe ser uno de: ${validExpiry.join(", ")}`);
  }

  const allowed = [
    "allowance_type_id",
    "name",
    "amount",
    "cycle_type",
    "cycle_start_month",
    "assignment_timing",
    "expiry_rule",
    "expiry_period_months",
    "carryover_limit",
    "allow_negative",
    "is_default",
  ];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }
  if (updates.name && typeof updates.name === "string") {
    updates.name = updates.name.trim();
    if (!updates.name) return jsonError("El nombre no puede estar vacío");
  }
  updates.updated_at = new Date().toISOString();

  const { data, error: dbError } = await supabase
    .from("allowance_policies")
    .update(updates)
    .eq("id", params.id)
    .eq("company_id", company.id)
    .select("*, allowance_type:allowance_types(id, name, unit)")
    .maybeSingle();
  if (dbError) return jsonError(dbError.message, 500);
  if (!data) return jsonError("Política no encontrada", 404);

  return NextResponse.json({ allowance_policy: data });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const { data: company } = await supabase.from("companies").select("id").limit(1).maybeSingle();
  if (!company) return jsonError("Empresa no configurada", 412);

  // Verify ownership
  const { data: policy } = await supabase
    .from("allowance_policies")
    .select("id")
    .eq("id", params.id)
    .eq("company_id", company.id)
    .maybeSingle();
  if (!policy) return jsonError("Política no encontrada", 404);

  // Prevent deletion if any employee_allowances reference this policy
  const { count } = await supabase
    .from("employee_allowances")
    .select("id", { count: "exact", head: true })
    .eq("policy_id", params.id);
  if (count && count > 0) {
    return jsonError(
      "No se puede eliminar la política porque tiene permisos de empleados asignados",
      409
    );
  }

  const { error: dbError } = await supabase
    .from("allowance_policies")
    .delete()
    .eq("id", params.id)
    .eq("company_id", company.id);
  if (dbError) return jsonError(dbError.message, 500);

  return NextResponse.json({ success: true });
}
