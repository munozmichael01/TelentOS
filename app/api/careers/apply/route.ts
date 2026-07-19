import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { computeFitScore } from "@/lib/fit-score";
import { jsonError } from "@/lib/api";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { dedupeStrings, resolveSkillIds } from "@/lib/skills";
import { EDUCATION_RANK, highestEducationLevel } from "@/lib/education";
import type { EducationLevel } from "@/lib/types";

const LANGUAGE_LEVELS = new Set(["a1", "a2", "b1", "b2", "c1", "c2", "native"]);

/** Perfil validado por el candidato en la modal (Parte B). Todo opcional y saneado. */
type ValidatedProfile = {
  city: string | null;
  country_code: string | null;
  summary: string | null;
  experience_years: number;
  skills: string[];
  experiences: Array<{ title: string; company: string | null; seniority: string | null; start_date: string | null; end_date: string | null; is_current: boolean }>;
  languages: Array<{ language: string; level: string | null }>;
  education: Array<{ degree: string; institution: string | null; field: string | null; level: EducationLevel | null; start_year: number | null; end_year: number | null }>;
};

function parseCvProfile(raw: string | null): ValidatedProfile | null {
  if (!raw) return null;
  let p: Record<string, unknown>;
  try { p = JSON.parse(raw) as Record<string, unknown>; } catch { return null; }
  if (typeof p !== "object" || !p) return null;
  const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  const s = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
  return {
    city: s(p.city),
    country_code: s(p.country_code)?.toUpperCase().slice(0, 2) ?? null,
    summary: s(p.summary),
    experience_years: typeof p.experience_years === "number" && p.experience_years >= 0 ? Math.floor(p.experience_years) : 0,
    skills: dedupeStrings(arr<string>(p.skills).filter((x) => typeof x === "string")).slice(0, 40),
    experiences: arr<Record<string, unknown>>(p.experiences).filter((e) => s(e.title)).slice(0, 12).map((e) => ({
      title: String(e.title).trim(),
      company: s(e.company), seniority: s(e.seniority),
      start_date: s(e.start_date), end_date: s(e.end_date),
      is_current: e.is_current === true,
    })),
    languages: arr<Record<string, unknown>>(p.languages).filter((l) => s(l.language)).slice(0, 20).map((l) => {
      const lvl = s(l.level)?.toLowerCase() ?? null;
      return { language: String(l.language).trim(), level: lvl && LANGUAGE_LEVELS.has(lvl) ? lvl : null };
    }),
    education: arr<Record<string, unknown>>(p.education).filter((e) => s(e.degree)).slice(0, 12).map((e) => {
      const lvl = s(e.level)?.toLowerCase() ?? null;
      return {
        degree: String(e.degree).trim(), institution: s(e.institution), field: s(e.field),
        level: lvl && lvl in EDUCATION_RANK ? (lvl as EducationLevel) : null,
        start_year: typeof e.start_year === "number" ? e.start_year : null,
        end_year: typeof e.end_year === "number" ? e.end_year : null,
      };
    }),
  };
}

const CV_MIME_ALLOWED = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Endpoint PÚBLICO del career site. Usa service_role en lugar de abrir INSERT
 * a anon por RLS: así controlamos exactamente qué se escribe y validamos la
 * oferta. Las candidaturas llevan UTM de origen para distinguirlas de las de
 * job boards.
 */
export async function POST(req: Request) {
  // Público y sin auth: límite por IP contra spam/scripts (auditoría H3)
  if (!(await rateLimit(`careers-apply:${clientIp(req)}`, 5, 10 * 60_000))) {
    return jsonError("Demasiadas solicitudes. Inténtalo de nuevo en unos minutos.", 429);
  }

  const supabase = createAdminClient();
  const formData = await req.formData().catch(() => null);
  if (!formData) return jsonError("Formulario inválido");

  const jobId = String(formData.get("job_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!jobId || !name || !email) return jsonError("Nombre, email y oferta son obligatorios");
  if (!EMAIL_RE.test(email)) return jsonError("El email no es válido");

  const { data: job } = await supabase
    .from("jobs")
    .select("id, company_id, skills, experience_min_years, location, status")
    .eq("id", jobId)
    .eq("status", "active")
    .maybeSingle();
  if (!job) return jsonError("La oferta no está disponible", 404);

  // CV opcional → bucket privado `cvs`
  let cvUrl: string | null = null;
  const cv = formData.get("cv") as File | null;
  if (cv && cv.size > 0) {
    if (cv.size > 8 * 1024 * 1024) return jsonError("El CV no puede superar 8 MB");
    if (!CV_MIME_ALLOWED.includes(cv.type)) return jsonError("Formato de CV no admitido (PDF o Word)");
    const path = `${jobId}/${Date.now()}-${cv.name.replace(/[^\w.\-]/g, "_")}`;
    const { error: upErr } = await supabase.storage
      .from("cvs")
      .upload(path, cv, { contentType: cv.type || "application/pdf" });
    if (!upErr) cvUrl = path; // se guarda el path; la UI interna genera signed URLs
  }

  const location = String(formData.get("location") ?? "").trim() || null;

  // Perfil estructurado validado por el candidato en la modal (opcional).
  const validated = parseCvProfile(formData.get("cv_profile") ? String(formData.get("cv_profile")) : null);

  // Dedupe de candidato por email
  const { data: existingCandidate } = await supabase
    .from("candidates")
    .select("id, phone, location, cv_url, skills, experience_years, summary, city, country_code")
    .ilike("email", email)
    .maybeSingle();

  const phone = String(formData.get("phone") ?? "").trim() || null;

  let candidateId = existingCandidate?.id;
  let isNewCandidate = false;
  if (!candidateId) {
    isNewCandidate = true;
    // Candidato nuevo: el dueño del dato validó su propio perfil → lo persistimos entero.
    const { data: candidate, error: candErr } = await supabase
      .from("candidates")
      .insert({
        name,
        email,
        phone,
        location,
        skills: validated?.skills ?? [],
        experience_years: validated?.experience_years ?? 0,
        cv_url: cvUrl,
        summary: validated?.summary ?? null,
        city: validated?.city ?? null,
        country_code: validated?.country_code ?? null,
        education_level: validated ? highestEducationLevel(validated.education.map((e) => e.level)) : null,
        source: "career_site",
      })
      .select("id")
      .single();
    if (candErr) return jsonError(candErr.message, 500);
    candidateId = candidate.id;
  } else {
    // Candidato existente: SOLO completar campos vacíos, nunca sobrescribir.
    // Este endpoint es público y sin verificación de identidad: cualquiera que
    // conozca el email podría reemplazar el CV/teléfono de otra persona
    // (data poisoning, auditoría H3). Actualizar datos verificados requiere
    // un flujo con confirmación por email (fuera de alcance por ahora).
    const patch: Record<string, unknown> = {};
    if (phone && !existingCandidate?.phone) patch.phone = phone;
    if (location && !existingCandidate?.location) patch.location = location;
    if (cvUrl && !existingCandidate?.cv_url) patch.cv_url = cvUrl;
    if (validated) {
      const hasSkills = Array.isArray(existingCandidate?.skills) && existingCandidate!.skills.length > 0;
      if (validated.skills.length > 0 && !hasSkills) patch.skills = validated.skills;
      if (validated.experience_years > 0 && !existingCandidate?.experience_years) patch.experience_years = validated.experience_years;
      if (validated.summary && !existingCandidate?.summary) patch.summary = validated.summary;
      if (validated.city && !existingCandidate?.city) patch.city = validated.city;
      if (validated.country_code && !existingCandidate?.country_code) patch.country_code = validated.country_code;
    }
    if (Object.keys(patch).length > 0) {
      await supabase.from("candidates").update(patch).eq("id", candidateId);
    }
  }

  // Persistencia estructurada (candidate_skills/experiences/languages/education):
  // solo para candidatos NUEVOS. Para uno existente no pisamos su perfil establecido
  // desde un endpoint público sin verificación de identidad (H3).
  if (validated && isNewCandidate && candidateId) {
    const skillIds = await resolveSkillIds(supabase, validated.skills);
    if (skillIds.length > 0) {
      await supabase.from("candidate_skills").insert(
        skillIds.map((skill_id) => ({ candidate_id: candidateId!, skill_id, source: "cv" as const })),
      );
    }
    if (validated.experiences.length > 0) {
      await supabase.from("candidate_experiences").insert(
        validated.experiences.map((e, idx) => ({
          candidate_id: candidateId!, title: e.title, company: e.company, seniority: e.seniority,
          start_date: e.start_date, end_date: e.end_date, is_current: e.is_current, order_index: idx, source: "cv",
        })),
      );
    }
    if (validated.languages.length > 0) {
      await supabase.from("candidate_languages").insert(
        validated.languages.map((l) => ({ candidate_id: candidateId!, language: l.language, level: l.level, source: "cv" })),
      );
    }
    if (validated.education.length > 0) {
      await supabase.from("candidate_education").insert(
        validated.education.map((e, idx) => ({
          candidate_id: candidateId!, degree: e.degree, institution: e.institution, field: e.field,
          level: e.level, start_year: e.start_year, end_year: e.end_year, order_index: idx, source: "cv",
        })),
      );
    }
  }

  // Etapa inicial del pipeline de la oferta
  const { data: firstStage } = await supabase
    .from("job_stages")
    .select("id")
    .eq("job_id", jobId)
    .order("order_index")
    .limit(1)
    .maybeSingle();

  // Con perfil validado, el fit score ya opera sobre datos reales (no un perfil vacío).
  const fitScore = computeFitScore(
    {
      skills: validated?.skills ?? [],
      experience_years: validated?.experience_years ?? 0,
      location,
    },
    { skills: job.skills, experience_min_years: job.experience_min_years, location: job.location }
  );

  // UTM: el career site marca su origen; si la URL traía utm_* se respetan
  const utm = {
    utm_source: String(formData.get("utm_source") ?? "career_site"),
    utm_medium: String(formData.get("utm_medium") ?? "organic"),
    utm_campaign: String(formData.get("utm_campaign") ?? ""),
  };

  const { data: application, error: appErr } = await supabase
    .from("applications")
    .insert({
      job_id: jobId,
      candidate_id: candidateId,
      stage_id: firstStage?.id ?? null,
      fit_score: fitScore,
      source: "career_site",
      utm,
    })
    .select("id")
    .single();
  if (appErr) {
    if (appErr.code === "23505") return jsonError("Ya has aplicado a esta oferta", 409);
    return jsonError(appErr.message, 500);
  }

  await supabase.from("application_events").insert({
    application_id: application.id,
    type: "created",
    to_stage: "Aplicado",
    reason: "Candidatura recibida desde el career site",
  });

  // Registrar evento en métricas del career site
  // Registrar evento en métricas del career site (silencioso si migración 0006 aún no aplicada)
  try {
    await supabase.from("career_site_events").insert({
      company_id: job.company_id,
      event_type: "application",
      job_id: jobId,
    });
  } catch { /* no-op */ }

  return NextResponse.json({ ok: true, application_id: application.id });
}
