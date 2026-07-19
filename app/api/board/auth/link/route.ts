import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api";
import { resolveSkillIds, dedupeStrings } from "@/lib/skills";

/**
 * Vincula la ficha ATS del candidato (candidates) a la cuenta autenticada, por email, y
 * SIEMBRA el perfil (candidate_profiles) desde los datos que ya tenemos del CV — así la
 * completitud y el gate del 1-toque reflejan el CV sin depender de que corra el builder.
 * Solo liga fichas con user_id nulo y solo rellena campos del perfil VACÍOS (no pisa
 * ediciones del usuario).
 */
export async function POST() {
  const { data: { user } } = await createClient().auth.getUser();
  if (!user?.email) return jsonError("No autenticado", 401);
  const admin = createAdminClient();

  // 1. Vincular fichas invitadas por email.
  const { error: linkErr } = await admin
    .from("candidates")
    .update({ user_id: user.id })
    .ilike("email", user.email)
    .is("user_id", null);
  if (linkErr) return jsonError(linkErr.message, 500);

  // 2. Sembrar el perfil desde el CV ya parseado (candidate_* ligadas).
  const { data: cands } = await admin
    .from("candidates")
    .select("id, name, first_name, last_name, phone, city, country_code, experience_years, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (cands && cands.length) {
    const ids = cands.map((c) => c.id);
    const info = cands[0]; // ficha más reciente para los escalares
    const [{ data: edus }, { data: langs }, { data: cskills }, { data: profile }] = await Promise.all([
      admin.from("candidate_education").select("degree, institution, field, level, start_year, end_year").in("candidate_id", ids).order("order_index"),
      admin.from("candidate_languages").select("language, level").in("candidate_id", ids),
      admin.from("candidate_skills").select("skills(name)").in("candidate_id", ids),
      admin.from("candidate_profiles").select("*").eq("user_id", user.id).maybeSingle(),
    ]);

    const empty = (v: unknown) => v == null || (typeof v === "string" && v.trim() === "");
    const emptyArr = (v: unknown) => !Array.isArray(v) || v.length === 0;
    const patch: Record<string, unknown> = { user_id: user.id, email: user.email };
    if (empty(profile?.full_name)) patch.full_name = info.name ?? null;
    if (empty(profile?.first_name)) patch.first_name = info.first_name ?? null;
    if (empty(profile?.last_name)) patch.last_name = info.last_name ?? null;
    if (empty(profile?.phone)) patch.phone = info.phone ?? null;
    if (empty(profile?.city)) patch.city = info.city ?? null;
    if (empty(profile?.country_code)) patch.country_code = info.country_code ?? null;
    if (profile?.experience_years == null && info.experience_years != null) patch.experience_years = info.experience_years;
    if (emptyArr(profile?.education) && edus?.length) patch.education = edus;
    if (emptyArr(profile?.languages) && langs?.length) patch.languages = langs;

    const { data: saved } = await admin.from("candidate_profiles").upsert(patch, { onConflict: "user_id" }).select("id").single();

    // Skills: si el perfil aún no tiene, sembrar desde las del candidato.
    if (saved) {
      const { data: existingPS } = await admin.from("candidate_profile_skills").select("skill_id").eq("profile_id", saved.id).limit(1);
      if (!existingPS?.length) {
        const names = dedupeStrings((cskills ?? []).map((r) => (r.skills as { name?: string } | null)?.name).filter(Boolean) as string[]);
        const skillIds = await resolveSkillIds(admin, names);
        if (skillIds.length) await admin.from("candidate_profile_skills").insert(skillIds.map((skill_id) => ({ profile_id: saved.id, skill_id })));
      }
    }
  }

  return NextResponse.json({ ok: true });
}
