import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (!company)
    return jsonError("Configura primero la empresa en Ajustes", 412);

  const { data, error: dbError } = await supabase
    .from("absence_requests")
    .select(
      "*, employee:employees(name, role_title), absence_type:absence_types(name, color, icon)"
    )
    .eq("id", params.id)
    .eq("company_id", company.id)
    .maybeSingle();
  if (dbError) return jsonError(dbError.message, 500);
  if (!data) return jsonError("Solicitud de ausencia no encontrada", 404);

  return NextResponse.json({ request: data });
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body || Object.keys(body).length === 0)
    return jsonError("No hay campos para actualizar");

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (!company)
    return jsonError("Configura primero la empresa en Ajustes", 412);

  // Load request to verify it's still pending
  const { data: existing } = await supabase
    .from("absence_requests")
    .select("id, status")
    .eq("id", params.id)
    .eq("company_id", company.id)
    .maybeSingle();
  if (!existing) return jsonError("Solicitud de ausencia no encontrada", 404);
  if (existing.status !== "pending")
    return jsonError(
      "Solo se pueden editar solicitudes en estado pendiente",
      422
    );

  // Only allow updating these fields — dates and employee cannot be changed
  const allowed = [
    "comment",
    "document_url",
    "substitute_employee_id",
    "notify_employee_ids",
  ];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }
  if (Object.keys(updates).length === 0)
    return jsonError(
      "Solo se pueden actualizar: comment, document_url, substitute_employee_id, notify_employee_ids"
    );

  updates.updated_at = new Date().toISOString();

  const { data, error: dbError } = await supabase
    .from("absence_requests")
    .update(updates)
    .eq("id", params.id)
    .eq("company_id", company.id)
    .select(
      "*, employee:employees(name, role_title), absence_type:absence_types(name, color, icon)"
    )
    .maybeSingle();
  if (dbError) return jsonError(dbError.message, 500);
  if (!data) return jsonError("Solicitud de ausencia no encontrada", 404);

  return NextResponse.json({ request: data });
}
