// Categorías canónicas del board (22) — CLIENT-SAFE: importa solo categories.json (pequeño),
// no las ciudades. Se usa tanto en el board (SSR) como en el form de publicación (cliente).
import categoriesData from "@/data/taxonomy/categories.json";

export type BoardCategory = { key: string; label: string };
type RawCategory = { key: string; es: string; en: string; pt: string; titleKeys: string[] };

const CATEGORIES = (categoriesData as { categories: RawCategory[] }).categories;

function langForLocale(locale: string): "es" | "en" | "pt" {
  const l = locale.split("-")[0];
  return l === "en" || l === "pt" ? l : "es";
}

// Lista COMPLETA de categorías (localizada) — no se limita a las que tienen ofertas.
export function getCategories(locale: string): BoardCategory[] {
  const lang = langForLocale(locale);
  return CATEGORIES.map((c) => ({ key: c.key, label: c[lang] || c.es })).sort((a, b) => a.label.localeCompare(b.label));
}

export function categoryLabel(key: string | null | undefined, locale: string): string | null {
  if (!key) return null;
  const c = CATEGORIES.find((x) => x.key === key);
  return c ? c[langForLocale(locale)] || c.es : null;
}
