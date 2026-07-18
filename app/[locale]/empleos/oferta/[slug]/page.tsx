import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { searchJobs } from "@/lib/job-board/search";
import { idFromSlug, formatSalary, modalityStyle, logoFor, relativeDate, jobSlug } from "@/lib/board/format";
import { Link } from "@/i18n/navigation";
import { JobApplyBar } from "@/components/board/job-apply-bar";

const ARCHIVO = "'Archivo',sans-serif";
const MONO = "'Space Mono',monospace";

type JobDetail = {
  id: string; title: string; description: string | null; city: string | null; country_code: string | null;
  location: string | null; modality: string | null; salary_min: number | null; salary_max: number | null;
  salary_currency: string | null; employment_type: string | null; category: string | null; created_at: string;
  education_level: string | null; seniority_level: string | null; experience_min_years: number | null;
  closes_at: string | null;
  company: { id: string; name: string; slug: string | null; logo_url: string | null } | null;
};

async function getJob(slug: string) {
  const id = idFromSlug(slug);
  if (!id) return null;
  const supabase = createClient();
  const { data: job } = await supabase
    .from("jobs")
    .select("id, title, description, city, country_code, location, modality, salary_min, salary_max, salary_currency, employment_type, category, created_at, education_level, seniority_level, experience_min_years, closes_at, company:companies(id, name, slug, logo_url)")
    .eq("id", id).eq("status", "active").maybeSingle();
  if (!job) return null;
  const { data: skillRows } = await supabase
    .from("job_skills").select("requirement, skills(name)").eq("job_id", id);
  const skills = (skillRows ?? []).map((r) => ({
    name: (r.skills as { name?: string } | null)?.name ?? "",
    requirement: (r.requirement ?? "deseable") as "excluyente" | "deseable",
  })).filter((s) => s.name);
  const { data: screening } = await supabase
    .from("screening_questions").select("id, type, prompt, options, required").eq("job_id", id).order("order_index");
  return { job: job as unknown as JobDetail, skills, screening: screening ?? [] };
}

export async function generateMetadata({ params }: { params: { locale: string; slug: string } }): Promise<Metadata> {
  const data = await getJob(params.slug);
  if (!data) return {};
  const { job } = data;
  const desc = (job.description ?? "").slice(0, 155);
  return {
    title: `${job.title} · ${job.company?.name ?? "TalentOS"}`,
    description: desc,
    alternates: { canonical: `/${params.locale}/empleos/oferta/${params.slug}` },
  };
}

const CAP = (s: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

export default async function JobDetailPage({ params }: { params: { locale: string; slug: string } }) {
  setRequestLocale(params.locale);
  const data = await getJob(params.slug);
  if (!data) notFound();
  const { job, skills, screening } = data;
  const t = await getTranslations({ locale: params.locale, namespace: "Board" });
  const locale = params.locale;

  const m = modalityStyle(job.modality);
  const logo = logoFor(job.company?.name);
  const salary = formatSalary(job, locale);

  // Ofertas relacionadas (misma categoría, excluye la actual)
  const related = job.category
    ? (await searchJobs(createClient(), { category: job.category, pageSize: 4 })).jobs.filter((j) => j.id !== job.id).slice(0, 3)
    : [];

  // JobPosting JSON-LD — la palanca SEO real (Google for Jobs)
  const jsonLd = {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: job.title,
    description: job.description ?? job.title,
    datePosted: job.created_at,
    validThrough: job.closes_at ?? undefined,
    employmentType: job.employment_type ?? undefined,
    hiringOrganization: job.company
      ? { "@type": "Organization", name: job.company.name, logo: job.company.logo_url ?? undefined }
      : undefined,
    jobLocation: {
      "@type": "Place",
      address: { "@type": "PostalAddress", addressLocality: job.city ?? undefined, addressCountry: job.country_code ?? undefined },
    },
    jobLocationType: job.modality === "remoto" ? "TELECOMMUTE" : undefined,
    baseSalary: job.salary_min != null || job.salary_max != null
      ? {
          "@type": "MonetaryAmount",
          currency: job.salary_currency ?? "USD",
          value: { "@type": "QuantitativeValue", minValue: job.salary_min ?? undefined, maxValue: job.salary_max ?? undefined, unitText: "MONTH" },
        }
      : undefined,
  };

  const reqs: string[] = [];
  if ((job.experience_min_years ?? 0) > 0) reqs.push(t("detail.reqExperience", { years: job.experience_min_years! }));
  if (job.education_level) reqs.push(t("detail.reqEducation", { level: CAP(job.education_level) }));
  if (job.seniority_level) reqs.push(t("detail.reqSeniority", { level: CAP(job.seniority_level) }));

  return (
    <div style={{ "--brand": "#0E5C4A", "--accent": "#F1543F", "--soft": "#79746B", "--line": "#E7E1D4", "--surface": "#FCFAF6", "--bg": "#F4F0E8", "--brandSoft": "#DCEFE4", background: "#F4F0E8", minHeight: "100vh", fontFamily: "'Hanken Grotesk',system-ui,sans-serif", color: "#1A1A17", WebkitFontSmoothing: "antialiased", paddingBottom: 90 } as React.CSSProperties}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "16px 16px 12px" }}>
        <Link href="/empleos" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: MONO, fontSize: 12, fontWeight: 700, color: "var(--brand)" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          {t("detail.back")}
        </Link>

        <div style={{ display: "flex", alignItems: "flex-start", gap: 13, margin: "16px 0" }}>
          <span style={{ width: 52, height: 52, borderRadius: 14, background: logo.bg, color: logo.color, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ARCHIVO, fontWeight: 900, fontSize: 19, flexShrink: 0 }}>{logo.initials}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            {job.company?.slug
              ? <Link href={{ pathname: "/empleos/empresa/[slug]", params: { slug: job.company.slug } }} style={{ fontFamily: MONO, fontSize: 12, color: "var(--brand)", fontWeight: 700 }}>{job.company.name} →</Link>
              : <div style={{ fontFamily: MONO, fontSize: 12, color: "var(--brand)", fontWeight: 700 }}>{job.company?.name}</div>}
            <h1 style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 24, lineHeight: 1.05, letterSpacing: "-.8px", margin: "3px 0 0" }}>{job.title}</h1>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 16 }}>
          {job.city && <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "#54504A", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 9, padding: "6px 10px" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 21s7-6 7-12a7 7 0 10-14 0c0 6 7 12 7 12Z" stroke="var(--soft)" strokeWidth="2" strokeLinejoin="round" /><circle cx="12" cy="9" r="2.4" stroke="var(--soft)" strokeWidth="2" /></svg>{job.city}
          </span>}
          {job.modality && <span style={{ fontSize: 12, fontWeight: 700, color: m.color, background: m.bg, border: `1px solid ${m.border}`, borderRadius: 9, padding: "6px 10px" }}>{t(`modality.${job.modality}`)}</span>}
          {job.employment_type && <span style={{ fontSize: 12, fontWeight: 600, color: "#54504A", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 9, padding: "6px 10px" }}>{job.employment_type}</span>}
        </div>

        {salary && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: "14px 15px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontFamily: MONO, fontSize: 9.5, textTransform: "uppercase", letterSpacing: .5, color: "var(--soft)" }}>{t("detail.salary")}</div>
              <div style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 19, letterSpacing: "-.4px", color: "var(--brand)", marginTop: 3 }}>{salary}</div>
            </div>
            <span style={{ fontFamily: MONO, fontSize: 10, color: "var(--soft)" }}>{relativeDate(job.created_at, locale)}</span>
          </div>
        )}

        {job.description && <>
          <div style={{ fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: .5, color: "var(--soft)", marginBottom: 8 }}>{t("detail.about")}</div>
          <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "#3A3833", margin: "0 0 18px", whiteSpace: "pre-wrap" }}>{job.description}</p>
        </>}

        {(reqs.length > 0 || skills.length > 0) && <>
          <div style={{ fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: .5, color: "var(--soft)", marginBottom: 9 }}>{t("detail.looking")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
            {reqs.map((r, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10" fill="var(--brandSoft)" /><path d="M8 12.5l2.5 2.5 5-5.5" stroke="var(--brand)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span style={{ fontSize: 13.5, lineHeight: 1.45, color: "#3A3833" }}>{r}</span>
              </div>
            ))}
          </div>
          {skills.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 22 }}>
              {skills.map((s) => (
                <span key={s.name} title={s.requirement === "excluyente" ? t("detail.required") : t("detail.desirable")} style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: s.requirement === "excluyente" ? "#0E5C4A" : "#54504A", background: s.requirement === "excluyente" ? "var(--brandSoft)" : "var(--surface)", border: `1px solid ${s.requirement === "excluyente" ? "#BEE0CE" : "var(--line)"}`, borderRadius: 7, padding: "4px 9px" }}>{s.name}</span>
              ))}
            </div>
          )}
        </>}

        {related.length > 0 && <>
          <div style={{ fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: .5, color: "var(--soft)", marginBottom: 11 }}>{t("detail.related")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {related.map((r) => {
              const rl = logoFor(r.company?.name);
              return (
                <Link key={r.id} href={{ pathname: "/empleos/oferta/[slug]", params: { slug: jobSlug(r) } }} style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 13, padding: 12, color: "inherit" }} className="jb-job">
                  <span style={{ width: 38, height: 38, borderRadius: 11, background: rl.bg, color: rl.color, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ARCHIVO, fontWeight: 900, fontSize: 13, flexShrink: 0 }}>{rl.initials}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--soft)" }}>{r.company?.name} · {r.city}</div>
                    <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 13.5, letterSpacing: "-.2px", lineHeight: 1.1, marginTop: 2 }}>{r.title}</div>
                    <div style={{ fontFamily: ARCHIVO, fontWeight: 700, fontSize: 11.5, color: "var(--brand)", marginTop: 3 }}>{formatSalary(r, locale)}</div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><path d="M9 6l6 6-6 6" stroke="var(--soft)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </Link>
              );
            })}
          </div>
        </>}
      </div>

      <JobApplyBar jobId={job.id} slug={params.slug} locale={locale} />
    </div>
  );
}
