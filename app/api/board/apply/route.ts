import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { resolveSkillIds } from "@/lib/skills";
import { computeRecruiterFit, computeScreeningOutcome, type JobSkillReq } from "@/lib/job-board/fit";
import { highestEducationLevel } from "@/lib/education";
import { CvExperienceSchema, CvLanguageSchema, CvEducationSchema } from "@/agents/agent-cv-parser";
import type { EducationLevel, SeniorityLevel } from "@/lib/types";
import { z } from "zod";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Apply del job board. JSON (el CV se parsea antes con cv-parser → perfil estructurado).
 * Usa service_role tras validar la oferta (patrón careers/apply). Novedades vs career site:
 * vincula la candidatura a la CUENTA del candidato (candidates.user_id) si está logueado,
 * inserta las respuestas de screening server-side, y usa el fit de dos lados + screening.
 */
export async function POST(req: Request) {
  if (!(await rateLimit(`board-apply:${clientIp(req)}`, 8, 10 * 60_000))) {
    return jsonError("Demasiadas solicitudes. Inténtalo en unos minutos.", 429);
  }
  const body = await req.json().catch(() => null);
  if (!body?.jobId) return jsonError("Falta la oferta");
  const c = body.candidate ?? {};
  const name = String(c.name ?? "").trim();
  const email = String(c.email ?? "").trim().toLowerCase();
  if (!name || !email) return jsonError("Nombre y email son obligatorios");
  if (!EMAIL_RE.test(email)) return jsonError("El email no es válido");

  // ¿candidato logueado? → vincular su cuenta a la ficha ATS.
  const { data: { user } } = await createClient().auth.getUser();
  const userId = user?.app_metadata?.audience === "candidate" ? user.id : null;

  const admin = createAdminClient();

  // Oferta activa + requisitos estructurados
  const { data: job } = await admin
    .from("jobs")
    .select("id, title, company_id, status, experience_min_years, education_level, seniority_level, city, country_code, location, company:companies(name)")
    .eq("id", body.jobId).eq("status", "active").maybeSingle();
  if (!job) return jsonError("La oferta no está disponible", 404);

  const [{ data: jobSkills }, { data: questions }] = await Promise.all([
    admin.from("job_skills").select("skill_id, requirement").eq("job_id", job.id),
    admin.from("screening_questions").select("id, mode, weight, filter_rule, required").eq("job_id", job.id),
  ]);

  // Screening: validar obligatorias respondidas
  const answers: Record<string, unknown> = body.screeningAnswers ?? {};
  for (const q of questions ?? []) {
    if (q.required && (answers[q.id] == null || String(answers[q.id]).trim() === "")) {
      return jsonError("Faltan preguntas obligatorias por responder", 422);
    }
  }

  // Candidato: dedupe por email (no sobrescribe datos existentes — H3)
  const skills: string[] = Array.isArray(c.skills) ? c.skills.filter((s: unknown) => typeof s === "string") : [];
  const expYears = typeof c.experience_years === "number" && c.experience_years >= 0 ? Math.floor(c.experience_years) : 0;
  // Perfil estructurado confirmado por el candidato (mismo contrato que el career site).
  const experiences = z.array(CvExperienceSchema).safeParse(c.experiences);
  const education = z.array(CvEducationSchema).safeParse(c.education);
  const languages = z.array(CvLanguageSchema).safeParse(c.languages);
  const exps = experiences.success ? experiences.data : [];
  const edus = education.success ? education.data : [];
  const langs = languages.success ? languages.data : [];
  const educationLevel = highestEducationLevel(edus.map((e) => e.level)) ?? ((c.education_level as EducationLevel | null) ?? null);
  // El email puede existir en VARIAS fichas (una por empresa, o históricas). maybeSingle()
  // con >1 fila revienta con 500 — bug real reportado en prod. Preferimos la ficha ya
  // vinculada a esta cuenta; si no, la más reciente.
  const { data: existingRows } = await admin.from("candidates")
    .select("id, user_id").ilike("email", email)
    .order("created_at", { ascending: false }).limit(10);
  const existing = (userId && existingRows?.find((r) => r.user_id === userId)) || existingRows?.[0] || null;

  let candidateId = existing?.id as string | undefined;
  if (!candidateId) {
    const firstName = (typeof c.first_name === "string" && c.first_name.trim()) ? c.first_name.trim() : (name.split(" ")[0] || null);
    const lastName = (typeof c.last_name === "string" && c.last_name.trim()) ? c.last_name.trim() : (name.includes(" ") ? name.slice(name.indexOf(" ") + 1).trim() : null);
    const { data: cand, error: cErr } = await admin.from("candidates").insert({
      name, first_name: firstName, last_name: lastName, email,
      phone: c.phone ?? null, location: c.location ?? null,
      city: c.city ?? null, country_code: c.country_code ?? null,
      skills, experience_years: expYears, summary: c.summary ?? null,
      education_level: educationLevel,
      cv_url: typeof c.cv_url === "string" && c.cv_url ? c.cv_url : null,
      user_id: userId, source: "job_board",
    }).select("id").single();
    if (cErr) return jsonError(cErr.message, 500);
    candidateId = cand.id;
    // Persistencia estructurada del perfil confirmado (solo candidato NUEVO — H3:
    // no pisamos el perfil de un candidato existente desde un endpoint público).
    const skillIds = await resolveSkillIds(admin, skills);
    if (skillIds.length) await admin.from("candidate_skills").insert(skillIds.map((skill_id) => ({ candidate_id: candidateId!, skill_id, source: "cv" as const })));
    if (exps.length) await admin.from("candidate_experiences").insert(exps.map((e, i) => ({
      candidate_id: candidateId!, title: e.title, company: e.company, seniority: e.seniority,
      start_date: e.start_date, end_date: e.end_date, is_current: e.is_current, order_index: i, source: "cv",
    })));
    if (langs.length) await admin.from("candidate_languages").insert(langs.map((l) => ({
      candidate_id: candidateId!, language: l.language, level: l.level, source: "cv",
    })));
    if (edus.length) await admin.from("candidate_education").insert(edus.map((e, i) => ({
      candidate_id: candidateId!, degree: e.degree, institution: e.institution, field: e.field,
      level: e.level, start_year: e.start_year, end_year: e.end_year, order_index: i, source: "cv",
    })));
  } else if (userId && !existing?.user_id) {
    await admin.from("candidates").update({ user_id: userId }).eq("id", candidateId); // vincular a la cuenta
  }

  // Fit de dos lados (recruiter) + screening
  const candSkillIds = await resolveSkillIds(admin, skills);
  const fit = computeRecruiterFit({
    job: {
      skills: (jobSkills ?? []).map((s) => ({ skillId: s.skill_id, requirement: (s.requirement ?? "deseable") as JobSkillReq["requirement"] })),
      experienceMinYears: job.experience_min_years ?? 0, educationLevel: job.education_level as EducationLevel | null,
      seniorityLevel: job.seniority_level as SeniorityLevel | null, country: job.country_code, city: job.city, location: job.location,
    },
    candidate: {
      skillIds: candSkillIds, experienceYears: expYears,
      educationLevel, seniorityLevel: (c.seniority_level ?? null) as SeniorityLevel | null,
      country: c.country_code ?? null, city: c.city ?? null, location: c.location ?? null,
    },
  });
  const screening = computeScreeningOutcome(
    (questions ?? []).map((q) => ({ id: q.id, mode: q.mode, weight: q.weight, filter_rule: q.filter_rule })),
    answers
  );
  const fitScore = Math.max(0, Math.min(100, fit.score + screening.weightedDelta));

  // Etapa inicial + candidatura
  const { data: firstStage } = await admin.from("job_stages").select("id").eq("job_id", job.id).order("order_index").limit(1).maybeSingle();
  const { data: application, error: aErr } = await admin.from("applications").insert({
    job_id: job.id, candidate_id: candidateId, stage_id: firstStage?.id ?? null,
    fit_score: fitScore, source: "job_board",
    utm: { utm_source: "job_board", utm_medium: "organic" },
  }).select("id").single();
  if (aErr) {
    if (aErr.code === "23505") return jsonError("Ya has aplicado a esta oferta", 409);
    return jsonError(aErr.message, 500);
  }

  // Respuestas de screening (server-side)
  if (questions?.length) {
    const rows = questions.filter((q) => answers[q.id] != null).map((q) => ({ application_id: application.id, question_id: q.id, answer: answers[q.id] as object }));
    if (rows.length) await admin.from("application_screening_answers").insert(rows);
  }

  await admin.from("application_events").insert({
    application_id: application.id, type: "created", to_stage: "Aplicado",
    reason: screening.autoDiscard ? "Candidatura del job board — descartada por screening (regla de la empresa)" : "Candidatura recibida desde el job board",
  });

  // Nota: el email de recuperación de cuenta NO se manda aquí. Un barrido diario
  // (Vercel Cron → /api/cron/activation-emails) contacta a los invitados que aplicaron
  // y no crearon cuenta. Así no le llega a quien sí la crea en el paso de "Enviada".

  return NextResponse.json({
    ok: true, application_id: application.id,
    fit_score: fitScore, meets_requirements: fit.meetsHardRequirements, auto_discarded: screening.autoDiscard,
  });
}
