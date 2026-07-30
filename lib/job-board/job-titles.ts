import { createAdminClient } from "@/lib/supabase/server";

// Anclaje de job titles: expande el término de rol del usuario ("cocinero", "product owner")
// a sus sinónimos y variantes localizadas (es/en/pt) usando la taxonomía en BBDD
// (job_title_aliases). Reference data pequeña → se cachea el índice en memoria con TTL, así
// las altas del agente de poblado (source='agent') propagan sin reiniciar.

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

// Stopwords para el matching por token (evita ruido en frases de intención).
const STOP = new Set(["para", "with", "como", "sobre", "trabajo", "empleo", "oferta", "ofertas",
  "junior", "senior", "estudiante", "busco", "buscar", "quiero", "puesto", "vacante"]);
const tokensOf = (s: string) => norm(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 5 && !STOP.has(w));
// Slug de una etiqueta: primera forma de género ("camarero / camarera" → "camarero"), sin acentos.
export const titleSlug = (label: string) =>
  norm(label.split(" / ")[0]).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

type Index = { byNorm: Map<string, Set<string>>; byToken: Map<string, Set<string>>; bySlug: Map<string, Set<string>>; labelsByTitle: Map<string, string[]> };
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
  const byToken = new Map<string, Set<string>>();
  const bySlug = new Map<string, Set<string>>();
  const labelsByTitle = new Map<string, string[]>();
  const add = (titleId: string, label: string) => {
    if (!label) return;
    // Formas de género por separado: ESCO escribe "cocinero / cocinera" y el usuario busca
    // "cocinero". Sin esto la forma normaliza a "cocinero cocinera" y la query exacta NO casa,
    // así que el cargo genérico quedaba fuera de su propia búsqueda (medido con q="cocinero":
    // resolvía a chef/grill cook/fish cook por sinónimos y `cook` no aparecía).
    if (label.includes(" / ")) for (const part of label.split(" / ")) add(titleId, part.trim());
    const n = norm(label);
    if (n.length < 2) return;
    (byNorm.get(n) ?? byNorm.set(n, new Set()).get(n)!).add(titleId);
    (labelsByTitle.get(titleId) ?? labelsByTitle.set(titleId, []).get(titleId)!).push(label);
    for (const tok of tokensOf(label)) (byToken.get(tok) ?? byToken.set(tok, new Set()).get(tok)!).add(titleId);
    const sl = titleSlug(label);
    if (sl.length >= 2) (bySlug.get(sl) ?? bySlug.set(sl, new Set()).get(sl)!).add(titleId);
  };
  const [titles, translations, synonyms] = await Promise.all([
    pageAll(db, "job_titles", "id, canonical_name"),
    pageAll(db, "job_title_translations", "job_title_id, name"),
    pageAll(db, "job_title_synonyms", "job_title_id, synonym"),
  ]);
  for (const t of titles) add(t.id as string, t.canonical_name as string);
  for (const t of translations) add(t.job_title_id as string, t.name as string);
  for (const s of synonyms) add(s.job_title_id as string, s.synonym as string);
  return { byNorm, byToken, bySlug, labelsByTitle };
}

// Resuelve un SLUG de cargo (hub /empleos/{slug}) → títulos canónicos + etiqueta a mostrar.
// Localizado: el slug "camarero" (es) o "waiter" (en) matchea la forma correspondiente.
export async function resolveTitleSlug(
  slug: string,
): Promise<{ titleIds: string[]; label: string } | null> {
  const idx = await getIndex();
  const ids = idx.bySlug.get(slug);
  if (!ids?.size) return null;
  const titleIds = Array.from(ids);
  // Etiqueta: la forma cuyo slug coincide (primera), capitalizada por el consumidor.
  let label = slug.replace(/-/g, " ");
  for (const id of titleIds) {
    const hit = (idx.labelsByTitle.get(id) ?? []).find((l) => titleSlug(l) === slug);
    if (hit) { label = hit.split(" / ")[0]; break; }
  }
  return { titleIds, label };
}

/** Peso mínimo para que un cargo relacionado arrastre sus ofertas a la búsqueda ("de medio
 *  hacia arriba"). El grafo va de 0.25 a 0.95 con un suelo de 0.35 para vecinos de la misma
 *  área sin solape real; 0.5 deja fuera ese ruido y mantiene el parentesco de verdad. */
const RELATED_MIN_WEIGHT = 0.5;

// Títulos que resuelve un término, en 3 niveles: (1) forma exacta, (2) forma contenida en la
// query (parte corta ≥5), (3) SOLAPE POR TOKEN — un token de la query (≥5, no stopword) es un
// token de una forma. El nivel 3 resuelve frases de intención: "estudiante de cocina" → "cocina"
// → cargos de cocina. Solo se usa si los niveles precisos no encontraron nada.
function matchTitleIds(idx: Index, nq: string): Set<string> {
  const set = new Set<string>();
  idx.byNorm.get(nq)?.forEach((id) => set.add(id));
  if (set.size === 0) {
    idx.byNorm.forEach((ids, n) => {
      const [short, long] = n.length <= nq.length ? [n, nq] : [nq, n];
      if (short.length >= 5 && long.includes(short)) ids.forEach((id) => set.add(id));
    });
  }
  if (set.size === 0) {
    for (const tok of tokensOf(nq)) idx.byToken.get(tok)?.forEach((id) => set.add(id));
  }
  return set;
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
  const set = matchTitleIds(idx, nq);
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
  // Solo relacionados de peso MEDIO hacia arriba, y ordenados de mayor a menor. Por debajo del
  // umbral el parentesco es demasiado flojo para arrastrar ofertas a la búsqueda: el grafo tiene
  // un suelo de 0.35 donde caen vecinos de la misma área con poco solape real (buscar "cocinero"
  // no debe traer "doorman" porque comparten área). El orden lo respeta el RPC, que puntúa
  // 500 + peso*100, pero se ordena aquí también para que las dos arrays queden alineadas.
  const ordered = Array.from(rel.entries())
    .filter(([, w]) => w >= RELATED_MIN_WEIGHT)
    .sort((a, b) => b[1] - a[1]);
  return { titleIds, relatedIds: ordered.map(([id]) => id), relatedW: ordered.map(([, w]) => w) };
}

export async function expandJobTitle(q: string, max = 10): Promise<string[]> {
  const nq = norm(q);
  if (nq.length < 4) return [];
  const idx = await getIndex();
  const titleIds = matchTitleIds(idx, nq);
  if (titleIds.size === 0) return [];

  const out = new Set<string>([q]);
  titleIds.forEach((id) => {
    for (const label of idx.labelsByTitle.get(id) ?? []) {
      if (out.size < max) out.add(label);
    }
  });
  return Array.from(out).slice(0, max);
}
