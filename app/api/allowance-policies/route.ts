import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";

export async function GET() {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const { data: company } = await supabase.from("companies").select("id").limit(1).maybeSingle();
  if (!company) return jsonError("Empresa no configurada", 412);

  const { data, error: dbError } = await supabase
    .from("allowance_policies")
    .select("*, allowance_type:allowance_types(id, name, unit)")
    .eq("company_id", company.id)
    .order("name");
  if (dbError) return jsonError(dbError.message, 500);

  return NextResponse.json({ allowance_policies: data });
}

export async function POST(req: Request) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body?.name?.trim()) return jsonError("El campo 'name' es obligatorio");
  if (!body?.allowance_type_id) return jsonError("El campo 'allowance_type_id' es obligatorio");
  if (body.amount === undefined || body.amount === null) return jsonError("El campo 'amount' es obligatorio");

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

  const { data, error: dbError } = await supabase
    .from("allowance_policies")
    .insert({
      company_id: company.id,
      allowance_type_id: body.allowance_type_id,
      name: body.name.trim(),
      amount: body.amount,
      cycle_type: body.cycle_type ?? "annual",
      cycle_start_month: body.cycle_start_month ?? null,
      assignment_timing: body.assignment_timing ?? "start_of_cycle",
      expiry_rule: body.expiry_rule ?? "never",
      expiry_period_months: body.expiry_period_months ?? null,
      carryover_limit: body.carryover_limit ?? null,
      allow_negative: body.allow_negative ?? false,
      is_default: body.is_default ?? false,
    })
    .select("*, allowance_type:allowance_types(id, name, unit)")
    .single();
  if (dbError) return jsonError(dbError.message, 500);

  return NextResponse.json({ allowance_policy: data }, { status: 201 });
}
