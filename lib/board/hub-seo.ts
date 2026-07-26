import { getTranslations } from "next-intl/server";
import type { HubData } from "@/lib/board/hub";
import { jobSlug } from "@/lib/board/format";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://telent-os-mu.vercel.app";

// Cabecera SEO/AEO del hub (H1 + breadcrumb + FAQ visible + JSON-LD), computada desde HubData.
// La FAQ va DEBAJO del paginado en el board (la pinta board-client); el JSON-LD lo pinta el
// server de la página. Solo preguntas con dato real (sin salario, sin medias).
export async function buildHubSeo(data: HubData, locale: string, path: string) {
  const t = await getTranslations({ locale, namespace: "Board.hub" });
  const loc = data.location?.label ?? null;
  const isLocationOnly = data.kind === "city" || data.kind === "country";
  const title = isLocationOnly
    ? t("titleLoc", { location: data.label })
    : loc
      ? t("titleCatCity", { category: data.label, city: loc })
      : t("titleCat", { category: data.label });
  const crumb = isLocationOnly ? data.label : loc ? `${data.label} · ${loc}` : data.label;

  const faqs: { q: string; a: string }[] = [];
  if (data.total > 0) {
    faqs.push({ q: t("faqCount", { subject: title }), a: t("count", { count: data.total }) });
    if (data.companies.length) faqs.push({ q: t("faqCompanies", { subject: title }), a: data.companies.join(", ") + "." });
    if (data.kind === "jobtitle" && data.coreSkills.length >= 3)
      faqs.push({ q: t("faqSkills", { subject: title }), a: data.coreSkills.join(", ") + "." });
    if (isLocationOnly && data.topTitles.length >= 3)
      faqs.push({ q: t("faqTopTitles", { subject: title }), a: data.topTitles.map((x) => x.label).join(", ") + "." });
    if ((isLocationOnly || data.kind === "jobtitle") && data.topCategories.length >= 2)
      faqs.push({ q: t("faqTopAreas", { subject: title }), a: data.topCategories.map((x) => x.label).join(", ") + "." });
  }

  const jobUrl = (j: HubData["jobs"][number]) => `${SITE}/${locale}/empleos/oferta/${jobSlug(j)}`;
  const ld: object[] = [
    {
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: t("crumbHome"), item: `${SITE}/${locale}` },
        { "@type": "ListItem", position: 2, name: t("crumbJobs"), item: `${SITE}/${locale}/empleos` },
        { "@type": "ListItem", position: 3, name: title, item: `${SITE}${path}` },
      ],
    },
    ...(data.jobs.length ? [{
      "@context": "https://schema.org", "@type": "ItemList", numberOfItems: data.total,
      itemListElement: data.jobs.map((j, i) => ({ "@type": "ListItem", position: i + 1, url: jobUrl(j) })),
    }] : []),
    ...(faqs.length ? [{
      "@context": "https://schema.org", "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    }] : []),
  ];

  return { h1: title, crumb, faqs, ld };
}
