import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api";

/**
 * Detalle de una candidatura del candidato (para el sheet del tracker): cabecera +
 * timeline de eventos. Ownership: la candidatura debe pertenecer a una ficha del user
 * autenticado (candidates.user_id). Solo lectura.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { data: { user } } = await createClient().auth.getUser();
  if (!user) return jsonError("No autenticado", 401);
  const admin = createAdminClient();

  const { data: cands } = await admin.from("candidates").select("id").eq("user_id", user.id);
  const ids = (cands ?? []).map((c) => c.id);
  if (!ids.length) return jsonError("No encontrada", 404);

  const { data: application } = await admin
    .from("applications")
    .select("id, created_at, fit_score, status, stage_id, job:jobs(id, title, city, modality, company:companies(name, logo_url))")
    .eq("id", params.id)
    .in("candidate_id", ids)
    .maybeSingle();
  if (!application) return jsonError("No encontrada", 404);

  const { data: timeline } = await admin
    .from("application_events")
    .select("type, from_stage, to_stage, reason, created_at")
    .eq("application_id", params.id)
    .order("created_at", { ascending: true });

  return NextResponse.json({ application, timeline: timeline ?? [] });
}
