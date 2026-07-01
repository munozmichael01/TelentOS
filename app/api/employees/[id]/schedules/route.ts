import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const { data: company } = await supabase.from("companies").select("id").limit(1).maybeSingle();
  if (!company) return jsonError("Configura primero la empresa en Ajustes", 412);

  // Verify the employee belongs to this company
  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("id", params.id)
    .eq("company_id", company.id)
    .maybeSingle();
  if (!employee) return jsonError("Empleado no encontrado", 404);

  const { data, error: dbError } = await supabase
    .from("employee_schedules")
    .select("*, template:work_schedule_templates(id, name, week_type, is_default, is_active)")
    .eq("employee_id", params.id)
    .order("valid_from", { ascending: false });

  if (dbError) return jsonError(dbError.message, 500);
  return NextResponse.json({ schedules: data ?? [] });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const { data: company } = await supabase.from("companies").select("id").limit(1).maybeSingle();
  if (!company) return jsonError("Configura primero la empresa en Ajustes", 412);

  // Verify the employee belongs to this company
  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("id", params.id)
    .eq("company_id", company.id)
    .maybeSingle();
  if (!employee) return jsonError("Empleado no encontrado", 404);

  const body = await req.json().catch(() => null);
  if (!body?.template_id) return jsonError("Se requiere template_id");
  if (!body?.valid_from) return jsonError("Se requiere valid_from");

  if (body.valid_until && body.valid_until < body.valid_from) {
    return jsonError("valid_until debe ser posterior o igual a valid_from");
  }

  // Verify the template belongs to this company
  const { data: template } = await supabase
    .from("work_schedule_templates")
    .select("id")
    .eq("id", body.template_id)
    .eq("company_id", company.id)
    .eq("is_active", true)
    .maybeSingle();
  if (!template) return jsonError("Plantilla no encontrada o inactiva", 404);

  const { data, error: dbError } = await supabase
    .from("employee_schedules")
    .insert({
      employee_id: params.id,
      template_id: body.template_id,
      valid_from: body.valid_from,
      valid_until: body.valid_until ?? null,
    })
    .select("*, template:work_schedule_templates(id, name, week_type, is_default, is_active)")
    .single();

  if (dbError) return jsonError(dbError.message, 500);
  return NextResponse.json({ schedule: data }, { status: 201 });
}
