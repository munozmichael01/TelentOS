// Datos canónicos de categorías + ciudades del board, servidos desde los datasets
// estáticos (data/geo, data/taxonomy) — SIN tablas/seed. SERVER-ONLY: importa el JSON
// de ciudades (~300KB); no lo importes desde componentes cliente (bundlearía al cliente).
// Las categorías (22, pequeñas) se pasan por props desde el SSR; las ciudades por el
// endpoint /api/board/cities.
import citiesData from "@/data/geo/cities.json";
import categoriesData from "@/data/taxonomy/categories.json";

export type BoardCity = { name: string; admin1: string; country: string; population: number };
export type BoardCategory = { key: string; label: string };

type RawCity = { name: string; admin1: string; country: string; population: number; geonameId: number };
type RawCategory = { key: string; es: string; en: string; pt: string; titleKeys: string[] };

const CITIES = (citiesData as { cities: RawCity[] }).cities;
const CATEGORIES = (categoriesData as { categories: RawCategory[] }).categories;

// Locale idioma-país → país (es-ve → VE). El mercado del locale define la lista de ciudades.
export function countryForLocale(locale: string): string {
  return (locale.split("-")[1] || "ve").toUpperCase();
}
function langForLocale(locale: string): "es" | "en" | "pt" {
  const l = locale.split("-")[0];
  return l === "en" || l === "pt" ? l : "es";
}

// Lista COMPLETA de categorías (localizada) — no se limita a las que tienen ofertas.
export function getCategories(locale: string): BoardCategory[] {
  const lang = langForLocale(locale);
  return CATEGORIES.map((c) => ({ key: c.key, label: c[lang] || c.es }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function categoryLabel(key: string, locale: string): string | null {
  const c = CATEGORIES.find((x) => x.key === key);
  return c ? c[langForLocale(locale)] || c.es : null;
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
