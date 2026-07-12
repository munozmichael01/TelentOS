import { NextResponse } from "next/server";
import { requireApiRole, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";

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
};

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

  return NextResponse.json({ ok: true, skills: normalizedSkills });
}

function dedupeStrings(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of arr) {
    const s = raw.trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

/**
 * Resuelve nombres de skill contra el catálogo canónico: match por nombre (case-insensitive)
 * o por alias; crea la skill si no existe. Devuelve los skill_id.
 */
async function resolveSkillIds(
  db: ReturnType<typeof createAdminClient>,
  names: string[],
): Promise<string[]> {
  if (names.length === 0) return [];

  const { data: catalog } = await db.from("skills").select("id, name, aliases");
  const byKey = new Map<string, string>(); // lower(name|alias) → id
  for (const s of (catalog ?? []) as { id: string; name: string; aliases: string[] }[]) {
    byKey.set(s.name.toLowerCase(), s.id);
    for (const a of s.aliases ?? []) byKey.set(a.toLowerCase(), s.id);
  }

  const ids: string[] = [];
  const toCreate: string[] = [];
  for (const name of names) {
    const hit = byKey.get(name.toLowerCase());
    if (hit) ids.push(hit);
    else toCreate.push(name);
  }

  if (toCreate.length > 0) {
    const { data: created } = await db
      .from("skills")
      .insert(toCreate.map((name) => ({ name })))
      .select("id");
    for (const row of (created ?? []) as { id: string }[]) ids.push(row.id);
  }

  // Dedupe por si dos alias mapean a la misma skill.
  return Array.from(new Set(ids));
}
