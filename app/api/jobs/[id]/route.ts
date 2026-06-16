import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";

const EDITABLE = [
  "title", "description", "skills", "salary_min", "salary_max", "salary_currency",
  "location", "employment_type", "sector", "department", "category",
  "experience_min_years", "status",
] as const;

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of EDITABLE) {
    if (key in body) updates[key] = body[key];
  }

  const { data, error: dbError } = await supabase
    .from("jobs")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single();
  if (dbError) return jsonError(dbError.message, 500);
  return NextResponse.json({ job: data });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { supabase, error } = await requireUser();
  if (error) return error;
  const { error: dbError } = await supabase.from("jobs").delete().eq("id", params.id);
  if (dbError) return jsonError(dbError.message, 500);
  return NextResponse.json({ ok: true });
}
