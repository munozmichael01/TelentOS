import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const status = body?.status;
  if (!["done", "ignored", "open"].includes(status)) {
    return jsonError("status debe ser 'done', 'ignored' o 'open'");
  }

  const { error: dbError } = await supabase
    .from("agent_insights")
    .update({ status })
    .eq("id", params.id);

  if (dbError) return jsonError(dbError.message, 500);
  return NextResponse.json({ ok: true });
}
