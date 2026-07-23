import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api";

// Detalle de una oferta activa para el panel inline del board (desktop split). Público.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: job } = await supabase
    .from("jobs")
    .select("id, title, description, city, country_code, location, modality, salary_min, salary_max, salary_currency, salary_period, employment_type, category, created_at, education_level, seniority_level, experience_min_years, closes_at, category_key, company:companies(id, name, slug, logo_url)")
    .eq("id", params.id).eq("status", "active").maybeSingle();
  if (!job) return jsonError("No encontrada", 404);

  const [{ data: skillRows }, { data: screening }] = await Promise.all([
    supabase.from("job_skills").select("requirement, skills(name)").eq("job_id", params.id),
    supabase.from("screening_questions").select("id, required").eq("job_id", params.id),
  ]);
  const skills = (skillRows ?? []).map((r) => ({
    name: (r.skills as { name?: string } | null)?.name ?? "",
    requirement: (r.requirement ?? "deseable") as "excluyente" | "deseable",
  })).filter((s) => s.name);

  return NextResponse.json({
    job,
    skills,
    hasRequiredScreening: (screening ?? []).some((q) => q.required),
  });
}
