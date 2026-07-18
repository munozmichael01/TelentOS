import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { HubData } from "@/lib/board/hub";
import { getCategories } from "@/lib/board/categories";
import { citySlug } from "@/lib/board/geo";
import { logoFor, formatSalary, modalityStyle, relativeDate, jobSlug } from "@/lib/board/format";
import { HubAlert } from "@/components/board/hub-alert";

const ARCHIVO = "'Archivo',sans-serif";
const MONO = "'Space Mono',monospace";

// Vista SSR del hub (SEO): título, listado de ofertas, vacío → alerta, y links internos a
// otras categorías (link juice). Reusa el patrón de cards del board.
export async function HubView({ data, locale }: { data: HubData; locale: string }) {
  const t = await getTranslations({ locale, namespace: "Board.hub" });
  const title = data.city
    ? t("titleCatCity", { category: data.categoryLabel, city: data.city })
    : t("titleCat", { category: data.categoryLabel });
  const whatEmpty = data.city ? `${data.categoryLabel} ${t("inCity", { city: data.city })}` : data.categoryLabel;
  const related = getCategories(locale).filter((c) => c.key !== data.categoryKey).slice(0, 8);
  const citySeg = data.city ? citySlug(data.city) : null;

  return (
    <div style={{ "--brand": "#0E5C4A", "--accent": "#F1543F", "--soft": "#79746B", "--line": "#E7E1D4", "--surface": "#FCFAF6", "--bg": "#F4F0E8", "--brandSoft": "#DCEFE4", background: "#F4F0E8", minHeight: "100vh", fontFamily: "'Hanken Grotesk',system-ui,sans-serif", color: "#1A1A17", WebkitFontSmoothing: "antialiased" } as React.CSSProperties}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "16px 16px 60px" }}>
        <Link href="/empleos" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: MONO, fontSize: 12, fontWeight: 700, color: "var(--brand)" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>{t("browseAll")}
        </Link>

        <h1 style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 28, letterSpacing: "-1px", margin: "18px 0 6px", lineHeight: 1.05 }}>{title}</h1>
        <div style={{ fontFamily: MONO, fontSize: 12, color: "var(--soft)", marginBottom: 18 }}>{t("count", { count: data.total })}</div>

        {data.jobs.length === 0 ? (
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: 18 }}>
            <p style={{ fontSize: 14, lineHeight: 1.5, color: "#3A3833", margin: "0 0 14px" }}>{t("empty", { what: whatEmpty })}</p>
            <HubAlert criteria={{ categoryKey: data.categoryKey, ...(data.city ? { location: data.city } : {}) }} />
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

        {/* Link juice: otras áreas (mantiene la ciudad si estamos en un hub de ciudad) */}
        <div style={{ fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: .5, color: "var(--soft)", margin: "28px 0 11px" }}>{t("relatedCats")}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {related.map((c) => (
            <Link
              key={c.key}
              href={citySeg
                ? { pathname: "/empleos/[categoria]/[ubicacion]", params: { categoria: c.key, ubicacion: citySeg } }
                : { pathname: "/empleos/[categoria]", params: { categoria: c.key } }}
              style={{ fontSize: 12.5, fontWeight: 600, color: "#54504A", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 999, padding: "6px 12px" }}
            >{c.label}</Link>
          ))}
        </div>
      </div>
    </div>
  );
}
