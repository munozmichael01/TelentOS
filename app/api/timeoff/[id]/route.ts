import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";

/** Aprobación/rechazo: decisión humana, queda registrado quién aprueba. */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!["approved", "rejected"].includes(body?.status)) {
    return jsonError("status debe ser 'approved' o 'rejected'");
  }

  const { data, error: dbError } = await supabase
    .from("time_off_requests")
    .update({ status: body.status, approver: user.email, comment: body.comment ?? null })
    .eq("id", params.id)
    .eq("status", "pending")
    .select()
    .single();
  if (dbError) return jsonError("La solicitud no existe o ya fue resuelta", 409);
  return NextResponse.json({ request: data });
}
