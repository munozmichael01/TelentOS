import { createAdminClient } from "@/lib/supabase/server";

// Anclaje de job titles: expande el término de rol del usuario ("cocinero", "product owner")
// a sus sinónimos y variantes localizadas (es/en/pt) usando la taxonomía en BBDD
// (job_title_aliases). Reference data pequeña → se cachea el índice en memoria con TTL, así
// las altas del agente de poblado (source='agent') propagan sin reiniciar.

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

type Index = { byNorm: Map<string, Set<string>>; labelsByTitle: Map<string, string[]> };
let cache: { idx: Index; at: number } | null = null;
const TTL_MS = 15 * 60 * 1000;

async function pageAll(
  db: ReturnType<typeof createAdminClient>,
  table: string,
  cols: string,
): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db.from(table).select(cols).range(from, from + PAGE - 1);
    if (error || !data?.length) break;
    out.push(...(data as unknown as Record<string, unknown>[]));
    if (data.length < PAGE) break;
  }
  return out;
}

// Índice desde el esquema OFICIAL de taxonomía: canónico (job_titles) + traducciones
// (job_title_translations) + sinónimos (job_title_synonyms). norm = minúsculas sin acentos
// (en JS) para casar con el término normalizado del usuario.
async function loadIndex(): Promise<Index> {
  const db = createAdminClient();
  const byNorm = new Map<string, Set<string>>();
  const labelsByTitle = new Map<string, string[]>();
  const add = (titleId: string, label: string) => {
    if (!label) return;
    const n = norm(label);
    if (n.length < 2) return;
    (byNorm.get(n) ?? byNorm.set(n, new Set()).get(n)!).add(titleId);
    (labelsByTitle.get(titleId) ?? labelsByTitle.set(titleId, []).get(titleId)!).push(label);
  };
  const [titles, translations, synonyms] = await Promise.all([
    pageAll(db, "job_titles", "id, canonical_name"),
    pageAll(db, "job_title_translations", "job_title_id, name"),
    pageAll(db, "job_title_synonyms", "job_title_id, synonym"),
  ]);
  for (const t of titles) add(t.id as string, t.canonical_name as string);
  for (const t of translations) add(t.job_title_id as string, t.name as string);
  for (const s of synonyms) add(s.job_title_id as string, s.synonym as string);
  return { byNorm, labelsByTitle };
}

async function getIndex(): Promise<Index> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.idx;
  const idx = await loadIndex();
  cache = { idx, at: Date.now() };
  return idx;
}

/**
 * Expande un término de rol a las formas buscables de los títulos que matchean
 * (canónico + traducciones + sinónimos). Devuelve frases (para OR-buscar por título),
 * incluida la original. Vacío si el término es muy corto o no matchea la taxonomía.
 */
// Títulos canónicos que resuelve un término (mismo matching que expandJobTitle) + sus
// relacionados por peso (job_title_relations). Alimenta el ranking de relevancia del board
// y el asistente: un término ("cocinero") puede resolver a varios títulos (grill cook, cook…).
export async function resolveTitleContext(
  q: string,
): Promise<{ titleIds: string[]; relatedIds: string[]; relatedW: number[] }> {
  const empty = { titleIds: [], relatedIds: [], relatedW: [] };
  const nq = norm(q);
  if (nq.length < 4) return empty;
  const idx = await getIndex();
  const set = new Set<string>();
  idx.byNorm.get(nq)?.forEach((id) => set.add(id));
  if (set.size === 0) {
    idx.byNorm.forEach((ids, n) => {
      const [short, long] = n.length <= nq.length ? [n, nq] : [nq, n];
      if (short.length >= 5 && long.includes(short)) ids.forEach((id) => set.add(id));
    });
  }
  const titleIds = Array.from(set);
  if (!titleIds.length) return empty;
  const db = createAdminClient();
  const { data } = await db
    .from("job_title_relations")
    .select("a_id, b_id, weight")
    .or(`a_id.in.(${titleIds.join(",")}),b_id.in.(${titleIds.join(",")})`);
  const rel = new Map<string, number>();
  for (const r of (data ?? []) as { a_id: string; b_id: string; weight: number }[]) {
    const other = set.has(r.a_id) ? r.b_id : r.a_id;
    if (!set.has(other)) rel.set(other, Math.max(rel.get(other) ?? 0, r.weight));
  }
  return { titleIds, relatedIds: Array.from(rel.keys()), relatedW: Array.from(rel.values()) };
}

export async function expandJobTitle(q: string, max = 10): Promise<string[]> {
  const nq = norm(q);
  if (nq.length < 4) return [];
  const idx = await getIndex();

  const titleIds = new Set<string>();
  // 1) match exacto de alias (lo más preciso).
  idx.byNorm.get(nq)?.forEach((id) => titleIds.add(id));
  // 2) si no hubo exacto, containment con la parte corta ≥5 (evita ruido de prefijos cortos).
  if (titleIds.size === 0) {
    idx.byNorm.forEach((ids, n) => {
      const [short, long] = n.length <= nq.length ? [n, nq] : [nq, n];
      if (short.length >= 5 && long.includes(short)) ids.forEach((id) => titleIds.add(id));
    });
  }
  if (titleIds.size === 0) return [];

  const out = new Set<string>([q]);
  titleIds.forEach((id) => {
    for (const label of idx.labelsByTitle.get(id) ?? []) {
      if (out.size < max) out.add(label);
    }
  });
  return Array.from(out).slice(0, max);
}
