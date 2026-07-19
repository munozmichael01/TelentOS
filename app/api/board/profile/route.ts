import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api";
import { resolveSkillIds, dedupeStrings } from "@/lib/skills";
import { computeProfileCompleteness } from "@/lib/job-board/completeness";

// Cuenta del candidato: perfil global (1 por auth user), sus skills, completitud (gate
// del 1-toque) y sus candidaturas cross-empresa. Escritura server-side con admin
// scopeado por uid tras el guard (candidate_profiles tiene RLS own; aquí lo imponemos
// explícitamente para evitar bordes con el bypass de service_role).

async function authUser() {
  const { data: { user } } = await createClient().auth.getUser();
  return user;
}

export async function GET() {
  const user = await authUser();
  if (!user) return jsonError("No autenticado", 401);
  const admin = createAdminClient();
  const uid = user.id;

  const { data: profile } = await admin.from("candidate_profiles").select("*").eq("user_id", uid).maybeSingle();
  const [{ data: skillRows }, { data: cands }] = await Promise.all([
    profile
      ? admin.from("candidate_profile_skills").select("skills(name)").eq("profile_id", profile.id)
      : Promise.resolve({ data: [] as { skills: { name?: string } | null }[] }),
    admin.from("candidates").select("id, cv_url").eq("user_id", uid),
  ]);

  const skillNames = (skillRows ?? []).map((r) => (r.skills as { name?: string } | null)?.name).filter(Boolean) as string[];
  const candidateIds = (cands ?? []).map((c) => c.id);
  const hasCv = (cands ?? []).some((c) => !!c.cv_url);

  let applications: unknown[] = [];
  // Datos estructurados que YA tenemos del candidato (parseados de su CV al aplicar),
  // atados a `candidates`. Son la fuente para SEMBRAR el perfil y mostrarlos en Mi cuenta,
  // en vez de pedirlos de cero. Dedupe ligero porque un user puede tener >1 ficha.
  const sourced: {
    experiences: unknown[]; education: unknown[]; languages: unknown[]; skills: string[];
    first_name: string | null; last_name: string | null; phone: string | null; city: string | null; country_code: string | null;
  } = { experiences: [], education: [], languages: [], skills: [], first_name: null, last_name: null, phone: null, city: null, country_code: null };

  if (candidateIds.length) {
    const [{ data: apps }, { data: exps }, { data: edus }, { data: langs }, { data: cskills }, { data: cinfo }] = await Promise.all([
      admin.from("applications").select("id, created_at, fit_score, source, stage_id, status, job:jobs(id, title, city, modality, company:companies(name, logo_url))").in("candidate_id", candidateIds).order("created_at", { ascending: false }).limit(50),
      admin.from("candidate_experiences").select("title, company, seniority, start_date, end_date, is_current").in("candidate_id", candidateIds).order("order_index"),
      admin.from("candidate_education").select("degree, institution, field, level, start_year, end_year").in("candidate_id", candidateIds).order("order_index"),
      admin.from("candidate_languages").select("language, level").in("candidate_id", candidateIds),
      admin.from("candidate_skills").select("skills(name)").in("candidate_id", candidateIds),
      admin.from("candidates").select("first_name, last_name, phone, city, country_code, created_at").in("id", candidateIds).order("created_at", { ascending: false }).limit(1),
    ]);
    // D1 — enriquecer candidaturas para el tracker: etapa actual + pipeline (progreso) +
    // status + último feedback (razón del evento). Datos ya existentes en el ATS.
    const rawApps = (apps ?? []) as Array<{ id: string; stage_id: string | null; status?: string | null; job?: { id?: string } | null }>;
    if (rawApps.length) {
      const jobIds = Array.from(new Set(rawApps.map((a) => a.job?.id).filter(Boolean))) as string[];
      const appIds = rawApps.map((a) => a.id);
      const [{ data: stages }, { data: events }] = await Promise.all([
        jobIds.length ? admin.from("job_stages").select("id, job_id, name, order_index, is_terminal").in("job_id", jobIds).order("order_index") : Promise.resolve({ data: [] as { id: string; job_id: string; name: string; order_index: number; is_terminal: boolean }[] }),
        admin.from("application_events").select("application_id, reason, created_at").in("application_id", appIds).order("created_at", { ascending: false }),
      ]);
      const stagesByJob = new Map<string, { name: string; order_index: number; is_terminal: boolean }[]>();
      const stageNameById = new Map<string, string>();
      for (const s of stages ?? []) {
        stageNameById.set(s.id, s.name);
        const arr = stagesByJob.get(s.job_id) ?? [];
        arr.push({ name: s.name, order_index: s.order_index, is_terminal: s.is_terminal });
        stagesByJob.set(s.job_id, arr);
      }
      const feedbackByApp = new Map<string, { reason: string; created_at: string }>();
      for (const e of events ?? []) {
        if (e.reason && !feedbackByApp.has(e.application_id)) feedbackByApp.set(e.application_id, { reason: e.reason, created_at: e.created_at });
      }
      applications = rawApps.map((a) => ({
        ...a,
        status: a.status ?? "open",
        stage: a.stage_id ? { name: stageNameById.get(a.stage_id) ?? null } : null,
        pipeline: a.job?.id ? (stagesByJob.get(a.job.id) ?? []) : [],
        feedback: feedbackByApp.get(a.id) ?? null,
      }));
    } else {
      applications = [];
    }
    const dedupe = <T,>(rows: T[], key: (r: T) => string) => {
      const seen = new Set<string>(); const out: T[] = [];
      for (const r of rows) { const k = key(r); if (!seen.has(k)) { seen.add(k); out.push(r); } }
      return out;
    };
    sourced.experiences = dedupe(exps ?? [], (e) => `${e.title}|${e.company ?? ""}`);
    sourced.education = dedupe(edus ?? [], (e) => `${e.degree}|${e.institution ?? ""}`);
    sourced.languages = dedupe(langs ?? [], (l) => (l.language ?? "").toLowerCase());
    sourced.skills = dedupeStrings((cskills ?? []).map((r) => (r.skills as { name?: string } | null)?.name).filter(Boolean) as string[]);
    const info = (cinfo ?? [])[0];
    if (info) { sourced.first_name = info.first_name ?? null; sourced.last_name = info.last_name ?? null; sourced.phone = info.phone ?? null; sourced.city = info.city ?? null; sourced.country_code = info.country_code ?? null; }
  }

  const completeness = computeProfileCompleteness({
    full_name: profile?.full_name ?? null,
    email: profile?.email ?? user.email ?? null,
    phone: profile?.phone ?? null,
    about: profile?.about ?? null,
    hasCv,
    city: profile?.city ?? null,
    country_code: profile?.country_code ?? null,
    experience_years: profile?.experience_years ?? null,
    education: (profile?.education as unknown[]) ?? [],
    languages: (profile?.languages as unknown[]) ?? [],
    pref_salary_min: profile?.pref_salary_min ?? null,
    pref_modality: profile?.pref_modality ?? [],
    pref_locations: profile?.pref_locations ?? [],
    pref_contract: profile?.pref_contract ?? [],
    skillCount: skillNames.length,
  });

  return NextResponse.json({ profile: profile ?? null, skills: skillNames, completeness, applications, sourced });
}

const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);

export async function PUT(req: Request) {
  const user = await authUser();
  if (!user) return jsonError("No autenticado", 401);
  const admin = createAdminClient();
  const uid = user.id;
  const body = await req.json().catch(() => null);
  if (!body) return jsonError("Cuerpo inválido");

  // Upsert que PRESERVA campos no enviados: los callers parciales (p. ej. el builder de
  // Perfil IA, que manda headline/about/skills) no deben borrar full_name/email que ya
  // existen. Solo se toca lo que viene en el body; el resto se conserva.
  const { data: existing } = await admin.from("candidate_profiles").select("*").eq("user_id", uid).maybeSingle();
  const has = (k: string) => body[k] !== undefined;
  const patch = {
    user_id: uid,
    full_name: has("full_name") ? (body.full_name || null) : (existing?.full_name ?? null),
    first_name: has("first_name") ? (body.first_name || null) : (existing?.first_name ?? null),
    last_name: has("last_name") ? (body.last_name || null) : (existing?.last_name ?? null),
    email: has("email") ? (body.email || null) : (existing?.email ?? user.email ?? null),
    phone: has("phone") ? (body.phone || null) : (existing?.phone ?? null),
    headline: has("headline") ? (body.headline || null) : (existing?.headline ?? null),
    about: has("about") ? (body.about || null) : (existing?.about ?? null),
    city: has("city") ? (body.city || null) : (existing?.city ?? null),
    country_code: has("country_code")
      ? (body.country_code ? String(body.country_code).toUpperCase().slice(0, 2) : null)
      : (existing?.country_code ?? null),
    experience_years: has("experience_years")
      ? (typeof body.experience_years === "number" ? Math.max(0, Math.floor(body.experience_years)) : null)
      : (existing?.experience_years ?? null),
    education: has("education") ? (Array.isArray(body.education) ? body.education : []) : (existing?.education ?? []),
    languages: has("languages") ? (Array.isArray(body.languages) ? body.languages : []) : (existing?.languages ?? []),
    pref_salary_min: has("pref_salary_min")
      ? (typeof body.pref_salary_min === "number" ? body.pref_salary_min : null)
      : (existing?.pref_salary_min ?? null),
    pref_currency: has("pref_currency") ? (body.pref_currency || null) : (existing?.pref_currency ?? null),
    pref_modality: has("pref_modality") ? strArr(body.pref_modality) : (existing?.pref_modality ?? []),
    pref_locations: has("pref_locations") ? strArr(body.pref_locations) : (existing?.pref_locations ?? []),
    pref_contract: has("pref_contract") ? strArr(body.pref_contract) : (existing?.pref_contract ?? []),
    updated_at: new Date().toISOString(),
  };
  const { data: profile, error } = await admin
    .from("candidate_profiles")
    .upsert(patch, { onConflict: "user_id" })
    .select("*")
    .single();
  if (error) return jsonError(error.message, 500);

  // Sync de skills (nombres → catálogo → candidate_profile_skills)
  let skillNames: string[] = [];
  if (Array.isArray(body.skills)) {
    skillNames = dedupeStrings(body.skills.filter((s: unknown) => typeof s === "string")).slice(0, 50);
    const skillIds = await resolveSkillIds(admin, skillNames);
    await admin.from("candidate_profile_skills").delete().eq("profile_id", profile.id);
    if (skillIds.length) {
      await admin.from("candidate_profile_skills").insert(skillIds.map((skill_id) => ({ profile_id: profile.id, skill_id })));
    }
  } else {
    const { data: existing } = await admin.from("candidate_profile_skills").select("skills(name)").eq("profile_id", profile.id);
    skillNames = (existing ?? []).map((r) => (r.skills as { name?: string } | null)?.name).filter(Boolean) as string[];
  }

  // Completitud (cv_url vive en las fichas ATS del candidato)
  const { data: cands } = await admin.from("candidates").select("cv_url").eq("user_id", uid);
  const hasCv = (cands ?? []).some((c) => !!c.cv_url);
  const completeness = computeProfileCompleteness({
    full_name: profile.full_name, email: profile.email, phone: profile.phone, about: profile.about,
    hasCv, city: profile.city, country_code: profile.country_code, experience_years: profile.experience_years,
    education: (profile.education as unknown[]) ?? [], languages: (profile.languages as unknown[]) ?? [],
    pref_salary_min: profile.pref_salary_min, pref_modality: profile.pref_modality ?? [],
    pref_locations: profile.pref_locations ?? [], pref_contract: profile.pref_contract ?? [], skillCount: skillNames.length,
  });
  await admin.from("candidate_profiles").update({ completeness: completeness.pct }).eq("id", profile.id);

  return NextResponse.json({ profile, skills: skillNames, completeness });
}
