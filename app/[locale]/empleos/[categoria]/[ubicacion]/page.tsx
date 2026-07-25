import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { resolveHub } from "@/lib/board/hub";
import { HubView } from "@/components/board/hub-view";

// Hub SEO/AEO de dos segmentos (la "money page"): (categoría|cargo) × ubicación → /empleos/[a]/[b].
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
  return <HubView data={data} locale={params.locale} path={`/${params.locale}/empleos/${params.categoria}/${params.ubicacion}`} />;
}
