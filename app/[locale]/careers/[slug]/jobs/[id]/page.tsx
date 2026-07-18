import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Markdown } from "@/components/markdown";
import { ApplyForm } from "@/components/features/apply-form";
import { TrackCareerEvent } from "@/components/features/career-site-track";
import { createClient } from "@/lib/supabase/server";
import { formatSalaryRange } from "@/lib/utils";
import type { CareerSiteBranding } from "@/lib/career-site-types";
import { HEADING_FONTS, BODY_FONTS } from "@/lib/career-site-types";
import { getJobJsonLd } from "@/lib/career-site/job-jsonld";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  full_time: "Jornada completa", part_time: "Parcial", contract: "Temporal", internship: "Prácticas",
};

export default async function PublicJobPage({ params }: { params: { slug: string; id: string } }) {
  const supabase = createClient();

  const [{ data: company }, { data: cmsPage }] = await Promise.all([
    supabase.from("companies").select("id, name, slug, logo_url").eq("slug", params.slug).maybeSingle(),
    supabase.from("career_site_pages").select("branding").eq("slug", params.slug).maybeSingle(),
  ]);
  if (!company) notFound();

  const { data: job } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", params.id)
    .eq("company_id", company.id)
    .eq("status", "active")
    .maybeSingle();
  if (!job) notFound();

  const jsonLd = getJobJsonLd(job, company);

  /* ── Branding ── */
  const branding = (cmsPage?.branding ?? {}) as CareerSiteBranding;
  const brandColor  = branding.primaryColor ?? "#0E5C4A";
  const hFont = HEADING_FONTS.find((f) => f.value === (branding.headingFont ?? "")) ?? HEADING_FONTS[0];
  const bFont = BODY_FONTS.find((f)   => f.value === (branding.bodyFont    ?? "")) ?? BODY_FONTS[0];

  const gFontParts = [
    branding.headingFont ? `family=${branding.headingFont}:wght@400;700;900` : "",
    branding.bodyFont    ? `family=${branding.bodyFont}:wght@400;600;700`    : "",
  ].filter(Boolean);
  const gFontsImport = gFontParts.length > 0
    ? `@import url('https://fonts.googleapis.com/css2?${gFontParts.join("&")}&display=swap');`
    : "";

  const heading: React.CSSProperties = { fontFamily: hFont.css };
  const body:    React.CSSProperties = { fontFamily: bFont.css };
  const mono:    React.CSSProperties = { fontFamily: "'Space Mono',monospace" };
  const ink = "#1A1A17", soft = "#79746B", line = "#E7E1D4", surface = "#FCFAF6";

  return (
    <div style={{ minHeight: "100vh", background: "#ECEAE4", ...body, WebkitFontSmoothing: "antialiased" }}>
      {gFontsImport && <style dangerouslySetInnerHTML={{ __html: gFontsImport }} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "30px 28px 40px" }}>

        {/* Back link */}
        <Link
          href={`/careers/${params.slug}`}
          style={{ display: "inline-flex", alignItems: "center", gap: "7px", fontSize: "13px", color: soft, cursor: "pointer", marginBottom: "18px", textDecoration: "none" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Todas las posiciones de {company.name}
        </Link>

        {/* Job card */}
        <div style={{ background: surface, border: `1.5px solid ${ink}`, borderRadius: "18px", padding: "30px 30px 28px", boxShadow: `6px 6px 0 ${ink}` }}>
          <h1 style={{ ...heading, fontWeight: 900, fontSize: "30px", letterSpacing: "-1px", lineHeight: 1.04, margin: 0, color: ink }}>
            {job.title}
          </h1>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginTop: "14px", fontSize: "13.5px", color: soft }}>
            {job.location && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 21s7-5.6 7-11a7 7 0 10-14 0c0 5.4 7 11 7 11Z" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="10" r="2.4" stroke="currentColor" strokeWidth="2"/></svg>
                {job.location}
              </span>
            )}
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" strokeWidth="2"/></svg>
              {TYPE_LABEL[job.employment_type] ?? job.employment_type}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", ...mono, color: ink, fontSize: "12.5px" }}>
              {formatSalaryRange(job.salary_min, job.salary_max, job.salary_currency)}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", marginTop: "18px" }}>
            {job.skills.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
                {job.skills.map((s: string) => (
                  <span key={s} style={{ fontSize: "12px", fontWeight: 600, padding: "4px 11px", borderRadius: "999px", background: "#DCEFE4", color: brandColor }}>
                    {s}
                  </span>
                ))}
              </div>
            )}
            <a
              href="#apply-form"
              style={{ flexShrink: 0, ...heading, fontWeight: 800, fontSize: "13.5px", color: "#fff", background: brandColor, border: `2px solid ${ink}`, borderRadius: "12px", padding: "10px 20px", boxShadow: `3px 3px 0 ${ink}`, textDecoration: "none", display: "inline-block" }}
            >
              Inscribirme →
            </a>
          </div>

          {job.description && (
            <>
              <div style={{ height: "1px", background: line, margin: "24px 0" }} />
              <div style={{ ...body, fontSize: "14.5px", lineHeight: 1.65, color: "#3A3833" }}>
                <Markdown content={job.description} />
              </div>
            </>
          )}
        </div>

        {/* Apply form */}
        <div id="apply-form" style={{ marginTop: "22px" }}>
          <Suspense>
            <ApplyForm jobId={job.id} brandColor={brandColor} />
          </Suspense>
        </div>

        <div style={{ textAlign: "center", marginTop: "38px", ...mono, fontSize: "11px", letterSpacing: "1px", color: soft }}>
          POWERED BY <span style={{ color: brandColor, fontWeight: 700 }}>TALENTOS</span>
        </div>
      </div>

      <TrackCareerEvent companyId={company.id} eventType="job_view" jobId={job.id} />
    </div>
  );
}
