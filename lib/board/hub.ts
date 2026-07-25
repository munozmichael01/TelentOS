import { searchJobs, type BoardJob, type BoardFacets } from "@/lib/job-board/search";
import { getCategories, categoryLabel } from "@/lib/board/categories";
import { cityFromSlug, citySlug, countryFromSlug, countryForLocale } from "@/lib/board/geo";
import { resolveTitleSlug } from "@/lib/job-board/job-titles";
import { createClient } from "@/lib/supabase/server";

export type HubKind = "category" | "jobtitle" | "city" | "country";
export type HubData = {
  kind: HubKind;
  label: string;                 // etiqueta del rol/categoría/ubicación de seg1 (localizada)
  location: { kind: "city" | "country"; label: string; slug: string } | null; // seg2 (o seg1 si es ubicación)
  jobs: BoardJob[];
  total: number;
  index: boolean;                // ≥1 oferta → indexable; 0 → noindex (se mantiene la URL)
  companies: string[];           // top empresas (intro data-driven / AEO)
  facets: BoardFacets;
};

// Ubicación (seg1 solo, o seg2): ciudad del mercado o país cubierto. null si no resuelve.
function resolveLocation(slug: string, locale: string):
  | { kind: "city" | "country"; label: string; params: { location?: string; country?: string } }
  | null {
  const city = cityFromSlug(slug, countryForLocale(locale));
  if (city) return { kind: "city", label: city.name, params: { location: city.name } };
  const country = countryFromSlug(slug, locale);
  if (country) return { kind: "country", label: country.name, params: { country: country.code } };
  return null;
}

// Resuelve un hub. seg1 = categoría | cargo | ubicación (prioridad fija, sin colisión). seg2 =
// ubicación (solo si seg1 es categoría/cargo). null → 404. Reusa searchJobs (RPC de ranking).
export async function resolveHub(seg1: string, seg2: string | undefined, locale: string): Promise<HubData | null> {
  let kind: HubKind | null = null;
  let label = "";
  const params: { categoryKey?: string; titleIds?: string[]; location?: string; country?: string } = {};

  const cat = getCategories(locale).find((c) => c.key === seg1 || citySlug(c.label) === seg1);
  if (cat) { kind = "category"; label = cat.label; params.categoryKey = cat.key; }
  else {
    const jt = await resolveTitleSlug(seg1);
    if (jt) { kind = "jobtitle"; label = jt.label; params.titleIds = jt.titleIds; }
    else {
      if (seg2) return null; // seg1 solo puede ser ubicación si NO hay seg2
      const loc = resolveLocation(seg1, locale);
      if (!loc) return null;
      kind = loc.kind; label = loc.label; Object.assign(params, loc.params);
    }
  }

  let location: HubData["location"] = null;
  if (seg2) {
    const loc = resolveLocation(seg2, locale);
    if (!loc) return null;
    location = { kind: loc.kind, label: loc.label, slug: seg2 };
    Object.assign(params, loc.params);
  } else if (kind === "city" || kind === "country") {
    location = { kind, label, slug: seg1 };
  }

  const { jobs, total, facets } = await searchJobs(createClient(), { ...params, pageSize: 30 });
  // Empresas del HUB (de las ofertas reales, no de facets globales que no se scopean por cargo).
  const companies = Array.from(new Set(jobs.map((j) => j.company?.name).filter((n): n is string => !!n))).slice(0, 5);
  return { kind, label, location, jobs, total, index: total > 0, companies, facets };
}

export { categoryLabel };
