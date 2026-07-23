import { NextResponse } from "next/server";
import { requireApiRole, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";
import { dedupeHash } from "@/lib/import";
import { dedupeStrings, resolveSkillIds } from "@/lib/skills";
import { DEFAULT_STAGES } from "@/lib/types";

export async function POST(req: Request) {
  // Chokepoint de creación de ofertas: formulario, job-writer (source: "ai") e imports.
  const { companyId, user, error } = await requireApiRole(["owner", "hr_admin", "recruiter"]);
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body?.title?.trim()) return jsonError("El título es obligatorio");

  const skills = dedupeStrings(Array.isArray(body.skills) ? body.skills : []);
  const db = createAdminClient();

  const { data: job, error: dbError } = await db
    .from("jobs")
    .insert({
      company_id: companyId!,
      title: body.title.trim(),
      description: body.description ?? null,
      skills, // display/legado; la fuente matcheable es job_skills
      salary_min: body.salary_min ?? null,
      salary_max: body.salary_max ?? null,
      salary_currency: body.salary_currency ?? "EUR",
      salary_period: ["hour","day","week","month","year"].includes(body.salary_period) ? body.salary_period : "month",
      location: body.location ?? null,
      // city/country_code solo si llegan (tolerante a migración 0029 pendiente)
      ...(body.city !== undefined ? { city: body.city } : {}),
      ...(body.country_code !== undefined ? { country_code: body.country_code } : {}),
      employment_type: body.employment_type ?? "full_time",
      sector: body.sector ?? null,
      department: body.department ?? null,
      category: body.category ?? null,
      category_key: body.category_key ?? null,
      closes_at: body.closes_at ?? null,
      experience_min_years: body.experience_min_years ?? 0,
      status: body.status === "active" ? "active" : "draft",
      source: body.source === "ai" ? "ai" : "manual",
      dedupe_hash: dedupeHash(body.title, body.location),
      created_by: user!.id,
    })
    .select()
    .single();

  if (dbError) {
    if (dbError.code === "23505") return jsonError("Ya existe una oferta igual (título + ubicación)", 409);
    return jsonError(dbError.message, 500);
  }

  // Skills → catálogo canónico (mismo patrón que candidatos: alias→nombre, crea nuevas).
  let structuredSkills = false;
  if (skills.length > 0) {
    const skillIds = await resolveSkillIds(db, skills);
    const { error: jsErr } = await db
      .from("job_skills")
      .insert(skillIds.map((skill_id) => ({ job_id: job.id, skill_id })));
    // Degradación explícita mientras la migración 0029 no esté aplicada: la oferta
    // se crea (skills text[] intactas), el matching cae al modo texto legado.
    structuredSkills = !jsErr;
  }

  // Pipeline por defecto; configurable después desde la oferta
  await db.from("job_stages").insert(DEFAULT_STAGES.map((s) => ({ ...s, job_id: job.id })));

  return NextResponse.json({ job, structured_skills: structuredSkills });
}
