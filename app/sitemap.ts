import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { categoryLabel, citySlug, cityFromSlug, countrySlug, countryFromSlug } from "@/lib/board/geo";
import { titleSlug, resolveTitleSlug } from "@/lib/job-board/job-titles";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://telent-os-mu.vercel.app";
// Regenera a diario (ISR) — "sitemap diario" sin cron. Google lo descubre por robots.txt.
export const revalidate = 86400;

// Mercados: cada uno enumera SUS hubs (ofertas de su país) bajo su prefijo de locale + slug de
// board localizado. Añadir un mercado = una línea. El país gatea la resolución de ciudad.
const MARKETS = [
  { locale: "es-ve", lang: "es", country: "VE", slug: "empleos" },
  { locale: "es-es", lang: "es", country: "ES", slug: "empleos" },
  { locale: "pt-br", lang: "pt", country: "BR", slug: "vagas" },
  { locale: "en-us", lang: "en", country: "US", slug: "jobs" },
];

type Row = { kind: string; a: string; b: string | null; cnt: number; updated: string | null };

// SOLO hubs que resuelven a 200 (el resolver gatea la ubicación por el gazetteer del país del
// mercado). Cada slug se valida con el mismo resolver que usa la ruta → nunca metemos un 404.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient();
  const out: MetadataRoute.Sitemap = [];
  const seen = new Set<string>();
  // Cache de validación de slug de cargo (resolveTitleSlug usa índice global cacheado en memoria).
  const titleSlugCache = new Map<string, boolean>();
  const validTitleSlug = async (label: string): Promise<string | null> => {
    const slug = titleSlug(label);
    if (!slug) return null;
    if (!titleSlugCache.has(slug)) titleSlugCache.set(slug, !!(await resolveTitleSlug(slug)));
    return titleSlugCache.get(slug) ? slug : null;
  };

  for (const m of MARKETS) {
    const BASE = `${SITE}/${m.locale}/${m.slug}`;
    const push = (path: string, updated: string | null, priority: number) => {
      const url = path ? `${BASE}/${path}` : BASE;
      if (seen.has(url)) return;
      seen.add(url);
      out.push({ url, lastModified: updated ? new Date(updated) : undefined, changeFrequency: "daily", priority });
    };
    const catSlug = (key: string): string | null => {
      const label = categoryLabel(key, m.locale);
      return label ? citySlug(label) : null;
    };
    const validCitySlug = (name: string): string | null => {
      const slug = citySlug(name);
      return slug && cityFromSlug(slug, m.country) ? slug : null;
    };
    const validCountrySlug = (code: string): string | null => {
      const slug = countrySlug(code, m.locale);
      return slug && countryFromSlug(slug, m.locale) ? slug : null;
    };

    push("", null, 0.9); // índice del board del mercado

    const { data } = await supabase.rpc("board_sitemap_hubs", { p_locale: m.lang, p_combo_limit: 400, p_country: m.country });
    for (const r of (data ?? []) as Row[]) {
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
  }
  return out;
}
