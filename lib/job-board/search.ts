// Búsqueda del board público — query determinista sobre ofertas activas de TODAS las
// empresas (lectura anon permitida por la RLS `jobs_anon_read_active`). La usan el
// SSR del board (SEO) y el endpoint de filtrado interactivo. La interpretación por LLM
// del texto libre ocurre ANTES (nl-search, aparte) y llega aquí ya como filtros.
import type { SupabaseClient } from "@supabase/supabase-js";

export type BoardSort = "relevance" | "recent" | "salary";

export type BoardSearchParams = {
  q?: string; // palabra clave (título/descripción)
  location?: string; // ciudad/texto
  category?: string; // free-text legacy
  categoryKey?: string; // categoría canónica (data/taxonomy/categories.json)
  modality?: "presencial" | "hibrido" | "remoto";
  contract?: string; // employment_type
  salaryMin?: number;
  companyId?: string;
  // Multi-select (barra de filtros desktop): OR dentro del grupo, AND entre grupos.
  categoryKeys?: string[];
  modalities?: string[];
  contracts?: string[];
  companyIds?: string[];
  datePosted?: "24h" | "week" | "month";
  sort?: BoardSort;
  page?: number;
  pageSize?: number;
};

export type BoardJob = {
  id: string;
  title: string;
  description: string | null;
  city: string | null;
  country_code: string | null;
  location: string | null;
  modality: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  employment_type: string | null;
  category: string | null;
  created_at: string;
  company: { id: string; name: string; slug: string | null; logo_url: string | null } | null;
  // ¿La oferta exige screening obligatorio? Decide en la card "1 toque" (sin screening)
  // vs "Aplicar" (abre el flujo completo). Se resuelve por oferta en la propia búsqueda.
  hasRequiredScreening: boolean;
};

export type BoardFacet = { value: string; count: number; id?: string };
export type BoardFacets = { category: BoardFacet[]; modality: BoardFacet[]; contract: BoardFacet[]; company: BoardFacet[] };

const SELECT =
  "id, title, description, city, country_code, location, modality, salary_min, salary_max, salary_currency, employment_type, category, created_at, company:companies(id, name, slug, logo_url)";

function applyFilters<T>(q: T, p: BoardSearchParams): T {
  // @ts-expect-error — encadenado de PostgREST tipado laxo
  let query = q.eq("status", "active");
  if (p.q) query = query.or(`title.ilike.%${p.q}%,description.ilike.%${p.q}%`);
  if (p.location) query = query.or(`city.ilike.%${p.location}%,location.ilike.%${p.location}%`);
  if (p.category) query = query.eq("category", p.category);
  if (p.categoryKey) query = query.eq("category_key", p.categoryKey);
  if (p.modality) query = query.eq("modality", p.modality);
  if (p.contract) query = query.eq("employment_type", p.contract);
  if (p.companyId) query = query.eq("company_id", p.companyId);
  if (p.salaryMin) query = query.gte("salary_max", p.salaryMin);
  // Multi-select (arrays): OR dentro del grupo vía IN.
  if (p.categoryKeys?.length) query = query.in("category_key", p.categoryKeys);
  if (p.modalities?.length) query = query.in("modality", p.modalities);
  if (p.contracts?.length) query = query.in("employment_type", p.contracts);
  if (p.companyIds?.length) query = query.in("company_id", p.companyIds);
  if (p.datePosted) {
    const days = p.datePosted === "24h" ? 1 : p.datePosted === "week" ? 7 : 30;
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    query = query.gte("created_at", cutoff);
  }
  return query;
}

export async function searchJobs(
  supabase: SupabaseClient,
  params: BoardSearchParams
): Promise<{ jobs: BoardJob[]; total: number; facets: BoardFacets }> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, params.pageSize ?? 20);
  const from = (page - 1) * pageSize;

  // Resultados paginados
  let q = applyFilters(supabase.from("jobs").select(SELECT, { count: "exact" }), params);
  if (params.sort === "salary") q = q.order("salary_max", { ascending: false, nullsFirst: false });
  else q = q.order("created_at", { ascending: false }); // relevance≈recent por ahora
  q = q.range(from, from + pageSize - 1);
  const { data, count, error } = await q;
  if (error) throw new Error(error.message);

  const jobRows = (data ?? []) as unknown as Omit<BoardJob, "hasRequiredScreening">[];
  // Screening obligatorio por oferta (para el gating del botón de la card). Una sola query
  // acotada a los IDs de la página. Si la RLS lo oculta al visitante, queda false (el flujo
  // de aplicar lo re-verifica en servidor de todos modos).
  const requiredSet = new Set<string>();
  if (jobRows.length) {
    const ids = jobRows.map((j) => j.id);
    const { data: sc } = await supabase
      .from("screening_questions").select("job_id").eq("required", true).in("job_id", ids);
    for (const r of sc ?? []) requiredSet.add((r as { job_id: string }).job_id);
  }
  const jobs: BoardJob[] = jobRows.map((j) => ({ ...j, hasRequiredScreening: requiredSet.has(j.id) }));

  // Facetas: conteos por opción sobre la base (texto/ubicación/fecha), SIN aplicar las
  // selecciones de grupo — así cada chip muestra cuántas ofertas hay por opción de forma
  // estable. Ok para el volumen actual; a escala, conteos en DB.
  const facetBase: BoardSearchParams = { q: params.q, location: params.location, categoryKey: params.categoryKey, category: params.category, datePosted: params.datePosted };
  const facetQ = applyFilters(supabase.from("jobs").select("category_key, modality, employment_type, company:companies(id, name)"), facetBase);
  const { data: facetRows } = await facetQ;
  const facets = buildFacets((facetRows ?? []) as Record<string, unknown>[]);

  return { jobs, total: count ?? 0, facets };
}

function buildFacets(rows: Record<string, unknown>[]): BoardFacets {
  const tally = (key: (r: Record<string, unknown>) => string | null | undefined): BoardFacet[] => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const v = key(r);
      if (v) m.set(v, (m.get(v) ?? 0) + 1);
    }
    return Array.from(m.entries()).map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count);
  };
  // Empresa: la faceta necesita id (para filtrar) + nombre (para mostrar).
  const companyMap = new Map<string, { name: string; count: number }>();
  for (const r of rows) {
    const c = r.company as { id?: string; name?: string } | null;
    if (c?.id && c.name) {
      const cur = companyMap.get(c.id);
      if (cur) cur.count++;
      else companyMap.set(c.id, { name: c.name, count: 1 });
    }
  }
  const company: BoardFacet[] = Array.from(companyMap.entries())
    .map(([id, { name, count }]) => ({ value: name, count, id })).sort((a, b) => b.count - a.count);
  return {
    category: tally((r) => r.category_key as string),
    modality: tally((r) => r.modality as string),
    contract: tally((r) => r.employment_type as string),
    company,
  };
}
