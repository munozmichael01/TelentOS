import { createAdminClient } from "@/lib/supabase/server";

/**
 * Fuente ÚNICA de la verdad para "career activo": ¿la empresa tiene su career site
 * publicado? Decide cuál es la cara pública canónica de esa empresa y sus ofertas:
 *   - activo   → el career site (/careers/[slug]) es canónico; el board va noindex/redirect.
 *   - inactivo → el board (/empleos/*) es canónico; el career redirige al board.
 * El gating por PLAN de pago se enchufa aquí en el futuro (hoy = publicado). Como el
 * flag flipa (alta/baja de plan), los redirects que dependen de esto deben ser
 * TEMPORALES (307, no cacheables) + rel=canonical para consolidar el SEO sin lock.
 *
 * Se lee con cliente ADMIN a propósito. Leerlo con la sesión del visitante metía la RLS en una
 * decisión de enrutado PÚBLICO, así que la URL canónica de una empresa cambiaba según quién
 * mirase: verificado el 12-ago, con sesión de candidato el destino se invertía respecto a un
 * visitante anónimo. La cara pública de una empresa no puede depender de quién la visita —ni por
 * coherencia ni por SEO— y además dos reglas que se preguntan lo mismo con respuestas distintas
 * están a un cambio de convertirse en un bucle de redirects.
 */
export async function careerSiteActive(companyId: string): Promise<boolean> {
  const { data } = await createAdminClient()
    .from("career_site_pages")
    .select("company_id")
    .eq("company_id", companyId)
    .eq("is_published", true)
    .maybeSingle();
  return !!data;
}
