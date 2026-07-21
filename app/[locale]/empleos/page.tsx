import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { searchJobs } from "@/lib/job-board/search";
import { getCategories, countryForLocale } from "@/lib/board/geo";
import { routing, type Locale } from "@/i18n/routing";
import { getPathname } from "@/i18n/navigation";
import { BoardClient } from "@/components/board/board-client";

// Job board público — entrada del board (SSR de ofertas activas cross-empresa para SEO).
// La interacción (búsqueda, filtros, guardar) vive en BoardClient. Slugs localizados por
// mercado (/empleos · /vacancies · /vagas) vía pathnames; hreflang por locale.

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "Board" });
  const languages = Object.fromEntries(
    routing.locales.map((l) => [l, getPathname({ locale: l as Locale, href: "/empleos" })])
  );
  return {
    title: `${t("hero.title")} ${t("hero.titleAccent")} ${t("hero.titleEnd")} · TalentOS`,
    description: t("hero.eyebrow"),
    alternates: { languages },
  };
}

export default async function BoardPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { q?: string; category?: string; modality?: string; contract?: string; sort?: string };
}) {
  setRequestLocale(params.locale);

  const supabase = createClient();
  const modality = searchParams.modality;
  const initial = await searchJobs(supabase, {
    q: searchParams.q,
    category: searchParams.category,
    modality: modality === "presencial" || modality === "hibrido" || modality === "remoto" ? modality : undefined,
    contract: searchParams.contract,
    sort: (searchParams.sort as "relevance" | "recent" | "salary") ?? "relevance",
    pageSize: 20,
  });

  const { data: { user } } = await supabase.auth.getUser();
  const authed = user?.app_metadata?.audience === "candidate";

  return (
    <BoardClient
      initialJobs={initial.jobs}
      initialTotal={initial.total}
      initialFacets={initial.facets}
      initialQuery={searchParams.q ?? ""}
      categories={getCategories(params.locale)}
      country={countryForLocale(params.locale)}
      authed={authed}
    />
  );
}
