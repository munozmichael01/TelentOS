import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { searchJobs } from "@/lib/job-board/search";
import { logoFor, formatSalary, modalityStyle, relativeDate, jobSlug } from "@/lib/board/format";
import { countryName } from "@/lib/countries";
import { Link } from "@/i18n/navigation";
import { EmployerNotify } from "@/components/board/employer-notify";

const ARCHIVO = "'Archivo',sans-serif";
const MONO = "'Space Mono',monospace";

type Company = { id: string; name: string; slug: string | null; logo_url: string | null; description: string | null; website: string | null; address: string | null; country: string | null };

async function getCompany(slug: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("companies")
    .select("id, name, slug, logo_url, description, website, address, country")
    .eq("slug", slug).maybeSingle();
  return data as Company | null;
}

export async function generateMetadata({ params }: { params: { locale: string; slug: string } }): Promise<Metadata> {
  const company = await getCompany(params.slug);
  if (!company) return {};
  return {
    title: `${company.name} · TalentOS Empleos`,
    description: company.description?.slice(0, 155) || `Ofertas de empleo en ${company.name}.`,
  };
}

export default async function EmployerPage({ params }: { params: { locale: string; slug: string } }) {
  setRequestLocale(params.locale);
  const company = await getCompany(params.slug);
  if (!company) notFound();
  const t = await getTranslations({ locale: params.locale, namespace: "Board" });
  const locale = params.locale;

  const { jobs, total } = await searchJobs(createClient(), { companyId: company.id, pageSize: 30 });
  const logo = logoFor(company.name);
  const location = [company.address, company.country ? countryName(company.country) : null].filter(Boolean).join(" · ");

  return (
    <div style={{ "--brand": "#0E5C4A", "--accent": "#F1543F", "--soft": "#79746B", "--line": "#E7E1D4", "--surface": "#FCFAF6", "--bg": "#F4F0E8", "--brandSoft": "#DCEFE4", background: "#F4F0E8", minHeight: "100vh", fontFamily: "'Hanken Grotesk',system-ui,sans-serif", color: "#1A1A17", WebkitFontSmoothing: "antialiased" } as React.CSSProperties}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "16px 16px 60px" }}>
        <Link href="/empleos" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: MONO, fontSize: 12, fontWeight: 700, color: "var(--brand)" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          {t("employer.back")}
        </Link>

        {/* header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, margin: "18px 0" }}>
          <span style={{ width: 60, height: 60, borderRadius: 16, background: logo.bg, color: logo.color, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ARCHIVO, fontWeight: 900, fontSize: 22, flexShrink: 0 }}>{logo.initials}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 26, letterSpacing: "-.9px", margin: 0 }}>{company.name}</h1>
            {location && <div style={{ fontFamily: MONO, fontSize: 12, color: "var(--soft)", marginTop: 4 }}>{location}</div>}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
              <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: "var(--brand)" }}>{t("employer.jobs", { count: total })}</span>
              {company.website && <a href={company.website} target="_blank" rel="noreferrer noopener" style={{ fontFamily: MONO, fontSize: 12, color: "var(--soft)" }}>{t("employer.website")} ↗</a>}
            </div>
          </div>
        </div>

        <EmployerNotify companyId={company.id} companyName={company.name} locale={locale} />

        {company.description && <>
          <div style={{ fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: .5, color: "var(--soft)", margin: "22px 0 8px" }}>{t("employer.about")}</div>
          <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "#3A3833", margin: 0, whiteSpace: "pre-wrap" }}>{company.description}</p>
        </>}

        <div style={{ fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: .5, color: "var(--soft)", margin: "24px 0 11px" }}>{t("employer.openings")}</div>
        {jobs.length === 0 ? (
          <p style={{ fontSize: 13.5, color: "var(--soft)", lineHeight: 1.5 }}>{t("employer.noJobs")}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {jobs.map((j) => {
              const m = modalityStyle(j.modality);
              return (
                <Link key={j.id} href={{ pathname: "/empleos/oferta/[slug]", params: { slug: jobSlug(j) } }} className="jb-job" style={{ display: "block", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: 14, color: "inherit" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 15, letterSpacing: "-.3px", lineHeight: 1.15 }}>{j.title}</div>
                      <div style={{ fontFamily: MONO, fontSize: 10, color: "var(--soft)", marginTop: 3 }}>{[j.city, relativeDate(j.created_at, locale)].filter(Boolean).join(" · ")}</div>
                    </div>
                    {j.modality && <span style={{ fontSize: 11, fontWeight: 700, color: m.color, background: m.bg, border: `1px solid ${m.border}`, borderRadius: 7, padding: "3px 8px", flexShrink: 0 }}>{t(`modality.${j.modality}`)}</span>}
                  </div>
                  {formatSalary(j, locale) && <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 13, color: "var(--brand)", marginTop: 8 }}>{formatSalary(j, locale)}</div>}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
