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
