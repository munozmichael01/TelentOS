import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};
  if (body.status) updates.status = body.status;
  if (body.assignee !== undefined) updates.assignee = body.assignee;
  if (body.due_date !== undefined) updates.due_date = body.due_date || null;

  const { data, error: dbError } = await supabase
    .from("onboarding_tasks")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single();
  if (dbError) return jsonError(dbError.message, 500);
  return NextResponse.json({ task: data });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { supabase, error } = await requireUser();
  if (error) return error;
  const { error: dbError } = await supabase.from("onboarding_tasks").delete().eq("id", params.id);
  if (dbError) return jsonError(dbError.message, 500);
  return NextResponse.json({ ok: true });
}
