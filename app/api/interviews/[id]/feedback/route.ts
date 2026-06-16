import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body?.overall) return jsonError("Se requiere la valoración global");

  const { data, error: dbError } = await supabase
    .from("interview_feedback")
    .insert({
      interview_id: params.id,
      template_id: body.template_id ?? null,
      ratings: body.ratings ?? {},
      overall: body.overall,
      comments: body.comments ?? null,
      author_email: user.email,
    })
    .select()
    .single();
  if (dbError) return jsonError(dbError.message, 500);

  await supabase.from("interviews").update({ status: "done" }).eq("id", params.id);
  return NextResponse.json({ feedback: data });
}
