import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { resolveHub } from "@/lib/board/hub";
import { HubView } from "@/components/board/hub-view";

// Hub SEO de categoría (todas las ubicaciones): /empleos/[categoria].
export async function generateMetadata({ params }: { params: { locale: string; categoria: string } }): Promise<Metadata> {
  const data = await resolveHub(params.categoria, undefined, params.locale);
  if (!data) return {};
  const t = await getTranslations({ locale: params.locale, namespace: "Board.hub" });
  const title = t("titleCat", { category: data.categoryLabel });
  return { title: `${title} · TalentOS`, description: title, alternates: { canonical: `/${params.locale}/empleos/${params.categoria}` } };
}

export default async function CategoryHubPage({ params }: { params: { locale: string; categoria: string } }) {
  setRequestLocale(params.locale);
  const data = await resolveHub(params.categoria, undefined, params.locale);
  if (!data) notFound();
  return <HubView data={data} locale={params.locale} />;
}
