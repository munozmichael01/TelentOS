import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { resolveHub } from "@/lib/board/hub";
import { HubView } from "@/components/board/hub-view";

// Hub SEO/AEO de un solo segmento: categoría | cargo | ubicación → /empleos/[a].
export async function generateMetadata({ params }: { params: { locale: string; categoria: string } }): Promise<Metadata> {
  const data = await resolveHub(params.categoria, undefined, params.locale);
  if (!data) return {};
  const t = await getTranslations({ locale: params.locale, namespace: "Board.hub" });
  const title = data.kind === "city" || data.kind === "country"
    ? t("titleLoc", { location: data.label })
    : t("titleCat", { category: data.label });
  const path = `/${params.locale}/empleos/${params.categoria}`;
  return {
    title: `${title} · TalentOS`,
    description: title,
    alternates: { canonical: path },
    robots: { index: data.index, follow: true }, // 0 ofertas → noindex, pero la URL se mantiene
  };
}

export default async function HubPage({ params }: { params: { locale: string; categoria: string } }) {
  setRequestLocale(params.locale);
  const data = await resolveHub(params.categoria, undefined, params.locale);
  if (!data) notFound();
  return <HubView data={data} locale={params.locale} path={`/${params.locale}/empleos/${params.categoria}`} />;
}
