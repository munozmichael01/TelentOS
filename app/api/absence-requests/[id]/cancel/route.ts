import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { resolveActingEmployee } from "@/lib/api-self";

/**
 * Cancelar una ausencia.
 *
 * Antes bastaba con estar autenticado y que la solicitud fuera de la empresa: cualquier empleado
 * podía cancelar las vacaciones de un compañero. Ahora RR.HH. cancela cualquiera de su empresa y
 * el resto solo las suyas.
 */
export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const acting = await resolveActingEmployee(null, { hrMayOmitTarget: true });
  if (acting.error) return acting.error;
  const { supabase, employeeId, companyId, isHr } = acting;

  let q = supabase
    .from("absence_requests")
    .select("id, status, employee_id")
    .eq("id", params.id)
    .eq("company_id", companyId);
  if (!isHr) q = q.eq("employee_id", employeeId);

  const { data: existing } = await q.maybeSingle();
  if (!existing) return jsonError("Solicitud de ausencia no encontrada", 404);
  if (!["pending", "approved"].includes(existing.status))
    return jsonError(
      "Solo se pueden cancelar solicitudes en estado pendiente o aprobado",
      422
    );

  const { data, error: dbError } = await supabase
    .from("absence_requests")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("company_id", companyId)
    .select("*")
    .maybeSingle();
  if (dbError) return jsonError(dbError.message, 500);
  if (!data) return jsonError("Solicitud de ausencia no encontrada", 404);

  return NextResponse.json({ request: data });
}
