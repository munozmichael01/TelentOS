import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const status = body?.status as string | undefined;
  if (!status || !["active", "paused", "finished"].includes(status)) {
    return jsonError("status debe ser active | paused | finished");
  }

  const { data, error: dbErr } = await supabase
    .from("campaigns")
    .update({ status })
    .eq("id", params.id)
    .select("id, status")
    .single();

  if (dbErr) return jsonError(dbErr.message, 500);
  return NextResponse.json(data);
}
