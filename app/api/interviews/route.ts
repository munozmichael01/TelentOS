import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";

export async function POST(req: Request) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body?.application_id || !body?.scheduled_at) {
    return jsonError("Se requieren 'application_id' y 'scheduled_at'");
  }

  const { data, error: dbError } = await supabase
    .from("interviews")
    .insert({
      application_id: body.application_id,
      stage_id: body.stage_id ?? null,
      scheduled_at: body.scheduled_at,
      duration_min: body.duration_min ?? 45,
      interviewer: body.interviewer ?? null,
      meeting_url: body.meeting_url ?? null,
    })
    .select()
    .single();
  if (dbError) return jsonError(dbError.message, 500);
  return NextResponse.json({ interview: data });
}
