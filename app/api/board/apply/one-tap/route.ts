import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api";
import { resolveSkillIds } from "@/lib/skills";
import { computeRecruiterFit, type JobSkillReq } from "@/lib/job-board/fit";
import type { EducationLevel, SeniorityLevel } from "@/lib/types";

/**
 * Aplicar EN UN TOQUE: candidato logueado con perfil (ficha ATS) → crea la candidatura
 * usando sus datos ya guardados, sin re-teclear. Si la oferta tiene screening OBLIGATORIO,
 * no se puede 1-toque → responde { needsWizard: true } para que el cliente abra el wizard.
 */
export async function POST(req: Request) {
  const { data: { user } } = await createClient().auth.getUser();
  if (!user || user.app_metadata?.audience !== "candidate") return jsonError("No autenticado", 401);
  const body = await req.json().catch(() => null);
  if (!body?.jobId) return jsonError("Falta la oferta");

  const admin = createAdminClient();

  // Ficha del candidato (la más reciente ligada a su cuenta).
  const { data: cands } = await admin
    .from("candidates")
    .select("id, skills, experience_years, education_level, city, country_code, location")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);
  const cand = cands?.[0];
  if (!cand) return jsonError("Perfil incompleto", 422);

  // Oferta activa + requisitos + screening.
  const { data: job } = await admin
    .from("jobs")
    .select("id, company_id, status, experience_min_years, education_level, seniority_level, city, country_code, location")
    .eq("id", body.jobId).eq("status", "active").maybeSingle();
  if (!job) return jsonError("La oferta no está disponible", 404);

  const [{ data: jobSkills }, { data: questions }] = await Promise.all([
    admin.from("job_skills").select("skill_id, requirement").eq("job_id", job.id),
    admin.from("screening_questions").select("id, required").eq("job_id", job.id),
  ]);
  if ((questions ?? []).some((q) => q.required)) {
    return NextResponse.json({ needsWizard: true });
  }

  const candSkillIds = await resolveSkillIds(admin, Array.isArray(cand.skills) ? cand.skills : []);
  const fit = computeRecruiterFit({
    job: {
      skills: (jobSkills ?? []).map((s) => ({ skillId: s.skill_id, requirement: (s.requirement ?? "deseable") as JobSkillReq["requirement"] })),
      experienceMinYears: job.experience_min_years ?? 0, educationLevel: job.education_level as EducationLevel | null,
      seniorityLevel: job.seniority_level as SeniorityLevel | null, country: job.country_code, city: job.city, location: job.location,
    },
    candidate: {
      skillIds: candSkillIds, experienceYears: cand.experience_years ?? 0,
      educationLevel: (cand.education_level ?? null) as EducationLevel | null, seniorityLevel: null as SeniorityLevel | null,
      country: cand.country_code ?? null, city: cand.city ?? null, location: cand.location ?? null,
    },
  });
  const fitScore = Math.max(0, Math.min(100, fit.score));

  const { data: firstStage } = await admin.from("job_stages").select("id").eq("job_id", job.id).order("order_index").limit(1).maybeSingle();
  const { data: application, error: aErr } = await admin.from("applications").insert({
    job_id: job.id, candidate_id: cand.id, stage_id: firstStage?.id ?? null,
    fit_score: fitScore, source: "job_board",
    utm: { utm_source: "job_board", utm_medium: "one_tap" },
  }).select("id").single();
  if (aErr) {
    if (aErr.code === "23505") return jsonError("Ya has aplicado a esta oferta", 409);
    return jsonError(aErr.message, 500);
  }
  await admin.from("application_events").insert({
    application_id: application.id, type: "created", to_stage: "Aplicado",
    reason: "Candidatura del job board (un toque)",
  });

  return NextResponse.json({ ok: true, application_id: application.id, fit_score: fitScore, meets_requirements: fit.meetsHardRequirements });
}
