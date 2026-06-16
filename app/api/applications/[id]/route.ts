import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";

/** Mover de etapa con trazabilidad obligatoria (quién, cuándo, por qué). */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body?.stage_id) return jsonError("Se requiere 'stage_id'");

  const { data: app } = await supabase
    .from("applications")
    .select("id, stage_id, job_stages(name)")
    .eq("id", params.id)
    .maybeSingle();
  if (!app) return jsonError("Candidatura no encontrada", 404);

  const { data: toStage } = await supabase
    .from("job_stages")
    .select("name, is_terminal")
    .eq("id", body.stage_id)
    .maybeSingle();
  if (!toStage) return jsonError("Etapa no encontrada", 404);

  const isHired = toStage.name.toLowerCase().includes("contratado");
  const isRejected = toStage.is_terminal && !isHired;

  const { error: updErr } = await supabase
    .from("applications")
    .update({
      stage_id: body.stage_id,
      status: isHired ? "hired" : isRejected ? "rejected" : "open",
    })
    .eq("id", params.id);
  if (updErr) return jsonError(updErr.message, 500);

  await supabase.from("application_events").insert({
    application_id: params.id,
    type: isHired ? "hired" : isRejected ? "rejected" : "stage_change",
    from_stage: (app.job_stages as unknown as { name: string } | null)?.name ?? null,
    to_stage: toStage.name,
    reason: body.reason ?? null,
    actor_id: user.id,
    actor_email: user.email,
  });

  return NextResponse.json({ ok: true, hired: isHired });
}
