"use client";

import { useState, useRef, useEffect, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { CityAutocomplete } from "@/components/board/city-autocomplete";
import { ARCHIVO, MONO, BoardRoot, HardButton, AiTag, MonoLabel, CompanyLogo, inputStyle } from "@/components/board/ui";

type Modality = "remoto" | "hibrido" | "presencial";

const label: CSSProperties = { fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: .5, color: "var(--soft)", display: "flex", alignItems: "center", gap: 7, marginBottom: 6 };

export function ProfileBuilder({ locale }: { locale: string }) {
  const t = useTranslations("Board.builder");
  const tMod = useTranslations("Board.modality");
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<"intake" | "generating" | "review" | "done">("intake");
  const [loading, setLoading] = useState(true);
  
  // Intake state fields
  const [role, setRole] = useState("");
  const [exp, setExp] = useState("");
  const [modality, setModality] = useState<Modality | null>(null);
  const [pitch, setPitch] = useState("");
  const [cv, setCv] = useState<File | null>(null);
  const [cvName, setCvName] = useState("");
  
  // Existing CV status from API
  const [existingCv, setExistingCv] = useState(false);

  // Proposal/Review fields
  const [gen, setGen] = useState<{
    headline: string;
    about: string;
    skills: string[];
    experience_years: number;
    city: string | null;
    phone: string | null;
    country_code: string | null;
    languages: any[];
    education: any[];
    experiences?: any[];
  }>({
    headline: "",
    about: "",
    skills: [],
    experience_years: 0,
    city: null,
    phone: null,
    country_code: null,
    languages: [],
    education: [],
    experiences: [],
  });

  const [skillDraft, setSkillDraft] = useState("");
  const [pct, setPct] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Generating phase step index
  const [genStepIdx, setGenStepIdx] = useState(0);

  const roleChips = ["Product Designer", "Ingeniería", "Producto", "Datos", "Marketing", "Ventas", "Operaciones"];
  const expChips = ["Junior", "1–3 años", "3–5 años", "5+ años"];
  const modChips: Modality[] = ["remoto", "hibrido", "presencial"];

  const genSteps = [
    t("generatingAnalys"),
    t("generatingWrite"),
    t("generatingSkills"),
    t("generatingFit"),
  ];

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/board/profile");
        if (res.ok) {
          const data = await res.json();
          if (data.completeness?.hasCv) {
            setExistingCv(true);
          }
          const hasProfile = data.profile && (data.profile.headline || data.profile.about);
          const hasSourced = data.sourced && (data.sourced.experiences?.length > 0 || data.sourced.first_name);

          if (hasProfile || hasSourced) {
            const headline = data.profile?.headline || (data.sourced?.experiences?.[0]?.title) || "";
            const about = data.profile?.about || data.sourced?.summary || "";
            const skillsList = data.profile ? (data.skills || []) : (data.sourced?.skills || []);
            const expYears = data.profile?.experience_years ?? data.sourced?.experience_years ?? 0;

            setGen({
              headline,
              about,
              skills: skillsList,
              experience_years: expYears,
              city: data.profile?.city ?? data.sourced?.city ?? null,
              phone: data.profile?.phone ?? data.sourced?.phone ?? null,
              country_code: data.profile?.country_code ?? data.sourced?.country_code ?? null,
              languages: data.profile?.languages ?? data.sourced?.languages ?? [],
              education: data.profile?.education ?? data.sourced?.education ?? [],
              experiences: data.sourced?.experiences ?? [],
            });

            if (data.profile?.pref_modality?.length > 0) {
              setModality(data.profile.pref_modality[0]);
            }
            setStep("review");
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  async function handleFile(file: File | null) {
    if (!file) return;
    setCv(file);
    setCvName(file.name);
  }

  async function generate() {
    setError("");
    setStep("generating");
    setGenStepIdx(0);

    const stepsCount = 4;
    const interval = setInterval(() => {
      setGenStepIdx((prev) => (prev < stepsCount - 1 ? prev + 1 : prev));
    }, 550);

    let parsed: any = null;
    try {
      if (cv) {
        const fd = new FormData();
        fd.append("cv", cv);
        const r = await fetch("/api/careers/parse-cv", { method: "POST", body: fd })
          .then((x) => (x.ok ? x.json() : null))
          .catch(() => null);
        if (r?.profile) {
          parsed = r.profile;
        }
      }

      const expYears = Number(exp.replace(/[^0-9]/g, "")) || parsed?.experience_years || 0;

      // C2 — arranque EN FRÍO (sin CV): el agente redacta titular/"Sobre mí" y sugiere
      // skills desde rol+experiencia+pitch. El agente PROPONE; se muestra para confirmar.
      let enriched: { headline?: string; about?: string; skills?: string[] } | null = null;
      if (!parsed && role.trim()) {
        const r = await fetch("/api/agents/profile-writer", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role, experience_years: expYears, pitch, modality }),
        }).then((x) => (x.ok ? x.json() : null)).catch(() => null);
        if (r?.output) enriched = r.output;
      }

      const headline = parsed?.experiences?.[0]?.title || enriched?.headline || role || "";
      const about = parsed?.summary || enriched?.about || pitch || "";
      const skills = (Array.isArray(parsed?.skills) && parsed.skills.length)
        ? parsed.skills
        : (Array.isArray(enriched?.skills) ? enriched!.skills! : []);

      setGen({
        headline,
        about,
        skills,
        experience_years: expYears,
        city: parsed?.city || null,
        phone: parsed?.phone || null,
        country_code: parsed?.country_code || null,
        languages: parsed?.languages || [],
        education: parsed?.education || [],
        experiences: parsed?.experiences || [],
      });

      await new Promise((resolve) => setTimeout(resolve, 2400));
      clearInterval(interval);
      setStep("review");
    } catch (e) {
      clearInterval(interval);
      setError(t("error"));
      setStep("intake");
    }
  }

  async function save(destination: "/empleos" | "/cuenta") {
    setSaving(true);
    setError("");
    const body = {
      headline: gen.headline || null,
      about: gen.about || null,
      city: gen.city,
      phone: gen.phone,
      country_code: gen.country_code,
      experience_years: gen.experience_years,
      languages: gen.languages,
      education: gen.education,
      pref_modality: modality ? [modality] : [],
      skills: gen.skills,
    };

    try {
      const res = await fetch("/api/board/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      }).then((x) => (x.ok ? x.json() : null)).catch(() => null);

      if (!res) {
        setError(t("error"));
        setSaving(false);
        return;
      }
      setPct(res.completeness?.pct ?? 85);
      setStep("done");
      
      setTimeout(() => {
        router.push(destination);
      }, 1500);
    } catch (e) {
      setError(t("error"));
    } finally {
      setSaving(false);
    }
  }

  const addSkill = (v: string) => {
    const s = v.trim();
    if (!s) return;
    setGen((g) => ({
      ...g,
      skills: g.skills.includes(s) ? g.skills : [...g.skills, s]
    }));
    setSkillDraft("");
  };

  const suggestedSkills = ["Figma", "UX research", "Prototyping", "Design systems", "React", "Node.js", "SQL"]
    .filter((x) => !gen.skills.includes(x))
    .slice(0, 6);

  const chipStyle = (sel: boolean): CSSProperties => ({
    fontFamily: "'Hanken Grotesk',sans-serif",
    fontWeight: sel ? 700 : 600,
    fontSize: 13,
    borderRadius: 999,
    padding: "8px 13px",
    border: `1.5px solid ${sel ? "#1A1A17" : "#E7E1D4"}`,
    background: sel ? "#DCEFE4" : "#FCFAF6",
    color: sel ? "#0E5C4A" : "#54504A",
    cursor: "pointer",
    outline: "none",
    transition: "background .12s ease, color .12s ease, border-color .12s ease"
  });

  if (loading) {
    return (
      <BoardRoot center>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "200px" }}>
          <span style={{ fontFamily: MONO, fontSize: 13, color: "var(--soft)" }}>Cargando asistente...</span>
        </div>
      </BoardRoot>
    );
  }

  return (
    <BoardRoot center>
      <style>{`
        .jb-fade { animation: jb-fade .2s ease both; }
        @keyframes jb-fade { from { opacity: 0; } to { opacity: 1; } }
        
        .jb-pop { animation: jb-pop .22s ease both; }
        @keyframes jb-pop { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        
        @keyframes jb-dots { 0%,80%,100% { opacity: .25; } 40% { opacity: 1; } }
        .jb-d1 { animation: jb-dots 1.2s infinite; }
        .jb-d2 { animation: jb-dots 1.2s .2s infinite; }
        .jb-d3 { animation: jb-dots 1.2s .4s infinite; }
        
        @keyframes jb-bar { from { width: 6%; } to { width: 100%; } }
        .jb-bar { animation: jb-bar 2.2s cubic-bezier(.4,0,.2,1) forwards; }
      `}</style>
      <div style={{ width: "100%", maxWidth: 414 }}>
        {/* header */}
        <header style={{ padding: "8px 0 12px", borderBottom: "1px solid var(--line)", background: "rgba(244,240,232,.9)", display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => { if (step === "review") setStep("intake"); else router.push("/cuenta"); }} className="jb-tap" style={{ width: 34, height: 34, borderRadius: 10, background: "var(--surface)", border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", outline: "none" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ margin: "auto", display: "block" }}><path d="M15 6l-6 6 6 6" stroke="var(--ink)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: .5, textTransform: "uppercase", color: "var(--brand)" }}>{t("eyebrow")}</div>
            <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 15, letterSpacing: "-.3px" }}>{t("title")}</div>
          </div>
        </header>

        {step === "done" && pct != null ? (
          <div className="jb-fade" style={{ padding: "40px 16px", textAlign: "center" }}>
            <div style={{ width: 74, height: 74, borderRadius: 22, background: "var(--brandSoft)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none"><path d="M6 12.5l3.5 3.5 8-9" stroke="#0E5C4A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <h2 style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 25, letterSpacing: "-.9px", margin: "0 0 8px" }}>¡Perfil guardado!</h2>
            <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--soft)", margin: "0 auto 22px", maxWidth: 290 }}>Redireccionando...</p>
          </div>
        ) : step === "generating" ? (
          <div className="jb-fade" style={{ padding: "40px 22px", textAlign: "center" }}>
            <span style={{ width: 64, height: 64, borderRadius: 19, background: "var(--ink)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2Z" stroke="#C6F24E" strokeWidth="1.7" strokeLinejoin="round"/></svg>
            </span>
            <div style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 20, letterSpacing: "-.5px", marginBottom: 6 }}>
              {t("generating")}<span className="jb-d1">.</span><span className="jb-d2">.</span><span className="jb-d3">.</span>
            </div>
            <p style={{ fontSize: 13.5, color: "var(--soft)", margin: "0 auto 20px", maxWidth: 260 }}>{genSteps[genStepIdx] || genSteps[0]}</p>
            <div style={{ maxWidth: 240, margin: "0 auto", height: 6, borderRadius: 999, background: "#E0DACC", overflow: "hidden" }}>
              <div className="jb-bar" style={{ height: "100%", background: "var(--brand)" }}></div>
            </div>
          </div>
        ) : step === "review" && gen ? (
          <div className="jb-fade" style={{ padding: "16px 0 104px" }}>
            <div className="jb-pop" style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--limeSoft)", border: "1px solid #D6E89A", borderRadius: 12, padding: "12px 13px", marginBottom: 16 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="11" fill="#C6F24E"/><path d="M7 12.5l3 3 6-7" stroke="#1A1A17" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <div>
                <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 14, color: "#2C3907" }}>{t("doneTitle")}</div>
                <div style={{ fontSize: 12, color: "#46540F", marginTop: 1 }}>{t("doneDesc")}</div>
              </div>
            </div>

            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 16, marginBottom: 12, display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={label}>{t("headline")}</label>
                <input value={gen.headline} onChange={(e) => setGen({ ...gen, headline: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={label}>{t("aboutAi")}</label>
                <textarea value={gen.about} onChange={(e) => setGen({ ...gen, about: e.target.value })} rows={4} style={{ ...inputStyle, resize: "vertical" }} />
              </div>
            </div>

            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 16, marginBottom: 12 }}>
              <label style={label}>{t("skills")}</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                {gen.skills.map((s) => (
                  <span key={s} onClick={() => setGen(g => ({ ...g, skills: g.skills.filter(x => x !== s) }))} className="jb-tap" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: MONO, fontSize: 11, fontWeight: 700, color: "#54504A", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 8, padding: "5px 8px 5px 10px", cursor: "pointer" }}>
                    {s}
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="var(--soft)" stroke-width="2.6" stroke-linecap="round" /></svg>
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", gap: 7, marginTop: 8 }}>
                <input value={skillDraft} onChange={(e) => setSkillDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(skillDraft); } }} placeholder={t("addSkillPlaceholder")} style={{ ...inputStyle, flex: 1 }} />
                <HardButton variant="brand" onClick={() => addSkill(skillDraft)} style={{ fontSize: 13, padding: "0 15px" }}>{t("addSkill")}</HardButton>
              </div>
              {suggestedSkills.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <MonoLabel style={{ fontSize: 9, marginBottom: 6 }}>{t("suggested")}</MonoLabel>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {suggestedSkills.map((sg) => (
                      <span key={sg} onClick={() => addSkill(sg)} className="jb-tap" style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: "var(--brand)", background: "var(--brandSoft)", border: "1px dashed #BEE0CE", borderRadius: 8, padding: "5px 9px", cursor: "pointer" }}>
                        + {sg}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm parsed CV data (phone, city, experience, education, languages) */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 16, marginBottom: 12, display: "flex", flexDirection: "column", gap: 14 }}>
              <MonoLabel style={{ fontSize: 11, color: "var(--brand)", borderBottom: "1px solid var(--line)", paddingBottom: 6 }}>Confirmar datos de contacto e historial</MonoLabel>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={label}>{t("phone")}</label>
                  <input value={gen.phone || ""} onChange={(e) => setGen({ ...gen, phone: e.target.value })} placeholder="+58…" style={inputStyle} />
                </div>
                <div>
                  <label style={label}>{t("city")}</label>
                  <CityAutocomplete value={gen.city || ""} onChange={(city) => setGen({ ...gen, city })} placeholder={t("city")} />
                </div>
              </div>

              {gen.experiences && gen.experiences.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <label style={label}>{t("experience")} <AiTag>{t("fromCV")}</AiTag></label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {gen.experiences.map((e: any, i: number) => (
                      <div key={i} style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 12, padding: "10px 12px" }}>
                        <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 13.5, letterSpacing: "-.2px" }}>{e.title}</div>
                        <div style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--soft)", marginTop: 2 }}>
                          {[e.company, [e.start_date, e.is_current ? "actual" : e.end_date].filter(Boolean).join(" — ")].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {gen.education && gen.education.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <label style={label}>{t("education")} <AiTag>{t("fromCV")}</AiTag></label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {gen.education.map((e: any, i: number) => (
                      <div key={i} style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 12, padding: "10px 12px" }}>
                        <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 13.5, letterSpacing: "-.2px" }}>{e.degree}</div>
                        <div style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--soft)", marginTop: 2 }}>
                          {[e.institution, [e.start_year, e.end_year].filter(Boolean).join(" — ")].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {gen.languages && gen.languages.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <label style={label}>{t("languages")} <AiTag>{t("fromCV")}</AiTag></label>
                  <div style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 12, padding: "4px 12px" }}>
                    {gen.languages.map((l: any, i: number) => {
                      const dots = l.level?.toLowerCase().includes("nat") || l.level?.toLowerCase().includes("c2") ? 5 : l.level?.toLowerCase().includes("avan") || l.level?.toLowerCase().includes("c1") || l.level?.toLowerCase().includes("b2") ? 4 : 2;
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: i < gen.languages.length - 1 ? "1px solid var(--line)" : "none" }}>
                          <span style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 13, flex: 1 }}>{l.language}</span>
                          <div style={{ display: "flex", gap: 4 }}>
                            {Array.from({ length: 5 }).map((_, dIdx) => (
                              <span key={dIdx} style={{ width: 7, height: 7, borderRadius: "50%", background: dIdx < dots ? "#0E5C4A" : "#E0DACC" }}></span>
                            ))}
                          </div>
                          <span style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--soft)", width: 70, textAlign: "right" }}>{l.level || "Básico"}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div style={{ background: "var(--brandSoft)", border: "1px solid #BEE0CE", borderRadius: 14, padding: "14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ position: "relative", width: 44, height: 44, flexShrink: 0 }}>
                <svg width="44" height="44" viewBox="0 0 44 44">
                  <circle cx="22" cy="22" r="18" fill="none" stroke="#BEE0CE" strokeWidth="5"/>
                  <circle cx="22" cy="22" r="18" fill="none" stroke="#0E5C4A" strokeWidth="5" strokeLinecap="round" strokeDasharray="113" strokeDashoffset="17" transform="rotate(-90 22 22)"/>
                </svg>
                <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ARCHIVO, fontWeight: 900, fontSize: 12, color: "var(--brand)" }}>85%</span>
              </div>
              <div>
                <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 14, color: "#0A4638" }}>{t("complete", { pct: 85 })}</div>
                <div style={{ fontSize: 12.5, color: "#2C5247", lineHeight: 1.4 }}>{t("disclaimer")}</div>
              </div>
            </div>

            {error && <p style={{ fontSize: 13, color: "#BD4332", margin: "10px 0" }}>{error}</p>}

            {/* Sticky Actions */}
            <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, background: "rgba(252,250,246,.96)", backdropFilter: "blur(8px)", borderTop: "1px solid var(--line)", padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: 9, zIndex: 30 }}>
              <div style={{ maxWidth: 414, margin: "0 auto", width: "100%" }}>
                <button onClick={() => save("/empleos")} disabled={saving} className="jb-hard" style={{ width: "100%", fontFamily: ARCHIVO, fontWeight: 800, fontSize: 15, color: "#fff", background: "var(--accent)", border: "2px solid var(--ink)", borderRadius: 11, padding: 14, boxShadow: "3px 3px 0 var(--ink)", cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {saving ? "Guardando…" : t("findJobs")}
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                <button onClick={() => save("/cuenta")} disabled={saving} className="jb-tap" style={{ width: "100%", fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 700, fontSize: 13.5, color: "var(--soft)", background: "transparent", border: "none", padding: "8px 6px", marginTop: 4, cursor: saving ? "not-allowed" : "pointer" }}>
                  {t("viewProfile")}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Intake step */
          <div className="jb-fade" style={{ padding: "18px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={{ width: 40, height: 40, borderRadius: 12, background: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2Z" stroke="#C6F24E" strokeWidth="1.7" strokeLinejoin="round"/></svg>
              </span>
              <p style={{ fontSize: 14, lineHeight: 1.5, color: "#3A3833", margin: 0 }}>{existingCv ? t("introUpdate") : t("intro")}</p>
            </div>

            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={label}>{t("role")}</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 8 }}>
                  {roleChips.map((c) => (
                    <button key={c} type="button" onClick={() => setRole(c)} style={chipStyle(role === c)}>
                      {c}
                    </button>
                  ))}
                </div>
                <input value={role} onChange={(e) => setRole(e.target.value)} placeholder={t("rolePlaceholder")} style={inputStyle} />
              </div>

              <div>
                <label style={label}>{t("experience")}</label>
                <div style={{ display: "flex", gap: 7 }}>
                  {expChips.map((c) => (
                    <button key={c} type="button" onClick={() => setExp(c)} style={chipStyle(exp === c)}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={label}>{t("modality")}</label>
                <div style={{ display: "flex", gap: 7 }}>
                  {modChips.map((c) => (
                    <button key={c} type="button" onClick={() => setModality(c)} style={chipStyle(modality === c)}>
                      {tMod(c)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={label}>
                  {t("pitch")} <span style={{ textTransform: "none", color: "#B0AAA0" }}>{t("pitchOptional")}</span>
                </label>
                <textarea className="jb-in" value={pitch} onChange={(e) => setPitch(e.target.value)} placeholder={t("pitchPlaceholder")} style={{ ...inputStyle, minHeight: 66, resize: "none" }}></textarea>
              </div>
            </div>

            {/* CV Upload section */}
            <input ref={fileRef} type="file" accept="application/pdf,text/plain" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} style={{ display: "none" }} />
            <div
              onClick={() => fileRef.current?.click()}
              style={{ display: "flex", alignItems: "center", gap: 9, margin: "16px 0", padding: "12px 14px", background: "var(--limeSoft)", border: "1px solid #D6E89A", borderRadius: 12, cursor: "pointer" }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                <path d="M12 16V4M7 9l5-5 5 5" stroke="#46540F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M5 16v3a1 1 0 001 1h12a1 1 0 001-1v-3" stroke="#46540F" strokeWidth="2"/>
              </svg>
              <span style={{ fontSize: 12.5, color: "#46540F", lineHeight: 1.4 }}>
                {cvName ? (
                  <><b>{t("cvUploaded")}:</b> {cvName}</>
                ) : existingCv ? (
                  <><b>{t("cvQuestionUpdate")}</b></>
                ) : (
                  <><b>{t("cvQuestion")}</b></>
                )}
              </span>
            </div>

            <button
              onClick={generate}
              disabled={!role.trim() && !cv}
              className="jb-hard"
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 9,
                fontFamily: ARCHIVO,
                fontWeight: 800,
                fontSize: 15,
                color: "#fff",
                background: (role.trim() || cv) ? "var(--accent)" : "#C7B9B0",
                border: "2px solid var(--ink)",
                borderRadius: 11,
                padding: 14,
                boxShadow: "3px 3px 0 var(--ink)",
                cursor: (role.trim() || cv) ? "pointer" : "not-allowed"
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2Z" stroke="#fff" stroke-width="1.7" stroke-linejoin="round"/></svg>
              {t("generate")}
            </button>
            <div style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--soft)", textAlign: "center", marginTop: 10 }}>
              {t("disclaimer")}
            </div>
          </div>
        )}
      </div>
    </BoardRoot>
  );
}
