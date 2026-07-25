import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { categoryLabel, citySlug, cityFromSlug, countrySlug, countryFromSlug, countryForLocale } from "@/lib/board/geo";
import { titleSlug, resolveTitleSlug } from "@/lib/job-board/job-titles";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://telent-os-mu.vercel.app";
// Mercado principal. El sitemap se genera para el default; los slugs son localizados es-ve.
const LOCALE = "es-ve";
const BASE = `${SITE}/${LOCALE}/empleos`;
// Regenera a diario (ISR) — "sitemap diario" sin cron. Google lo descubre por robots.txt.
export const revalidate = 86400;

type Row = { kind: string; a: string; b: string | null; cnt: number; updated: string | null };

// SOLO hubs que resuelven a 200 (resolveHub gatea la ubicación por el gazetteer del país del
// locale). Como las ofertas son ES bajo mercado VE, la mayoría de ciudades ES no resuelven:
// se descartan aquí para no meter 404 en el sitemap. Categorías, cargos y países sí resuelven.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient();
  const { data } = await supabase.rpc("board_sitemap_hubs", { p_locale: "es", p_combo_limit: 400 });
  const rows = (data ?? []) as Row[];
  const country = countryForLocale(LOCALE); // VE

  // Cache de validación de slug de cargo (resolveTitleSlug usa índice cacheado en memoria).
  const titleSlugCache = new Map<string, boolean>();
  const validTitleSlug = async (label: string): Promise<string | null> => {
    const slug = titleSlug(label);
    if (!slug) return null;
    if (!titleSlugCache.has(slug)) titleSlugCache.set(slug, !!(await resolveTitleSlug(slug)));
    return titleSlugCache.get(slug) ? slug : null;
  };
  const validCitySlug = (name: string): string | null => {
    const slug = citySlug(name);
    return slug && cityFromSlug(slug, country) ? slug : null;
  };
  const catSlug = (key: string): string | null => {
    const label = categoryLabel(key, LOCALE);
    return label ? citySlug(label) : null;
  };
  const validCountrySlug = (code: string): string | null => {
    const slug = countrySlug(code, LOCALE);
    return slug && countryFromSlug(slug, LOCALE) ? slug : null;
  };

  const out: MetadataRoute.Sitemap = [
    { url: BASE, changeFrequency: "daily", priority: 0.9 },
  ];
  const seen = new Set<string>([BASE]);
  const push = (path: string, updated: string | null, priority: number) => {
    const url = `${BASE}/${path}`;
    if (seen.has(url)) return;
    seen.add(url);
    out.push({ url, lastModified: updated ? new Date(updated) : undefined, changeFrequency: "daily", priority });
  };

  for (const r of rows) {
    if (r.kind === "category") { const s = catSlug(r.a); if (s) push(s, r.updated, 0.7); }
    else if (r.kind === "country") { const s = validCountrySlug(r.a); if (s) push(s, r.updated, 0.7); }
    else if (r.kind === "city") { const s = validCitySlug(r.a); if (s) push(s, r.updated, 0.6); }
    else if (r.kind === "jobtitle") { const s = await validTitleSlug(r.a); if (s) push(s, r.updated, 0.7); }
    else if (r.kind === "cat_city") {
      const s1 = catSlug(r.a), s2 = r.b ? validCitySlug(r.b) : null;
      if (s1 && s2) push(`${s1}/${s2}`, r.updated, 0.8);
    } else if (r.kind === "jt_city") {
      const s1 = await validTitleSlug(r.a), s2 = r.b ? validCitySlug(r.b) : null;
      if (s1 && s2) push(`${s1}/${s2}`, r.updated, 0.8);
    }
  }
  return out;
}
