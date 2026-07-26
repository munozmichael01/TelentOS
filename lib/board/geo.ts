// Ciudades canónicas del board (GeoNames), servidas desde el dataset estático — SIN
// tablas/seed. SERVER-ONLY: importa el JSON de ciudades (~300KB); no lo importes desde
// componentes cliente (bundlearía). Las categorías (client-safe) viven en ./categories.
import citiesData from "@/data/geo/cities.json";

// Re-export de categorías para compatibilidad de imports (el board SSR usa getCategories).
export { getCategories, categoryLabel, type BoardCategory } from "./categories";

export type BoardCity = { name: string; admin1: string; country: string; population: number };
type RawCity = { name: string; admin1: string; country: string; population: number; geonameId: number };

const CITIES = (citiesData as { cities: RawCity[] }).cities;

// Locale idioma-país → país (es-ve → VE). El mercado del locale define la lista de ciudades.
export function countryForLocale(locale: string): string {
  return (locale.split("-")[1] || "ve").toUpperCase();
}

// Slug de ciudad (sin acentos, guiones) para URLs de hub. "São Paulo" → "sao-paulo".
export function citySlug(name: string): string {
  return name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
// Ciudad canónica a partir de su slug (valida que exista en el país). null si no existe.
export function cityFromSlug(slug: string, country: string): BoardCity | null {
  const cc = country.toUpperCase();
  const found = CITIES.find((c) => c.country === cc && citySlug(c.name) === slug);
  return found ? { name: found.name, admin1: found.admin1, country: found.country, population: found.population } : null;
}
// Ciudad canónica GLOBAL (cualquier país), prefiriendo el mercado ante colisiones (Barcelona
// existe en ES y VE). El mercado prioriza, NO restringe: Madrid resuelve también en es-ve.
export function cityFromSlugGlobal(slug: string, preferCountry: string): BoardCity | null {
  const cc = preferCountry.toUpperCase();
  const matches = CITIES.filter((c) => citySlug(c.name) === slug);
  if (!matches.length) return null;
  const pick = matches.find((c) => c.country === cc) ?? matches.slice().sort((a, b) => b.population - a.population)[0];
  return { name: pick.name, admin1: pick.admin1, country: pick.country, population: pick.population };
}
// Autocomplete GLOBAL de ciudades (todos los países), con el mercado priorizado. No filtra por
// país: el mercado solo sube sus ciudades. El filtro "solo con ofertas" lo hace el endpoint.
export function searchCitiesGlobal(q: string, preferCountry: string, limit = 12): BoardCity[] {
  const cc = preferCountry.toUpperCase();
  const nq = q.trim().toLowerCase();
  const clean = ({ name, admin1, country, population }: RawCity): BoardCity => ({ name, admin1, country, population });
  let list = nq ? CITIES.filter((c) => c.name.toLowerCase().includes(nq)) : CITIES.slice();
  list.sort((a, b) => {
    const pa = a.country === cc ? 0 : 1, pb = b.country === cc ? 0 : 1;
    if (pa !== pb) return pa - pb;
    if (nq) {
      const sa = a.name.toLowerCase().startsWith(nq) ? 0 : 1, sb = b.name.toLowerCase().startsWith(nq) ? 0 : 1;
      if (sa !== sb) return sa - sb;
    }
    return b.population - a.population;
  });
  // Dedupe por slug: varias "Valencia" (VE/ES/US) resuelven el mismo hub → una sola sugerencia
  // (se queda la primera del orden = la del mercado si existe).
  const seen = new Set<string>();
  const out: BoardCity[] = [];
  for (const c of list) {
    const s = citySlug(c.name);
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(clean(c));
    if (out.length >= limit) break;
  }
  return out;
}

// Países cubiertos (code → nombre localizado) para hubs de país. Ampliar según mercados.
const COUNTRIES: Record<string, { es: string; en: string; pt: string }> = {
  ES: { es: "España", en: "Spain", pt: "Espanha" },
  PT: { es: "Portugal", en: "Portugal", pt: "Portugal" },
  VE: { es: "Venezuela", en: "Venezuela", pt: "Venezuela" },
  AD: { es: "Andorra", en: "Andorra", pt: "Andorra" },
  IT: { es: "Italia", en: "Italy", pt: "Itália" },
  FR: { es: "Francia", en: "France", pt: "França" },
  GB: { es: "Reino Unido", en: "United Kingdom", pt: "Reino Unido" },
  CH: { es: "Suiza", en: "Switzerland", pt: "Suíça" },
  US: { es: "Estados Unidos", en: "United States", pt: "Estados Unidos" },
  DE: { es: "Alemania", en: "Germany", pt: "Alemanha" },
  MX: { es: "México", en: "Mexico", pt: "México" },
  BR: { es: "Brasil", en: "Brazil", pt: "Brasil" },
};
const langOf = (locale: string) => { const l = locale.split("-")[0]; return l === "en" || l === "pt" ? l : "es"; };

export function countrySlug(code: string, locale: string): string {
  const c = COUNTRIES[code.toUpperCase()];
  return c ? citySlug(c[langOf(locale) as "es" | "en" | "pt"]) : "";
}
// País canónico a partir de su slug (en el idioma del locale). null si no está cubierto.
export function countryFromSlug(slug: string, locale: string): { code: string; name: string } | null {
  const lang = langOf(locale) as "es" | "en" | "pt";
  for (const [code, names] of Object.entries(COUNTRIES)) {
    if (citySlug(names[lang]) === slug) return { code, name: names[lang] };
  }
  return null;
}

// Autocompletado de ciudades del país (ordenadas por población). q vacío → las mayores.
export function searchCities(q: string, country: string, limit = 8): BoardCity[] {
  const cc = country.toUpperCase();
  const nq = q.trim().toLowerCase();
  let list = CITIES.filter((c) => c.country === cc);
  if (nq) {
    list = list.filter((c) => c.name.toLowerCase().includes(nq));
    list.sort((a, b) => {
      const as = a.name.toLowerCase().startsWith(nq) ? 0 : 1;
      const bs = b.name.toLowerCase().startsWith(nq) ? 0 : 1;
      return as - bs || b.population - a.population;
    });
  } else {
    list.sort((a, b) => b.population - a.population);
  }
  return list.slice(0, limit).map(({ name, admin1, country, population }) => ({ name, admin1, country, population }));
}
