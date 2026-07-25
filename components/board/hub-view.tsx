import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { HubData } from "@/lib/board/hub";
import { getCategories } from "@/lib/board/categories";
import { citySlug } from "@/lib/board/geo";
import { logoFor, formatSalary, modalityStyle, relativeDate, jobSlug, PERIOD_SUFFIX } from "@/lib/board/format";
import { HubAlert } from "@/components/board/hub-alert";

const ARCHIVO = "'Archivo',sans-serif";
const MONO = "'Space Mono',monospace";
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://telent-os-mu.vercel.app";

// Vista SSR del hub (SEO/AEO): H1, intro data-driven, listado de ofertas con enlaces internos,
// JSON-LD (BreadcrumbList + ItemList) e interlinking. Vacío → 200 + alerta (la ruta pone noindex).
export async function HubView({ data, locale, path }: { data: HubData; locale: string; path: string }) {
  const t = await getTranslations({ locale, namespace: "Board.hub" });
  const loc = data.location?.label ?? null;
  const isLocationOnly = data.kind === "city" || data.kind === "country";
  const title = isLocationOnly
    ? t("titleLoc", { location: data.label })
    : loc
      ? t("titleCatCity", { category: data.label, city: loc })
      : t("titleCat", { category: data.label });

  // Intro data-driven (AEO): conteo + empresas que contratan. Solo datos reales.
  const intro = data.total > 0
    ? `${title}. ${data.companies.length ? t("introCompanies", { companies: data.companies.join(", ") }) : ""}`.trim()
    : "";

  const related = getCategories(locale).filter((c) => !(data.kind === "category" && c.label === data.label)).slice(0, 8);
  const locSlug = data.location && !isLocationOnly ? data.location.slug : null;

  // FAQPage (AEO) — solo preguntas respondibles con DATO real. El sujeto es el título ya
  // localizado (self-contained en es/en/pt). Salario solo si hay muestra suficiente.
  const withSalary = data.jobs.filter((j) => j.salary_min != null || j.salary_max != null);
  const faqs: { q: string; a: string }[] = [];
  if (data.total > 0) {
    faqs.push({ q: t("faqCount", { subject: title }), a: t("count", { count: data.total }) });
    if (data.companies.length) faqs.push({ q: t("faqCompanies", { subject: title }), a: data.companies.join(", ") });
    // Solo un periodo (el modal) para no mezclar €/hora con €/año. Rango TÍPICO p25–p75
    // (no min–max crudo) para que un outlier de dato sucio no falsee la respuesta AEO.
    const byPeriod: Record<string, typeof withSalary> = {};
    for (const j of withSalary) (byPeriod[j.salary_period ?? "month"] ??= []).push(j);
    const period = Object.keys(byPeriod).sort((a, b) => byPeriod[b].length - byPeriod[a].length)[0];
    const sample = period ? byPeriod[period] : [];
    if (sample.length >= 5) {
      const mids = sample.map((j) => ((j.salary_min ?? j.salary_max!) + (j.salary_max ?? j.salary_min!)) / 2).sort((a, b) => a - b);
      const at = (p: number) => mids[Math.floor(p * (mids.length - 1))];
      const suf = PERIOD_SUFFIX[locale.split("-")[0]]?.[period] ?? "";
      const cur = sample[0].salary_currency ?? "EUR";
      const sym = cur === "USD" ? "$" : `${cur} `;
      const range = `${sym}${Math.round(at(0.25)).toLocaleString(locale)}–${Math.round(at(0.75)).toLocaleString(locale)}${suf}`;
      faqs.push({ q: t("faqSalary", { subject: title }), a: t("faqSalaryA", { range }) });
    }
  }

  const jobUrl = (j: (typeof data.jobs)[number]) => `${SITE}/${locale}/empleos/oferta/${jobSlug(j)}`;
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

  return (
    <div style={{ "--brand": "#0E5C4A", "--accent": "#F1543F", "--soft": "#79746B", "--line": "#E7E1D4", "--surface": "#FCFAF6", "--bg": "#F4F0E8", "--brandSoft": "#DCEFE4", background: "#F4F0E8", minHeight: "100vh", fontFamily: "'Hanken Grotesk',system-ui,sans-serif", color: "#1A1A17", WebkitFontSmoothing: "antialiased" } as React.CSSProperties}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "16px 16px 60px" }}>
        <Link href="/empleos" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: MONO, fontSize: 12, fontWeight: 700, color: "var(--brand)" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>{t("browseAll")}
        </Link>

        <h1 style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 28, letterSpacing: "-1px", margin: "18px 0 6px", lineHeight: 1.05 }}>{title}</h1>
        <div style={{ fontFamily: MONO, fontSize: 12, color: "var(--soft)", marginBottom: intro ? 10 : 18 }}>{t("count", { count: data.total })}</div>
        {intro && <p style={{ fontSize: 13.5, lineHeight: 1.5, color: "#3A3833", margin: "0 0 18px" }}>{intro}</p>}

        {data.jobs.length === 0 ? (
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: 18 }}>
            <p style={{ fontSize: 14, lineHeight: 1.5, color: "#3A3833", margin: "0 0 14px" }}>{t("empty", { what: title })}</p>
            <HubAlert criteria={{ ...(data.kind === "category" ? { categoryKey: data.facets.category[0]?.value } : {}), ...(data.kind === "jobtitle" ? { q: data.label } : {}), ...(loc ? { location: loc } : {}) }} />
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data.jobs.map((j) => {
              const logo = logoFor(j.company?.name);
              const m = modalityStyle(j.modality);
              return (
                <Link key={j.id} href={{ pathname: "/empleos/oferta/[slug]", params: { slug: jobSlug(j) } }} className="jb-job" style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: 14, color: "inherit" }}>
                  <span style={{ width: 40, height: 40, borderRadius: 11, background: logo.bg, color: logo.color, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ARCHIVO, fontWeight: 900, fontSize: 14, flexShrink: 0 }}>{logo.initials}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: MONO, fontSize: 10, color: "var(--soft)" }}>{j.company?.name}{j.city ? ` · ${j.city}` : ""}</div>
                    <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 14.5, letterSpacing: "-.2px", lineHeight: 1.15, marginTop: 2 }}>{j.title}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
                      {formatSalary(j, locale) && <span style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 12, color: "var(--brand)" }}>{formatSalary(j, locale)}</span>}
                      {j.modality && <span style={{ fontSize: 10.5, fontWeight: 700, color: m.color, background: m.bg, border: `1px solid ${m.border}`, borderRadius: 6, padding: "2px 7px" }}>{j.modality}</span>}
                      <span style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--soft)" }}>{relativeDate(j.created_at, locale)}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Interlinking (SEO/AEO): otras áreas, manteniendo la ubicación si estamos en un hub con ciudad. */}
        <div style={{ fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: .5, color: "var(--soft)", margin: "28px 0 11px" }}>{t("relatedCats")}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {related.map((c) => {
            const catSeg = citySlug(c.label);
            return (
              <Link
                key={c.key}
                href={locSlug
                  ? { pathname: "/empleos/[categoria]/[ubicacion]", params: { categoria: catSeg, ubicacion: locSlug } }
                  : { pathname: "/empleos/[categoria]", params: { categoria: catSeg } }}
                style={{ fontSize: 12.5, fontWeight: 600, color: "#54504A", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 999, padding: "6px 12px" }}
              >{c.label}</Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
