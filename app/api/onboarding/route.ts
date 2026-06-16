import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";

export async function POST(req: Request) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body?.employee_id || !body?.title?.trim()) {
    return jsonError("Se requieren 'employee_id' y 'title'");
  }

  const { data, error: dbError } = await supabase
    .from("onboarding_tasks")
    .insert({
      employee_id: body.employee_id,
      title: body.title.trim(),
      description: body.description ?? null,
      assignee: body.assignee ?? null,
      due_date: body.due_date || null,
      order_index: body.order_index ?? 99,
    })
    .select()
    .single();
  if (dbError) return jsonError(dbError.message, 500);
  return NextResponse.json({ task: data });
}
