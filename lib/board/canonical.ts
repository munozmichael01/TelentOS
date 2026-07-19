import { createClient } from "@/lib/supabase/server";

/**
 * Fuente ÚNICA de la verdad para "career activo": ¿la empresa tiene su career site
 * publicado? Decide cuál es la cara pública canónica de esa empresa y sus ofertas:
 *   - activo   → el career site (/careers/[slug]) es canónico; el board va noindex/redirect.
 *   - inactivo → el board (/empleos/*) es canónico; el career redirige al board.
 * El gating por PLAN de pago se enchufa aquí en el futuro (hoy = publicado). Como el
 * flag flipa (alta/baja de plan), los redirects que dependen de esto deben ser
 * TEMPORALES (307, no cacheables) + rel=canonical para consolidar el SEO sin lock.
 */
export async function careerSiteActive(companyId: string): Promise<boolean> {
  const { data } = await createClient()
    .from("career_site_pages")
    .select("company_id")
    .eq("company_id", companyId)
    .eq("is_published", true)
    .maybeSingle();
  return !!data;
}
