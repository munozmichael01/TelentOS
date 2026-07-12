import { NextResponse } from "next/server";
import { requireApiRole, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";
import { dedupeStrings, resolveSkillIds } from "@/lib/skills";
import { computeFitScore } from "@/lib/fit-score";

/**
 * Confirmación del perfil extraído por el CV-parser (agentes P1).
 * El agente propone → RR.HH. revisa/edita → confirma aquí (invariante: los agentes
 * nunca escriben directo). Este endpoint es la frontera de estructuración:
 *  - resuelve cada skill (texto) contra el catálogo canónico (alias → nombre), creando
 *    las nuevas, y persiste `candidate_skills` (fuente de verdad matcheable);
 *  - forward-compatible: si llegan `experiences[]` / `city` / `country_code` estructurados
 *    (Fase 2 del agente), los persiste; si no, deja esas partes intactas.
 * Requiere migración 0027 aplicada.
 */

type Body = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  summary?: string | null;
  experience_years?: number;
  skills?: string[];
  // Fase 2 (opcionales): estructura completa
  city?: string | null;
  country_code?: string | null;
  experiences?: Array<{
    title: string;
    company?: string | null;
    seniority?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    is_current?: boolean;
  }>;
  languages?: Array<{
    language: string;
    level?: string | null; // a1|a2|b1|b2|c1|c2|native
  }>;
  education?: Array<{
    degree: string;
    institution?: string | null;
    field?: string | null;
    start_year?: number | null;
    end_year?: number | null;
  }>;
};

const LANGUAGE_LEVELS = new Set(["a1", "a2", "b1", "b2", "c1", "c2", "native"]);

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { companyId, error } = await requireApiRole(["owner", "hr_admin", "recruiter"]);
  if (error) return error;

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body) return jsonError("Cuerpo inválido", 400);

  const db = createAdminClient();
  const candidateId = params.id;

  // Verificar que el candidato pertenece a la empresa (vía application → job).
  const { data: link } = await db
    .from("applications")
    .select("id, jobs!inner(company_id)")
    .eq("candidate_id", candidateId)
    .eq("jobs.company_id", companyId!)
    .limit(1)
    .maybeSingle();
  if (!link) return jsonError("Candidato no encontrado en tu empresa", 404);

  // 1. Patch de los campos planos del candidato (incluye skills text[] denormalizado
  //    para display; la fuente estructurada es candidate_skills).
  const normalizedSkills = dedupeStrings(body.skills ?? []);
  const patch: Record<string, unknown> = {};
  if ("name" in body && body.name) patch.name = body.name;
  if ("email" in body && body.email) patch.email = body.email;
  if ("phone" in body) patch.phone = body.phone ?? null;
  if ("location" in body) patch.location = body.location ?? null;
  if ("summary" in body) patch.summary = body.summary ?? null;
  if (typeof body.experience_years === "number") patch.experience_years = body.experience_years;
  if ("city" in body) patch.city = body.city ?? null;
  if ("country_code" in body) patch.country_code = body.country_code ?? null;
  if (body.skills) patch.skills = normalizedSkills;

  if (Object.keys(patch).length > 0) {
    const { error: patchErr } = await db.from("candidates").update(patch).eq("id", candidateId);
    if (patchErr) return jsonError(`No se pudo actualizar el candidato: ${patchErr.message}`, 500);
  }

  // 2. Resolver skills contra el catálogo y reescribir candidate_skills.
  if (body.skills) {
    const skillIds = await resolveSkillIds(db, normalizedSkills);
    await db.from("candidate_skills").delete().eq("candidate_id", candidateId);
    if (skillIds.length > 0) {
      const { error: csErr } = await db.from("candidate_skills").insert(
        skillIds.map((skill_id) => ({ candidate_id: candidateId, skill_id, source: "cv" as const })),
      );
      if (csErr) return jsonError(`No se pudieron guardar las skills: ${csErr.message}`, 500);
    }
  }

  // 3. Experiencias estructuradas (Fase 2): reemplazo completo si llegan.
  if (Array.isArray(body.experiences)) {
    await db.from("candidate_experiences").delete().eq("candidate_id", candidateId);
    if (body.experiences.length > 0) {
      const { error: expErr } = await db.from("candidate_experiences").insert(
        body.experiences.map((e, idx) => ({
          candidate_id: candidateId,
          title: e.title,
          company: e.company ?? null,
          seniority: e.seniority ?? null,
          start_date: e.start_date ?? null,
          end_date: e.end_date ?? null,
          is_current: e.is_current ?? false,
          order_index: idx,
          source: "cv",
        })),
      );
      if (expErr) return jsonError(`No se pudieron guardar las experiencias: ${expErr.message}`, 500);
    }
  }

  // 4. Idiomas (nivel normalizado a CEFR/native; desconocido → null).
  if (Array.isArray(body.languages)) {
    await db.from("candidate_languages").delete().eq("candidate_id", candidateId);
    const langs = body.languages.filter((l) => l.language?.trim());
    if (langs.length > 0) {
      const seen = new Set<string>();
      const rows = langs.flatMap((l) => {
        const key = l.language.trim().toLowerCase();
        if (seen.has(key)) return [];
        seen.add(key);
        const level = l.level?.toLowerCase() ?? null;
        return [{
          candidate_id: candidateId,
          language: l.language.trim(),
          level: level && LANGUAGE_LEVELS.has(level) ? level : null,
          source: "cv",
        }];
      });
      const { error: langErr } = await db.from("candidate_languages").insert(rows);
      if (langErr) return jsonError(`No se pudieron guardar los idiomas: ${langErr.message}`, 500);
    }
  }

  // 5. Educación estructurada: reemplazo completo si llega.
  if (Array.isArray(body.education)) {
    await db.from("candidate_education").delete().eq("candidate_id", candidateId);
    const edu = body.education.filter((e) => e.degree?.trim());
    if (edu.length > 0) {
      const { error: eduErr } = await db.from("candidate_education").insert(
        edu.map((e, idx) => ({
          candidate_id: candidateId,
          degree: e.degree.trim(),
          institution: e.institution ?? null,
          field: e.field ?? null,
          start_year: e.start_year ?? null,
          end_year: e.end_year ?? null,
          order_index: idx,
          source: "cv",
        })),
      );
      if (eduErr) return jsonError(`No se pudo guardar la educación: ${eduErr.message}`, 500);
    }
  }

  // 6. Re-puntuar las candidaturas del candidato: su perfil cambió, el fit_score
  //    debe reflejarlo (solape canónico candidato∩oferta cuando ambos lados están
  //    estructurados; ver lib/fit-score.ts).
  const { data: freshCand } = await db
    .from("candidates")
    .select("skills, experience_years, location, city, country_code")
    .eq("id", candidateId)
    .single();
  const { data: candSkillRows } = await db
    .from("candidate_skills")
    .select("skill_id")
    .eq("candidate_id", candidateId);
  const candidateSkillIds = (candSkillRows ?? []).map((r) => r.skill_id as string);

  const { data: apps } = await db
    .from("applications")
    .select("id, job_id, jobs!inner(skills, experience_min_years, location, city, country_code)")
    .eq("candidate_id", candidateId);

  for (const app of (apps ?? []) as unknown as Array<{
    id: string;
    job_id: string;
    jobs: { skills: string[]; experience_min_years: number; location: string | null; city: string | null; country_code: string | null };
  }>) {
    const { data: jobSkillRows } = await db
      .from("job_skills")
      .select("skill_id")
      .eq("job_id", app.job_id);
    const score = computeFitScore(
      {
        skills: (freshCand?.skills as string[]) ?? [],
        experience_years: (freshCand?.experience_years as number) ?? 0,
        location: (freshCand?.location as string | null) ?? null,
      },
      app.jobs,
      {
        candidateSkillIds,
        jobSkillIds: (jobSkillRows ?? []).map((r) => r.skill_id as string),
        candidateCity: freshCand?.city as string | null,
        candidateCountry: freshCand?.country_code as string | null,
        jobCity: app.jobs.city,
        jobCountry: app.jobs.country_code,
      },
    );
    await db.from("applications").update({ fit_score: score }).eq("id", app.id);
  }

  return NextResponse.json({ ok: true, skills: normalizedSkills, rescored: (apps ?? []).length });
}
