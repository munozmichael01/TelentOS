import type { SupabaseClient } from "@supabase/supabase-js";

// Competencias EVALUABLES de un puesto, derivadas de la taxonomía (job_title_skills).
// No existe catálogo de competencias propio y no debe existir: el conjunto esperado de un cargo
// ya vive en la taxonomía ESCO, con peso e is_core. Es el mismo eje de skills con el que se
// recluta, así que la brecha detectada en una evaluación es comparable con el fit de selección.
//
// Herencia del modelo de dos niveles (migr. 0066): un cargo de mercado ("Frontend Engineer")
// normalmente no declara skills propias y hereda las de su ancla ESCO ("software developer").
// Si algún día declara las suyas, ganan las propias y no se mezclan con las del padre.

export type RoleCompetencies = {
  titleId: string;
  titleLabel: string;
  /** Etiqueta del ancla si las competencias se heredan; null si son propias del cargo. */
  inheritedFrom: string | null;
  core: string[];
  optional: string[];
};

type SkillRow = {
  is_core: boolean;
  weight: number | null;
  skills: { name: string; skill_translations: { name: string; locale: string }[] } | null;
};

/** Nombre de la skill en el idioma pedido, con el canónico como respaldo. */
function labelOf(row: SkillRow, lang: string): string | null {
  const s = row.skills;
  if (!s) return null;
  return s.skill_translations?.find((t) => t.locale === lang)?.name ?? s.name ?? null;
}

async function skillsFor(db: SupabaseClient, titleId: string, lang: string) {
  const { data } = await db
    .from("job_title_skills")
    .select("is_core, weight, skills(name, skill_translations(name, locale))")
    .eq("job_title_id", titleId)
    .order("is_core", { ascending: false })
    .order("weight", { ascending: false });
  const rows = (data ?? []) as unknown as SkillRow[];
  const core: string[] = [], optional: string[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    const label = labelOf(r, lang);
    if (!label || seen.has(label.toLowerCase())) continue;
    seen.add(label.toLowerCase());
    (r.is_core ? core : optional).push(label);
  }
  return { core, optional };
}

/**
 * Competencias del cargo de una persona. `null` si la ficha no tiene cargo canónico resuelto
 * (hoy ~12% de las fichas): en ese caso la UI pide vincularlo, nunca inventa competencias.
 */
export async function getRoleCompetencies(
  db: SupabaseClient,
  jobTitleId: string | null,
  locale: string,
): Promise<RoleCompetencies | null> {
  if (!jobTitleId) return null;
  const lang = locale.split("-")[0];

  const { data: title } = await db
    .from("job_titles")
    .select("id, canonical_name, level, parent_title_id, job_title_translations(name, locale)")
    .eq("id", jobTitleId)
    .maybeSingle();
  if (!title) return null;

  const t = title as unknown as {
    id: string; canonical_name: string; level: string; parent_title_id: string | null;
    job_title_translations: { name: string; locale: string }[];
  };
  const titleLabel = t.job_title_translations?.find((x) => x.locale === lang)?.name ?? t.canonical_name;

  let { core, optional } = await skillsFor(db, t.id, lang);
  let inheritedFrom: string | null = null;

  if (!core.length && !optional.length && t.parent_title_id) {
    const parent = await db
      .from("job_titles")
      .select("canonical_name, job_title_translations(name, locale)")
      .eq("id", t.parent_title_id)
      .maybeSingle();
    const p = parent.data as unknown as { canonical_name: string; job_title_translations: { name: string; locale: string }[] } | null;
    if (p) {
      const inherited = await skillsFor(db, t.parent_title_id, lang);
      core = inherited.core;
      optional = inherited.optional;
      inheritedFrom = p.job_title_translations?.find((x) => x.locale === lang)?.name ?? p.canonical_name;
    }
  }

  return { titleId: t.id, titleLabel, inheritedFrom, core, optional };
}
