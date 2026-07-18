import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api";

// Ofertas guardadas del candidato. RLS `saved_jobs_own` scopea por user_id = auth.uid();
// aquí basta el cliente RLS (el candidato escribe sus propias filas).

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return jsonError("No autenticado", 401);
  const { data, error } = await supabase
    .from("saved_jobs")
    .select("id, created_at, job:jobs(id, title, city, modality, salary_min, salary_max, salary_currency, employment_type, company:companies(name, slug, logo_url))")
    .order("created_at", { ascending: false });
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ saved: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return jsonError("No autenticado", 401);
  const body = await req.json().catch(() => null);
  if (!body?.jobId) return jsonError("Falta la oferta");
  const { error } = await supabase.from("saved_jobs").insert({ user_id: user.id, job_id: body.jobId });
  if (error && error.code !== "23505") return jsonError(error.message, 500); // 23505 = ya guardada (idempotente)
  return NextResponse.json({ ok: true, saved: true });
}

export async function DELETE(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return jsonError("No autenticado", 401);
  const jobId = new URL(req.url).searchParams.get("jobId");
  if (!jobId) return jsonError("Falta la oferta");
  const { error } = await supabase.from("saved_jobs").delete().eq("user_id", user.id).eq("job_id", jobId);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true, saved: false });
}
