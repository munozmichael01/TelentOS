import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";
import { dedupeHash } from "@/lib/import";
import { DEFAULT_STAGES } from "@/lib/types";

export async function POST(req: Request) {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body?.title?.trim()) return jsonError("El título es obligatorio");

  const { data: company } = await supabase.from("companies").select("id").limit(1).maybeSingle();
  if (!company) return jsonError("Configura primero la empresa en Ajustes", 412);

  const { data: job, error: dbError } = await supabase
    .from("jobs")
    .insert({
      company_id: company.id,
      title: body.title.trim(),
      description: body.description ?? null,
      skills: Array.isArray(body.skills) ? body.skills : [],
      salary_min: body.salary_min ?? null,
      salary_max: body.salary_max ?? null,
      salary_currency: body.salary_currency ?? "EUR",
      location: body.location ?? null,
      employment_type: body.employment_type ?? "full_time",
      sector: body.sector ?? null,
      department: body.department ?? null,
      category: body.category ?? null,
      experience_min_years: body.experience_min_years ?? 0,
      status: body.status === "active" ? "active" : "draft",
      source: body.source === "ai" ? "ai" : "manual",
      dedupe_hash: dedupeHash(body.title, body.location),
      created_by: user.id,
    })
    .select()
    .single();

  if (dbError) {
    if (dbError.code === "23505") return jsonError("Ya existe una oferta igual (título + ubicación)", 409);
    return jsonError(dbError.message, 500);
  }

  // Pipeline por defecto; configurable después desde la oferta
  await supabase
    .from("job_stages")
    .insert(DEFAULT_STAGES.map((s) => ({ ...s, job_id: job.id })));

  return NextResponse.json({ job });
}
