import { searchJobs, type BoardJob, type BoardFacets } from "@/lib/job-board/search";
import { getCategories, categoryLabel } from "@/lib/board/categories";
import { cityFromSlugGlobal, citySlug, countryFromSlug, countryForLocale } from "@/lib/board/geo";
import { resolveTitleSlug } from "@/lib/job-board/job-titles";
import { createClient } from "@/lib/supabase/server";

export type HubKind = "category" | "jobtitle" | "city" | "country";
export type HubTop = { key: string; label: string; cnt: number };
export type HubData = {
  kind: HubKind;
  label: string;                 // etiqueta del rol/categoría/ubicación de seg1 (localizada)
  location: { kind: "city" | "country"; label: string; slug: string } | null; // seg2 (o seg1 si es ubicación)
  jobs: BoardJob[];
  total: number;
  index: boolean;                // ≥1 oferta → indexable; 0 → noindex (se mantiene la URL)
  companies: string[];           // top 10 empresas por nº de ofertas activas (agregado real)
  topTitles: HubTop[];           // top puestos por ofertas activas (útil en hubs de ubicación/área)
  topCategories: HubTop[];       // top áreas por ofertas activas (útil en hubs de ubicación/cargo)
  coreSkills: string[];          // requisitos canónicos del cargo (taxonomía ESCO) — solo hub de cargo
  facets: BoardFacets;
  // Siembra del board (la URL estructurada ES el buscador con el facet aplicado).
  seed: { area?: string; query?: string; location?: string; country?: string };
};

// Ubicación (seg1 solo, o seg2): ciudad del mercado o país cubierto. null si no resuelve.
function resolveLocation(slug: string, locale: string):
  | { kind: "city" | "country"; label: string; params: { location?: string; country?: string } }
  | null {
  const city = cityFromSlugGlobal(slug, countryForLocale(locale));
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

  // Seed para el board. Para CARGO se siembra `query=label` (y se busca por q) para que el board
  // interactivo y el hub ordenen/filtren igual; los tops/skills siguen usando titleIds (exactos).
  const seed: HubData["seed"] = {};
  if (params.categoryKey) seed.area = params.categoryKey;
  if (kind === "jobtitle") seed.query = label;
  if (params.location) seed.location = params.location;
  if (params.country) seed.country = params.country;

  const supabase = createClient();
  // El hub de cargo busca por texto Y por sus titleIds. Pasar titleIds explícito es lo que evita
  // que searchJobs auto-resuelva el contexto de título y arrastre cargos RELACIONADOS: un hub es
  // la página de UN cargo, y su conteo se muestra como tal ("570 ofertas de camarero"). Los
  // relacionados son cosa del buscador, no del hub.
  const searchParams = kind === "jobtitle"
    ? { q: label, titleIds: params.titleIds, location: params.location, country: params.country }
    : params;
  const { jobs, total, facets } = await searchJobs(supabase, { ...searchParams, homeCountry: countryForLocale(locale), pageSize: 20 });

  // Tops REALES scopeados al hub (mismo WHERE que board_rank_jobs) por nº de ofertas activas:
  // top-10 empresas, puestos y áreas. No confundir con `facets` (base global, no scopeada).
  const lang = locale.split("-")[0];
  const { data: facetRows } = await supabase.rpc("board_hub_facets", {
    p_title_ids: params.titleIds ?? null, p_category_keys: params.categoryKey ? [params.categoryKey] : null,
    p_location: params.location ?? null, p_country: params.country ?? null, p_limit: 10, p_locale: lang,
  });
  const rows = (facetRows ?? []) as { kind: string; key: string; label: string; cnt: number }[];
  const clean = (s: string) => s.split(" / ")[0]; // "camarero / camarera" → "camarero"
  const companies = rows.filter((r) => r.kind === "company").map((r) => r.label);
  const topTitles = rows.filter((r) => r.kind === "jobtitle").map((r) => ({ key: r.key, label: clean(r.label), cnt: Number(r.cnt) }));
  const topCategories = rows.filter((r) => r.kind === "category").map((r) => ({ key: r.key, label: categoryLabel(r.key, locale) ?? r.key, cnt: Number(r.cnt) }));

  // Requisitos canónicos del cargo (AEO no numérico): skills core de la taxonomía ESCO para los
  // titleIds del hub. Fuente = cargo canónico, NO las ofertas (que no traen requisitos estructurados).
  let coreSkills: string[] = [];
  if (kind === "jobtitle" && params.titleIds?.length) {
    const { data: sk } = await supabase
      .from("job_title_skills")
      .select("weight, skills(name, skill_translations(name, locale))")
      .in("job_title_id", params.titleIds).eq("is_core", true).order("weight", { ascending: false }).limit(12);
    const seen = new Set<string>();
    for (const r of (sk ?? []) as unknown as { skills: { name: string; skill_translations: { name: string; locale: string }[] } | null }[]) {
      const tr = r.skills?.skill_translations?.find((x) => x.locale === lang)?.name ?? r.skills?.name;
      if (tr && !seen.has(tr.toLowerCase())) { seen.add(tr.toLowerCase()); coreSkills.push(tr); }
    }
    coreSkills = coreSkills.slice(0, 6);
  }

  return { kind, label, location, jobs, total, index: total > 0, companies, topTitles, topCategories, coreSkills, facets, seed };
}

export { categoryLabel };
