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

async function loadIndex(): Promise<Index> {
  const db = createAdminClient();
  const byNorm = new Map<string, Set<string>>();
  const labelsByTitle = new Map<string, string[]>();
  // Paginado defensivo por si la taxonomía crece más allá del page size por defecto.
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("job_title_aliases")
      .select("title_id, label, norm")
      .range(from, from + PAGE - 1);
    if (error || !data?.length) break;
    for (const a of data as { title_id: string; label: string; norm: string }[]) {
      (byNorm.get(a.norm) ?? byNorm.set(a.norm, new Set()).get(a.norm)!).add(a.title_id);
      (labelsByTitle.get(a.title_id) ?? labelsByTitle.set(a.title_id, []).get(a.title_id)!).push(a.label);
    }
    if (data.length < PAGE) break;
  }
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
