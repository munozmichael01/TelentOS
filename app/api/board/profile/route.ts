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
  if (candidateIds.length) {
    const { data: apps } = await admin
      .from("applications")
      .select("id, created_at, fit_score, source, stage_id, job:jobs(id, title, city, modality, company:companies(name, logo_url))")
      .in("candidate_id", candidateIds)
      .order("created_at", { ascending: false })
      .limit(50);
    applications = apps ?? [];
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

  return NextResponse.json({ profile: profile ?? null, skills: skillNames, completeness, applications });
}

const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);

export async function PUT(req: Request) {
  const user = await authUser();
  if (!user) return jsonError("No autenticado", 401);
  const admin = createAdminClient();
  const uid = user.id;
  const body = await req.json().catch(() => null);
  if (!body) return jsonError("Cuerpo inválido");

  // Upsert del perfil (solo campos permitidos; user_id fijado por sesión)
  const patch = {
    user_id: uid,
    full_name: body.full_name ?? null,
    email: (body.email ?? user.email ?? null),
    phone: body.phone ?? null,
    headline: body.headline ?? null,
    about: body.about ?? null,
    city: body.city ?? null,
    country_code: body.country_code ? String(body.country_code).toUpperCase().slice(0, 2) : null,
    experience_years: typeof body.experience_years === "number" ? Math.max(0, Math.floor(body.experience_years)) : null,
    education: Array.isArray(body.education) ? body.education : [],
    languages: Array.isArray(body.languages) ? body.languages : [],
    pref_salary_min: typeof body.pref_salary_min === "number" ? body.pref_salary_min : null,
    pref_currency: body.pref_currency ?? null,
    pref_modality: strArr(body.pref_modality),
    pref_locations: strArr(body.pref_locations),
    pref_contract: strArr(body.pref_contract),
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
