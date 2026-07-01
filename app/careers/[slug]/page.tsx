import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatSalaryRange } from "@/lib/utils";
import type { Job } from "@/lib/types";
import type { CareerSiteContent } from "@/lib/career-site-types";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  full_time: "Jornada completa", part_time: "Parcial", contract: "Temporal", internship: "Prácticas",
};

const SOCIAL_URLS: Record<string, { label: string; icon: string }> = {
  linkedin:  { label: "LinkedIn",  icon: "in" },
  instagram: { label: "Instagram", icon: "ig" },
  twitter:   { label: "Twitter",   icon: "tw" },
  facebook:  { label: "Facebook",  icon: "fb" },
  youtube:   { label: "YouTube",   icon: "yt" },
  tiktok:    { label: "TikTok",    icon: "tk" },
};

function has(v: unknown) {
  if (!v) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return false;
}

export default async function CareersPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();

  const { data: company } = await supabase.from("companies").select("*").eq("slug", params.slug).maybeSingle();
  if (!company) notFound();

  const [{ data: jobs }, { data: cmsPage }] = await Promise.all([
    supabase.from("jobs").select("*").eq("company_id", company.id).eq("status", "active").order("created_at", { ascending: false }),
    supabase.from("career_site_pages").select("published_content").eq("company_id", company.id).eq("is_published", true).maybeSingle(),
  ]);

  const cms = (cmsPage?.published_content ?? {}) as CareerSiteContent;
  const activeJobs = (jobs ?? []) as Job[];
  const locSet = new Set(activeJobs.map((j) => j.location).filter(Boolean));
  const locations = Array.from(locSet).slice(0, 3) as string[];

  /* ── shared styles ── */
  const mono: React.CSSProperties = { fontFamily: "'Space Mono',monospace" };
  const archivo: React.CSSProperties = { fontFamily: "'Archivo',sans-serif" };
  const hanken: React.CSSProperties = { fontFamily: "'Hanken Grotesk',system-ui,sans-serif" };
  const ink = "#1A1A17", soft = "#79746B", brand = "#0E5C4A", line = "#E7E1D4", surface = "#FCFAF6";

  function SectionLabel({ text }: { text: string }) {
    return (
      <div style={{ ...mono, fontSize: "10px", letterSpacing: "1.5px", textTransform: "uppercase", color: soft, marginBottom: "16px" }}>
        {text}
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#ECEAE4", ...hanken, WebkitFontSmoothing: "antialiased" }}>

      {/* ── Hero ── */}
      <div style={{
        background: has(cms.heroImageUrl)
          ? `linear-gradient(to bottom, rgba(0,0,0,.5), rgba(0,0,0,.25)), url(${cms.heroImageUrl}) center/cover no-repeat`
          : surface,
        borderBottom: `1px solid ${line}`,
        padding: "52px 28px 44px",
        position: "relative", overflow: "hidden",
      }}>
        {!has(cms.heroImageUrl) && (
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(90% 140% at 88% 0%, #EAF7C4 0%, transparent 55%)", pointerEvents: "none" }} />
        )}
        <div style={{ maxWidth: "760px", margin: "0 auto", position: "relative", display: "flex", alignItems: "center", gap: "20px" }}>
          {company.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.logo_url} alt={company.name} style={{ width: "74px", height: "74px", borderRadius: "18px", border: `1px solid ${line}`, objectFit: "contain", background: "#fff", flexShrink: 0 }} />
          ) : (
            <div style={{ ...archivo, width: "74px", height: "74px", flexShrink: 0, borderRadius: "18px", background: brand, color: "#C6F24E", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "34px", boxShadow: `4px 4px 0 ${ink}` }}>
              {company.name[0]}
            </div>
          )}
          <div>
            <div style={{ ...mono, fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase", color: has(cms.heroImageUrl) ? "rgba(255,255,255,.7)" : brand, marginBottom: "6px" }}>
              Estamos contratando
            </div>
            <h1 style={{ ...archivo, fontWeight: 900, fontSize: "34px", letterSpacing: "-1.2px", lineHeight: 1, margin: 0, color: has(cms.heroImageUrl) ? "#fff" : ink }}>
              {has(cms.headline)
                ? cms.headline
                : <>Trabaja en <span style={{ fontStyle: "italic", color: has(cms.heroImageUrl) ? "#C6F24E" : "#F1543F" }}>{company.name}</span></>
              }
            </h1>
            {company.description && !has(cms.headline) && (
              <p style={{ fontSize: "14.5px", color: has(cms.heroImageUrl) ? "rgba(255,255,255,.8)" : soft, margin: "10px 0 0", maxWidth: "520px", lineHeight: 1.5 }}>
                {company.description}
              </p>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "0 28px 40px" }}>

        {/* ── Sobre nosotros ── */}
        {(has(cms.aboutTitle) || has(cms.aboutDescription)) && (
          <section style={{ padding: "40px 0 0" }}>
            <SectionLabel text={cms.aboutTitle || "Sobre nosotros"} />
            {has(cms.aboutDescription) && (
              <p style={{ fontSize: "15px", lineHeight: 1.65, color: ink, margin: 0, maxWidth: "640px" }}>{cms.aboutDescription}</p>
            )}
          </section>
        )}

        {/* ── Métricas ── */}
        {has(cms.aboutMetrics) && (
          <section style={{ padding: "32px 0 0", display: "flex", gap: "16px", flexWrap: "wrap" }}>
            {(cms.aboutMetrics ?? []).map((m, i) => (
              <div key={i} style={{ background: surface, border: `1px solid ${line}`, borderRadius: "14px", padding: "16px 20px", minWidth: "100px", textAlign: "center" }}>
                <div style={{ ...archivo, fontWeight: 900, fontSize: "28px", letterSpacing: "-1px", color: brand }}>{m.value}</div>
                <div style={{ ...mono, fontSize: "10px", color: soft, textTransform: "uppercase", letterSpacing: ".5px", marginTop: "4px" }}>{m.label}</div>
              </div>
            ))}
          </section>
        )}

        {/* ── Galería ── */}
        {has(cms.aboutGallery) && (
          <section style={{ padding: "32px 0 0" }}>
            <div style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "4px" }}>
              {(cms.aboutGallery ?? []).map((g, i) => (
                <div key={i} style={{ width: "200px", height: "134px", flexShrink: 0, borderRadius: "12px", overflow: "hidden", background: line }}>
                  {g.type === "image" && g.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={g.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", color: soft }}>▶</div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Marcas ── */}
        {has(cms.brands) && (
          <section style={{ padding: "40px 0 0" }}>
            <SectionLabel text={cms.brandsTitle || "Empresas del grupo"} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
              {(cms.brands ?? []).map((b, i) => (
                <a key={i} href={b.website || undefined} target="_blank" rel="noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", background: surface, border: `1.5px solid ${line}`, borderRadius: "12px", textDecoration: "none", color: ink }}>
                  {b.logoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.logoUrl} alt={b.name} style={{ height: "24px", objectFit: "contain" }} />
                  )}
                  <span style={{ fontWeight: 700, fontSize: "13px" }}>{b.name}</span>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* ── Cultura y valores ── */}
        {(has(cms.cultureTitle) || has(cms.cultureDescription) || has(cms.cultureValues)) && (
          <section style={{ padding: "40px 0 0" }}>
            <SectionLabel text={cms.cultureTitle || "Cultura y valores"} />
            {has(cms.cultureDescription) && (
              <p style={{ fontSize: "14.5px", lineHeight: 1.6, color: soft, maxWidth: "580px", marginBottom: "20px" }}>{cms.cultureDescription}</p>
            )}
            {has(cms.cultureValues) && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                {(cms.cultureValues ?? []).map((v, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 16px", background: "#EAF7C4", border: `1.5px solid ${ink}`, borderRadius: "999px", fontWeight: 700, fontSize: "14px", boxShadow: `2px 2px 0 ${ink}` }}>
                    {v.icon && <span style={{ fontSize: "16px" }}>{v.icon}</span>}
                    {v.name}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Qué buscamos ── */}
        {(has(cms.lookingForTitle) || has(cms.lookingForDescription)) && (
          <section style={{ padding: "40px 0 0" }}>
            <SectionLabel text={cms.lookingForTitle || "El perfil que buscamos"} />
            {has(cms.lookingForDescription) && (
              <p style={{ fontSize: "14.5px", lineHeight: 1.65, color: ink, margin: 0, maxWidth: "620px" }}>{cms.lookingForDescription}</p>
            )}
          </section>
        )}

        {/* ── Beneficios ── */}
        {has(cms.benefits) && (
          <section style={{ padding: "40px 0 0" }}>
            <SectionLabel text={cms.benefitsTitle || "Qué te ofrecemos"} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "10px" }}>
              {(cms.benefits ?? []).map((b, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "14px 16px", background: surface, border: `1.5px solid ${line}`, borderRadius: "13px" }}>
                  {b.icon && <span style={{ fontSize: "22px", flexShrink: 0 }}>{b.icon}</span>}
                  <span style={{ fontWeight: 700, fontSize: "14px" }}>{b.name}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Equipo ── */}
        {(has(cms.teamTitle) || has(cms.teamProfiles)) && (
          <section style={{ padding: "40px 0 0" }}>
            <SectionLabel text={cms.teamTitle || "El equipo"} />
            {has(cms.teamDescription) && (
              <p style={{ fontSize: "14.5px", lineHeight: 1.6, color: soft, marginBottom: "20px" }}>{cms.teamDescription}</p>
            )}
            {has(cms.teamProfiles) && (
              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                {(cms.teamProfiles ?? []).map((p, i) => (
                  <div key={i} style={{ textAlign: "center", width: "96px" }}>
                    {p.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.photoUrl} alt={p.name} style={{ width: "72px", height: "72px", borderRadius: "50%", objectFit: "cover", border: `2px solid ${line}` }} />
                    ) : (
                      <div style={{ ...archivo, width: "72px", height: "72px", borderRadius: "50%", background: "linear-gradient(135deg,#8FE3D0,#4FBFA6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "24px", color: "#063D31", margin: "0 auto" }}>
                        {p.name?.[0]?.toUpperCase() ?? "?"}
                      </div>
                    )}
                    <div style={{ fontWeight: 700, fontSize: "13px", marginTop: "8px" }}>{p.name}</div>
                    <div style={{ ...mono, fontSize: "10px", color: soft, marginTop: "2px" }}>{p.position}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Testimonios ── */}
        {has(cms.testimonials) && (
          <section style={{ padding: "40px 0 0" }}>
            <SectionLabel text="Testimonios" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "14px" }}>
              {(cms.testimonials ?? []).map((t, i) => (
                <div key={i} style={{ padding: "20px", background: surface, border: `1.5px solid ${line}`, borderRadius: "14px" }}>
                  <p style={{ fontSize: "14px", lineHeight: 1.6, color: ink, fontStyle: "italic", margin: "0 0 14px" }}>"{t.text}"</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {t.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.photoUrl} alt={t.name} style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ ...archivo, width: "36px", height: "36px", borderRadius: "50%", background: "#DCEFE4", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "13px", color: brand }}>
                        {t.name?.[0]?.toUpperCase() ?? "?"}
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "13px" }}>{t.name}</div>
                      <div style={{ ...mono, fontSize: "10px", color: soft }}>{t.position}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Ofertas activas ── */}
        <section style={{ padding: "40px 0 0" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "18px" }}>
            <h2 style={{ ...mono, fontSize: "12px", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: soft, margin: 0 }}>
              {activeJobs.length} posiciones abiertas
            </h2>
            {locations.length > 0 && (
              <span style={{ fontSize: "12.5px", color: soft }}>{locations.join(" · ")}</span>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "13px" }}>
            {activeJobs.map((job) => (
              <Link key={job.id} href={`/careers/${params.slug}/jobs/${job.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div className="career-job-card" style={{ background: surface, border: `1.5px solid ${line}`, borderRadius: "16px", padding: "21px 22px", cursor: "pointer", transition: "border-color .12s ease" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ ...archivo, fontWeight: 800, fontSize: "19px", letterSpacing: "-.4px" }}>{job.title}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", marginTop: "9px", fontSize: "13px", color: soft }}>
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
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", ...mono, color: ink, fontSize: "12.5px" }}>
                          {formatSalaryRange(job.salary_min, job.salary_max, job.salary_currency)}
                        </span>
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, width: "34px", height: "34px", borderRadius: "50%", border: `1.5px solid ${ink}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke={ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  </div>
                  {job.skills.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "7px", marginTop: "14px" }}>
                      {job.skills.slice(0, 4).map((s) => (
                        <span key={s} style={{ fontSize: "12px", fontWeight: 600, padding: "4px 11px", borderRadius: "999px", background: "#DCEFE4", color: brand }}>{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
            {activeJobs.length === 0 && (
              <div style={{ textAlign: "center", border: `1.5px dashed ${line}`, borderRadius: "16px", padding: "48px", fontSize: "13px", color: soft }}>
                No hay posiciones abiertas ahora mismo.
              </div>
            )}
          </div>
        </section>

        {/* ── FAQs ── */}
        {has(cms.faqs) && (
          <section style={{ padding: "40px 0 0" }}>
            <SectionLabel text={cms.faqsTitle || "Preguntas frecuentes"} />
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {(cms.faqs ?? []).map((f, i) => (
                <div key={i} style={{ padding: "16px 18px", background: surface, border: `1.5px solid ${line}`, borderRadius: "13px" }}>
                  <div style={{ fontWeight: 700, fontSize: "14.5px", marginBottom: "6px" }}>{f.question}</div>
                  <div style={{ fontSize: "14px", color: soft, lineHeight: 1.55 }}>{f.answer}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Footer ── */}
        <div style={{ paddingTop: "48px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          {has(cms.socialLinks) && (
            <div style={{ display: "flex", gap: "8px" }}>
              {(cms.socialLinks ?? []).map((s, i) => {
                const meta = SOCIAL_URLS[s.platform];
                return (
                  <a key={i} href={s.url} target="_blank" rel="noreferrer"
                    style={{ ...mono, fontSize: "10px", padding: "6px 11px", background: ink, color: "#fff", borderRadius: "7px", textDecoration: "none", textTransform: "uppercase", letterSpacing: ".5px" }}>
                    {meta?.label ?? s.platform}
                  </a>
                );
              })}
            </div>
          )}
          <div style={{ ...mono, fontSize: "11px", letterSpacing: "1px", color: soft, marginLeft: "auto" }}>
            POWERED BY <span style={{ color: brand, fontWeight: 700 }}>TALENTOS</span>
          </div>
        </div>

      </div>
    </div>
  );
}
