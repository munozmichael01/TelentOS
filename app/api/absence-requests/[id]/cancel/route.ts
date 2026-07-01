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

  // Load the request and verify it's pending or approved
  const { data: existing } = await supabase
    .from("absence_requests")
    .select("id, status")
    .eq("id", params.id)
    .eq("company_id", company.id)
    .maybeSingle();
  if (!existing) return jsonError("Solicitud de ausencia no encontrada", 404);
  if (!["pending", "approved"].includes(existing.status))
    return jsonError(
      "Solo se pueden cancelar solicitudes en estado pendiente o aprobado",
      422
    );

  const { data, error: dbError } = await supabase
    .from("absence_requests")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .eq("company_id", company.id)
    .select("*")
    .maybeSingle();
  if (dbError) return jsonError(dbError.message, 500);
  if (!data) return jsonError("Solicitud de ausencia no encontrada", 404);

  return NextResponse.json({ request: data });
}
