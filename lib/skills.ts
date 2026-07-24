/**
 * Resolución de skills contra el catálogo canónico (migración 0027).
 * Compartida por el endpoint admin /cv-profile y el flujo público de inscripción
 * (career site): texto libre → skill_id canónico (alias→nombre, crea las nuevas).
 */
import type { createAdminClient } from "@/lib/supabase/server";

type AdminDb = ReturnType<typeof createAdminClient>;

/** Dedupe case-insensitive preservando la primera forma escrita. */
export function dedupeStrings(arr: string[]): string[] {
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
 * Resuelve nombres de skill contra el catálogo: match por nombre (case-insensitive)
 * o por alias; crea la skill si no existe. Devuelve skill_ids únicos.
 */
export async function resolveSkillIds(db: AdminDb, names: string[]): Promise<string[]> {
  if (names.length === 0) return [];

  // Normalización (minúsculas, sin acentos) para casar variantes.
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

  // Resolver contra el catálogo canónico + aliases + skill_synonyms (ESCO). Así "Excel" y
  // "Microsoft Excel" caen en la MISMA skill en vez de crear duplicados (dedup de matching).
  const [{ data: catalog }, { data: syns }] = await Promise.all([
    db.from("skills").select("id, name, aliases"),
    db.from("skill_synonyms").select("skill_id, synonym"),
  ]);
  const byKey = new Map<string, string>(); // norm(name|alias|synonym) → id
  for (const s of (catalog ?? []) as { id: string; name: string; aliases: string[] }[]) {
    byKey.set(norm(s.name), s.id);
    for (const a of s.aliases ?? []) byKey.set(norm(a), s.id);
  }
  for (const r of (syns ?? []) as { skill_id: string; synonym: string }[]) {
    if (!byKey.has(norm(r.synonym))) byKey.set(norm(r.synonym), r.skill_id);
  }

  const ids: string[] = [];
  const toCreate: string[] = [];
  for (const name of names) {
    const hit = byKey.get(norm(name));
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

  return Array.from(new Set(ids)); // dedupe: dos alias pueden mapear a la misma skill
}
