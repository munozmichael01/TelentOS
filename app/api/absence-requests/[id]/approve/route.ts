import { NextResponse } from "next/server";
import { requireApiRole, jsonError } from "@/lib/api";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { supabase, user, role, companyId, error } = await requireApiRole(["owner", "hr_admin", "manager"]);
  if (error) return error;

  // Load the request and verify it's pending
  const { data: existing } = await supabase
    .from("absence_requests")
    .select("id, status, employee_id")
    .eq("id", params.id)
    .eq("company_id", companyId)
    .maybeSingle();
  if (!existing) return jsonError("Solicitud de ausencia no encontrada", 404);
  if (existing.status !== "pending")
    return jsonError("Solo se pueden aprobar solicitudes en estado pendiente", 422);

  // Managers: verify the employee is within their direct/indirect reports
  if (role === "manager") {
    const { data: reports } = await supabase.rpc("org_reports", { p_user_id: user!.id });
    const reportIds = ((reports ?? []) as { id: string }[]).map((r) => r.id);
    if (!reportIds.includes(existing.employee_id))
      return jsonError("Esta solicitud no pertenece a tu equipo", 403);
  }

  const { data, error: dbError } = await supabase
    .from("absence_requests")
    .update({
      status: "approved",
      approved_by_employee_id: null,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .eq("company_id", companyId)
    .select("*")
    .maybeSingle();
  if (dbError) return jsonError(dbError.message, 500);
  if (!data) return jsonError("Solicitud de ausencia no encontrada", 404);

  return NextResponse.json({ request: data });
}
