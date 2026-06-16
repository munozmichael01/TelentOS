import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body?.body?.trim()) return jsonError("La nota no puede estar vacía");

  const { data, error: dbError } = await supabase
    .from("notes")
    .insert({
      application_id: params.id,
      author_id: user.id,
      author_email: user.email,
      body: body.body.trim(),
    })
    .select()
    .single();
  if (dbError) return jsonError(dbError.message, 500);
  return NextResponse.json({ note: data });
}
