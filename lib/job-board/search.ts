// Búsqueda del board público — query determinista sobre ofertas activas de TODAS las
// empresas (lectura anon permitida por la RLS `jobs_anon_read_active`). La usan el
// SSR del board (SEO) y el endpoint de filtrado interactivo. La interpretación por LLM
// del texto libre ocurre ANTES (nl-search, aparte) y llega aquí ya como filtros.
import type { SupabaseClient } from "@supabase/supabase-js";

export type BoardSort = "relevance" | "recent" | "salary";

export type BoardSearchParams = {
  q?: string; // palabra clave (título/descripción)
  location?: string; // ciudad/texto
  category?: string;
  modality?: "presencial" | "hibrido" | "remoto";
  contract?: string; // employment_type
  salaryMin?: number;
  companyId?: string;
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
};

export type BoardFacet = { value: string; count: number };
export type BoardFacets = { category: BoardFacet[]; modality: BoardFacet[]; contract: BoardFacet[]; company: BoardFacet[] };

const SELECT =
  "id, title, description, city, country_code, location, modality, salary_min, salary_max, salary_currency, employment_type, category, created_at, company:companies(id, name, slug, logo_url)";

function applyFilters<T>(q: T, p: BoardSearchParams): T {
  // @ts-expect-error — encadenado de PostgREST tipado laxo
  let query = q.eq("status", "active");
  if (p.q) query = query.or(`title.ilike.%${p.q}%,description.ilike.%${p.q}%`);
  if (p.location) query = query.or(`city.ilike.%${p.location}%,location.ilike.%${p.location}%`);
  if (p.category) query = query.eq("category", p.category);
  if (p.modality) query = query.eq("modality", p.modality);
  if (p.contract) query = query.eq("employment_type", p.contract);
  if (p.companyId) query = query.eq("company_id", p.companyId);
  if (p.salaryMin) query = query.gte("salary_max", p.salaryMin);
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

  // Facetas: se cuentan sobre TODO el set filtrado (columnas ligeras) — ok para el
  // volumen actual; a escala se sustituye por conteos en DB.
  const facetQ = applyFilters(supabase.from("jobs").select("category, modality, employment_type, company:companies(name)"), params);
  const { data: facetRows } = await facetQ;
  const facets = buildFacets((facetRows ?? []) as Record<string, unknown>[]);

  return { jobs: (data ?? []) as unknown as BoardJob[], total: count ?? 0, facets };
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
  return {
    category: tally((r) => r.category as string),
    modality: tally((r) => r.modality as string),
    contract: tally((r) => r.employment_type as string),
    company: tally((r) => (r.company as { name?: string } | null)?.name),
  };
}
