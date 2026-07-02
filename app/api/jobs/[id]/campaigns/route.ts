import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";

/** Activa los canales aprobados por el usuario a partir del plan del agente. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const selections: {
    channel_id: string;
    budget: number;
    priority: number;
    copy: string;
  }[] = body?.selections ?? [];
  if (!selections.length) return jsonError("Selecciona al menos un canal");

  const { data, error: dbError } = await supabase
    .from("campaigns")
    .insert(
      selections.map((s) => ({
        job_id: params.id,
        channel_id: s.channel_id,
        objective: body.objective ?? "volume",
        budget: s.budget ?? 0,
        priority: s.priority ?? 1,
        copy: s.copy ?? null,
      }))
    )
    .select();
  if (dbError) return jsonError(dbError.message, 500);

  // Mark the plan as activated if a plan_id was provided
  if (body.plan_id) {
    await supabase
      .from("distribution_plans")
      .update({ status: "activated", activated_at: new Date().toISOString() })
      .eq("id", body.plan_id)
      .eq("status", "pending");
  }

  // Publish the job if it was still a draft
  await supabase.from("jobs").update({ status: "active" }).eq("id", params.id).eq("status", "draft");

  return NextResponse.json({ campaigns: data });
}
