"use client";

import type { Company } from "@/lib/types";
import type { CareerSiteContent } from "@/lib/career-site-types";

const SOCIAL_ICONS: Record<string, string> = {
  linkedin: "in", instagram: "ig", twitter: "tw", facebook: "fb", youtube: "yt", tiktok: "tk",
};

function hasContent(value: unknown): boolean {
  if (!value) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return false;
}

export function CareerSitePreview({
  content,
  company,
  activeJobsCount,
}: {
  content: CareerSiteContent;
  company: { name: string; logo_url?: string | null; description?: string | null; slug?: string } | null;
  activeJobsCount: number;
}) {
  const ink = "#1A1A17";
  const soft = "#79746B";
  const brand = "#0E5C4A";
  const line = "#E7E1D4";
  const surface = "#FCFAF6";
  const bg = "#ECEAE4";

  const mono: React.CSSProperties = { fontFamily: "'Space Mono',monospace" };
  const archivo: React.CSSProperties = { fontFamily: "'Archivo',sans-serif" };
  const hanken: React.CSSProperties = { fontFamily: "'Hanken Grotesk',sans-serif" };

  const sectionTitle = (text: string) => (
    <div style={{ ...mono, fontSize: "9px", letterSpacing: "1.2px", textTransform: "uppercase", color: soft, marginBottom: "8px" }}>
      {text}
    </div>
  );

  return (
    <div style={{ ...hanken, fontSize: "12px", color: ink, background: bg }}>

      {/* Hero */}
      <div style={{
        background: content.heroImageUrl
          ? `linear-gradient(to bottom, rgba(0,0,0,.45), rgba(0,0,0,.2)), url(${content.heroImageUrl}) center/cover`
          : surface,
        padding: "24px 18px 20px",
        borderBottom: `1px solid ${line}`,
        minHeight: content.heroImageUrl ? "110px" : undefined,
        display: "flex", flexDirection: "column", justifyContent: "flex-end",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {company?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.logo_url} alt="" style={{ width: "40px", height: "40px", borderRadius: "10px", objectFit: "contain", flexShrink: 0, background: "#fff" }} />
          ) : (
            <div style={{ ...archivo, width: "40px", height: "40px", borderRadius: "10px", background: brand, color: "#C6F24E", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "18px", flexShrink: 0 }}>
              {company?.name?.[0] ?? "T"}
            </div>
          )}
          <div>
            <div style={{ ...mono, fontSize: "8px", letterSpacing: "1px", textTransform: "uppercase", color: content.heroImageUrl ? "rgba(255,255,255,.7)" : brand, marginBottom: "3px" }}>
              Estamos contratando
            </div>
            <div style={{ ...archivo, fontWeight: 900, fontSize: "16px", letterSpacing: "-.4px", lineHeight: 1.1, color: content.heroImageUrl ? "#fff" : ink }}>
              {hasContent(content.headline) ? content.headline : (
                <>Trabaja en <span style={{ fontStyle: "italic", color: content.heroImageUrl ? "#C6F24E" : "#F1543F" }}>{company?.name ?? "…"}</span></>
              )}
            </div>
          </div>
        </div>
        {hasContent(company?.description) && !hasContent(content.headline) && (
          <p style={{ fontSize: "10.5px", color: content.heroImageUrl ? "rgba(255,255,255,.8)" : soft, marginTop: "8px", lineHeight: 1.4, margin: "8px 0 0" }}>
            {company?.description}
          </p>
        )}
      </div>

      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* About */}
        {(hasContent(content.aboutTitle) || hasContent(content.aboutDescription)) && (
          <div>
            {sectionTitle(content.aboutTitle || "Sobre nosotros")}
            {hasContent(content.aboutDescription) && (
              <p style={{ fontSize: "11px", color: soft, lineHeight: 1.55, margin: 0 }}>{content.aboutDescription}</p>
            )}
          </div>
        )}

        {/* Metrics */}
        {hasContent(content.aboutMetrics) && (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {(content.aboutMetrics ?? []).map((m, i) => (
              <div key={i} style={{ background: surface, border: `1px solid ${line}`, borderRadius: "8px", padding: "8px 12px", textAlign: "center", minWidth: "60px" }}>
                <div style={{ ...archivo, fontWeight: 900, fontSize: "16px", letterSpacing: "-.5px", color: brand }}>{m.value}</div>
                <div style={{ ...mono, fontSize: "8px", color: soft, textTransform: "uppercase", letterSpacing: ".5px" }}>{m.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Gallery preview */}
        {hasContent(content.aboutGallery) && (
          <div>
            {sectionTitle("Galería")}
            <div style={{ display: "flex", gap: "6px", overflowX: "auto" }}>
              {(content.aboutGallery ?? []).slice(0, 4).map((g, i) => (
                <div key={i} style={{ width: "80px", height: "54px", borderRadius: "8px", background: line, flexShrink: 0, overflow: "hidden" }}>
                  {g.type === "image" && g.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={g.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : g.type === "video" ? (
                    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: soft, gap: "3px" }}>
                      <span style={{ fontSize: "16px" }}>▶</span>
                      <span style={{ ...mono, fontSize: "7px", letterSpacing: ".5px", textTransform: "uppercase" }}>video</span>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Brands */}
        {hasContent(content.brands) && (
          <div>
            {sectionTitle(content.brandsTitle || "Marcas")}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {(content.brands ?? []).map((b, i) => (
                <div key={i} style={{ padding: "4px 10px", border: `1px solid ${line}`, borderRadius: "6px", background: surface, fontSize: "10px", fontWeight: 700 }}>
                  {b.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Culture */}
        {(hasContent(content.cultureTitle) || hasContent(content.cultureDescription) || hasContent(content.cultureValues)) && (
          <div>
            {sectionTitle(content.cultureTitle || "Cultura y valores")}
            {hasContent(content.cultureDescription) && (
              <p style={{ fontSize: "10.5px", color: soft, marginBottom: "8px", lineHeight: 1.5 }}>{content.cultureDescription}</p>
            )}
            {hasContent(content.cultureValues) && (
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {(content.cultureValues ?? []).map((v, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 9px", background: "#EAF7C4", borderRadius: "999px", fontSize: "10px", fontWeight: 700 }}>
                    {v.icon && <span>{v.icon}</span>}
                    {v.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Looking for */}
        {(hasContent(content.lookingForTitle) || hasContent(content.lookingForDescription)) && (
          <div>
            {sectionTitle(content.lookingForTitle || "Qué buscamos")}
            {hasContent(content.lookingForDescription) && (
              <p style={{ fontSize: "10.5px", color: soft, margin: 0, lineHeight: 1.55 }}>{content.lookingForDescription}</p>
            )}
          </div>
        )}

        {/* Benefits */}
        {hasContent(content.benefits) && (
          <div>
            {sectionTitle(content.benefitsTitle || "Beneficios")}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
              {(content.benefits ?? []).map((b, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 8px", background: surface, border: `1px solid ${line}`, borderRadius: "7px", fontSize: "10.5px" }}>
                  {b.icon && <span>{b.icon}</span>}
                  <span style={{ fontWeight: 600 }}>{b.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Team */}
        {(hasContent(content.teamTitle) || hasContent(content.teamProfiles)) && (
          <div>
            {sectionTitle(content.teamTitle || "El equipo")}
            {hasContent(content.teamDescription) && (
              <p style={{ fontSize: "10.5px", color: soft, marginBottom: "8px", lineHeight: 1.5 }}>{content.teamDescription}</p>
            )}
            {hasContent(content.teamProfiles) && (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {(content.teamProfiles ?? []).slice(0, 6).map((p, i) => (
                  <div key={i} style={{ textAlign: "center", width: "62px" }}>
                    {p.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.photoUrl} alt={p.name} style={{ width: "42px", height: "42px", borderRadius: "50%", objectFit: "cover", border: `1px solid ${line}` }} />
                    ) : (
                      <div style={{ ...archivo, width: "42px", height: "42px", borderRadius: "50%", background: "linear-gradient(135deg,#8FE3D0,#4FBFA6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "14px", color: "#063D31", margin: "0 auto" }}>
                        {p.name?.[0]?.toUpperCase() ?? "?"}
                      </div>
                    )}
                    <div style={{ fontSize: "9px", fontWeight: 700, marginTop: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                    <div style={{ ...mono, fontSize: "8px", color: soft, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.position}</div>
                    {p.linkedinUrl && (
                      <a href={p.linkedinUrl} target="_blank" rel="noreferrer" style={{ ...mono, fontSize: "7.5px", color: "#0A66C2", textDecoration: "none" }}>in</a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Testimonials */}
        {hasContent(content.testimonials) && (
          <div>
            {sectionTitle("Testimonios")}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {(content.testimonials ?? []).slice(0, 2).map((t, i) => (
                <div key={i} style={{ padding: "10px 12px", background: surface, border: `1px solid ${line}`, borderRadius: "9px" }}>
                  <p style={{ fontSize: "10.5px", color: ink, lineHeight: 1.45, margin: "0 0 6px", fontStyle: "italic" }}>"{t.text}"</p>
                  <div style={{ fontSize: "9.5px", fontWeight: 700 }}>{t.name}</div>
                  <div style={{ ...mono, fontSize: "8.5px", color: soft }}>{t.position}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Jobs placeholder */}
        <div style={{ padding: "10px 12px", background: surface, border: `1px solid ${line}`, borderRadius: "9px" }}>
          <div style={{ ...mono, fontSize: "8.5px", letterSpacing: ".8px", textTransform: "uppercase", color: brand, marginBottom: "4px" }}>
            Ofertas de trabajo
          </div>
          <div style={{ ...archivo, fontWeight: 800, fontSize: "13px" }}>
            {activeJobsCount > 0 ? `${activeJobsCount} posición${activeJobsCount > 1 ? "es" : ""} abierta${activeJobsCount > 1 ? "s" : ""}` : "Sin posiciones abiertas"}
          </div>
        </div>

        {/* FAQs */}
        {hasContent(content.faqs) && (
          <div>
            {sectionTitle(content.faqsTitle || "Preguntas frecuentes")}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {(content.faqs ?? []).slice(0, 3).map((f, i) => (
                <div key={i} style={{ padding: "8px 10px", background: surface, border: `1px solid ${line}`, borderRadius: "8px" }}>
                  <div style={{ fontSize: "10.5px", fontWeight: 700, marginBottom: "3px" }}>{f.question}</div>
                  <div style={{ fontSize: "10px", color: soft, lineHeight: 1.4 }}>{f.answer}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Social */}
        {hasContent(content.socialLinks) && (
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", paddingTop: "4px", borderTop: `1px solid ${line}` }}>
            {(content.socialLinks ?? []).map((s, i) => (
              <span key={i} style={{
                ...mono, fontSize: "9px", padding: "4px 8px",
                background: ink, color: "#fff", borderRadius: "5px", textTransform: "uppercase",
              }}>
                {SOCIAL_ICONS[s.platform] ?? s.platform}
              </span>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!hasContent(content.headline) && !hasContent(content.aboutDescription) &&
          !hasContent(content.aboutMetrics) && !hasContent(content.cultureValues) &&
          !hasContent(content.benefits) && !hasContent(content.faqs) && (
          <div style={{ textAlign: "center", padding: "24px 12px", color: soft, fontSize: "11px", lineHeight: 1.5 }}>
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>✏️</div>
            Empieza a rellenar las secciones de la izquierda para ver el preview.
          </div>
        )}

        <div style={{ textAlign: "center", ...mono, fontSize: "8.5px", color: soft, paddingTop: "4px" }}>
          POWERED BY <span style={{ color: brand }}>TALENTOS</span>
        </div>
      </div>
    </div>
  );
}
