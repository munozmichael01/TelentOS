import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { resolveHub } from "@/lib/board/hub";
import { buildHubSeo } from "@/lib/board/hub-seo";
import { getCategories, countryForLocale } from "@/lib/board/geo";
import { BoardClient } from "@/components/board/board-client";
import { hasAudience } from "@/lib/auth/audiences";

// Hub SEO/AEO de dos segmentos (la "money page"): (categoría|cargo) × ubicación → /empleos/[a]/[b].
// La URL estructurada ES el buscador con ambos facets aplicados (SSR), + FAQ debajo del paginado.
export async function generateMetadata({ params }: { params: { locale: string; categoria: string; ubicacion: string } }): Promise<Metadata> {
  const data = await resolveHub(params.categoria, params.ubicacion, params.locale);
  if (!data) return {};
  const t = await getTranslations({ locale: params.locale, namespace: "Board.hub" });
  const title = t("titleCatCity", { category: data.label, city: data.location?.label ?? "" });
  const path = `/${params.locale}/empleos/${params.categoria}/${params.ubicacion}`;
  return {
    title: `${title} · TalentOS`,
    description: title,
    alternates: { canonical: path },
    robots: { index: data.index, follow: true },
  };
}

export default async function HubPage({ params }: { params: { locale: string; categoria: string; ubicacion: string } }) {
  setRequestLocale(params.locale);
  const data = await resolveHub(params.categoria, params.ubicacion, params.locale);
  if (!data) notFound();

  const path = `/${params.locale}/empleos/${params.categoria}/${params.ubicacion}`;
  const seo = await buildHubSeo(data, params.locale, path);
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const authed = hasAudience(user, "candidate");

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(seo.ld) }} />
      <BoardClient
        initialJobs={data.jobs}
        initialTotal={data.total}
        initialFacets={data.facets}
        initialQuery={data.seed.query ?? ""}
        initialArea={data.seed.area}
        initialLocation={data.seed.location ?? ""}
        initialCountry={data.seed.country}
        hub={{ h1: seo.h1, crumb: seo.crumb, faqs: seo.faqs }}
        categories={getCategories(params.locale)}
        country={countryForLocale(params.locale)}
        authed={authed}
      />
    </>
  );
}
