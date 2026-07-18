import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { resolveHub } from "@/lib/board/hub";
import { HubView } from "@/components/board/hub-view";

// Hub SEO categoría × ciudad (la "money page"): /empleos/[categoria]/[ubicacion].
export async function generateMetadata({ params }: { params: { locale: string; categoria: string; ubicacion: string } }): Promise<Metadata> {
  const data = await resolveHub(params.categoria, params.ubicacion, params.locale);
  if (!data) return {};
  const t = await getTranslations({ locale: params.locale, namespace: "Board.hub" });
  const title = t("titleCatCity", { category: data.categoryLabel, city: data.city ?? "" });
  return { title: `${title} · TalentOS`, description: title, alternates: { canonical: `/${params.locale}/empleos/${params.categoria}/${params.ubicacion}` } };
}

export default async function CategoryCityHubPage({ params }: { params: { locale: string; categoria: string; ubicacion: string } }) {
  setRequestLocale(params.locale);
  const data = await resolveHub(params.categoria, params.ubicacion, params.locale);
  if (!data) notFound();
  return <HubView data={data} locale={params.locale} />;
}
