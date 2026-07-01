import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";

export async function POST(
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

  // Load the request and verify it's pending
  const { data: existing } = await supabase
    .from("absence_requests")
    .select("id, status, employee_id")
    .eq("id", params.id)
    .eq("company_id", company.id)
    .maybeSingle();
  if (!existing) return jsonError("Solicitud de ausencia no encontrada", 404);
  if (existing.status !== "pending")
    return jsonError("Solo se pueden aprobar solicitudes en estado pendiente", 422);

  const { data, error: dbError } = await supabase
    .from("absence_requests")
    .update({
      status: "approved",
      approved_by_employee_id: null, // No HR user linked as employee — set null
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
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
