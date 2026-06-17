import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatSalaryRange } from "@/lib/utils";
import type { Job } from "@/lib/types";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  full_time: "Jornada completa", part_time: "Parcial", contract: "Temporal", internship: "Prácticas",
};

export default async function CareersPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: company } = await supabase.from("companies").select("*").eq("slug", params.slug).maybeSingle();
  if (!company) notFound();

  const { data: jobs } = await supabase
    .from("jobs")
    .select("*")
    .eq("company_id", company.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const locSet = new Set(((jobs ?? []) as Job[]).map((j) => j.location).filter(Boolean));
  const locations = Array.from(locSet).slice(0, 3) as string[];

  return (
    <div style={{ minHeight: "100vh", background: "#ECEAE4", fontFamily: "'Hanken Grotesk',system-ui,sans-serif", WebkitFontSmoothing: "antialiased" }}>
      {/* company header */}
      <div style={{ background: "#FCFAF6", borderBottom: "1px solid #E7E1D4", padding: "44px 28px 38px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(90% 140% at 88% 0%, #EAF7C4 0%, transparent 55%)", pointerEvents: "none" }} />
        <div style={{ maxWidth: "760px", margin: "0 auto", position: "relative", display: "flex", alignItems: "center", gap: "20px" }}>
          {company.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.logo_url} alt={company.name} style={{ width: "74px", height: "74px", borderRadius: "18px", border: "1px solid #E7E1D4", objectFit: "contain" }} />
          ) : (
            <div style={{ width: "74px", height: "74px", flexShrink: 0, borderRadius: "18px", background: "#0E5C4A", color: "#C6F24E", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "34px", boxShadow: "4px 4px 0 #1A1A17" }}>
              {company.name[0]}
            </div>
          )}
          <div>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase", color: "#0E5C4A", marginBottom: "6px" }}>
              Estamos contratando
            </div>
            <h1 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "34px", letterSpacing: "-1.2px", lineHeight: 1, margin: 0 }}>
              Trabaja en{" "}
              <span style={{ fontStyle: "italic", color: "#F1543F" }}>{company.name}</span>
            </h1>
            {company.description && (
              <p style={{ fontSize: "14.5px", color: "#79746B", margin: "10px 0 0", maxWidth: "520px", lineHeight: 1.5 }}>
                {company.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* jobs list */}
      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "32px 28px 20px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "18px" }}>
          <h2 style={{ fontFamily: "'Space Mono',monospace", fontSize: "12px", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "#79746B", margin: 0 }}>
            {(jobs ?? []).length} posiciones abiertas
          </h2>
          {locations.length > 0 && (
            <span style={{ fontSize: "12.5px", color: "#79746B" }}>{locations.join(" · ")}</span>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "13px" }}>
          {((jobs ?? []) as Job[]).map((job) => (
            <Link
              key={job.id}
              href={`/careers/${params.slug}/jobs/${job.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div className="career-job-card" style={{ background: "#FCFAF6", border: "1.5px solid #E7E1D4", borderRadius: "16px", padding: "21px 22px", cursor: "pointer", transition: "border-color .12s ease" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "19px", letterSpacing: "-.4px" }}>
                      {job.title}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", marginTop: "9px", fontSize: "13px", color: "#79746B" }}>
                      {job.location && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 21s7-5.6 7-11a7 7 0 10-14 0c0 5.4 7 11 7 11Z" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="10" r="2.4" stroke="currentColor" strokeWidth="2"/></svg>
                          {job.location}
                        </span>
                      )}
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" strokeWidth="2"/></svg>
                        {TYPE_LABEL[job.employment_type] ?? job.employment_type}
                      </span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontFamily: "'Space Mono',monospace", color: "#1A1A17", fontSize: "12.5px" }}>
                        {formatSalaryRange(job.salary_min, job.salary_max, job.salary_currency)}
                      </span>
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, width: "34px", height: "34px", borderRadius: "50%", border: "1.5px solid #1A1A17", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#1A1A17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                </div>
                {job.skills.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "7px", marginTop: "14px" }}>
                    {job.skills.slice(0, 4).map((s) => (
                      <span key={s} style={{ fontSize: "12px", fontWeight: 600, padding: "4px 11px", borderRadius: "999px", background: "#DCEFE4", color: "#0E5C4A" }}>
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
          {(jobs ?? []).length === 0 && (
            <div style={{ textAlign: "center", border: "1.5px dashed #E7E1D4", borderRadius: "16px", padding: "48px", fontSize: "13px", color: "#79746B" }}>
              No hay posiciones abiertas ahora mismo.
            </div>
          )}
        </div>

        <div style={{ textAlign: "center", margin: "38px 0 30px", fontFamily: "'Space Mono',monospace", fontSize: "11px", letterSpacing: "1px", color: "#79746B" }}>
          POWERED BY <span style={{ color: "#0E5C4A", fontWeight: 700 }}>TALENTOS</span>
        </div>
      </div>
    </div>
  );
}
