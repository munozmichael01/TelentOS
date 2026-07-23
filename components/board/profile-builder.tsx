"use client";

import { useState, useRef, useEffect, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { CityAutocomplete } from "@/components/board/city-autocomplete";
import { ARCHIVO, MONO, BoardRoot, AiTag, inputStyle } from "@/components/board/ui";

type Modality = "remoto" | "hibrido" | "presencial";
type Step = "intake" | "generating" | "review";
type Tx = ReturnType<typeof useTranslations>;

const label: CSSProperties = { fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: .5, color: "var(--soft)", display: "flex", alignItems: "center", gap: 7, marginBottom: 8 };

// Taxonomía local de job titles + skills por categoría (portada del mockup support.js).
// El selector de cargo es buscable y siembra las skills sugeridas de la categoría al elegir.
type CatKey = "design" | "product" | "eng" | "data" | "marketing" | "sales" | "ops";
const JOB_TITLES: { t: string; cat: CatKey }[] = [
  { t: "Product Designer", cat: "design" }, { t: "UX/UI Designer", cat: "design" }, { t: "UX Researcher", cat: "design" }, { t: "Diseñador Gráfico", cat: "design" }, { t: "Motion Designer", cat: "design" },
  { t: "Product Manager", cat: "product" }, { t: "Program Manager", cat: "product" }, { t: "Product Owner", cat: "product" },
  { t: "Frontend Engineer", cat: "eng" }, { t: "Backend Engineer", cat: "eng" }, { t: "Full Stack Engineer", cat: "eng" }, { t: "Mobile Engineer", cat: "eng" }, { t: "DevOps Engineer", cat: "eng" }, { t: "QA Engineer", cat: "eng" },
  { t: "Data Analyst", cat: "data" }, { t: "Data Scientist", cat: "data" }, { t: "Data Engineer", cat: "data" }, { t: "BI Analyst", cat: "data" },
  { t: "Growth Marketer", cat: "marketing" }, { t: "Content Manager", cat: "marketing" }, { t: "SEO Specialist", cat: "marketing" }, { t: "Community Manager", cat: "marketing" },
  { t: "Account Executive", cat: "sales" }, { t: "SDR", cat: "sales" }, { t: "Customer Success Manager", cat: "sales" },
  { t: "Operations Manager", cat: "ops" }, { t: "People / HR", cat: "ops" }, { t: "Project Manager", cat: "ops" },
];
const SKILLS_BY_CAT: Record<CatKey, string[]> = {
  design: ["Figma", "Design systems", "UX research", "Prototyping", "UI"],
  product: ["Discovery", "Roadmap", "Analítica", "Agile", "Stakeholders"],
  eng: ["JavaScript", "React", "Node.js", "SQL", "Git"],
  data: ["SQL", "Python", "Power BI", "Estadística", "ETL"],
  marketing: ["SEO", "Copywriting", "Ads", "Analítica", "Contenido"],
  sales: ["CRM", "Prospección", "Negociación", "Pipeline", "Closing"],
  ops: ["Procesos", "Excel", "KPIs", "Gestión", "Mejora continua"],
};

// ── Iconos SVG de línea del DS (nada de emojis) ──────────────────────────────
function Sparkle({ size = 16, stroke = "#0E5C4A" }: { size?: number; stroke?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2Z" stroke={stroke} strokeWidth="1.7" strokeLinejoin="round" /></svg>;
}

// Anillo de completitud (pct) reutilizable — mockup: r=18 (44) / r=20 (48).
function CompletenessRing({ pct, size = 44 }: { pct: number; size?: number }) {
  const stroke = 5;
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  const off = Math.round(c * (1 - pct / 100));
  const fs = size >= 48 ? 12 : 11;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#BEE0CE" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#0E5C4A" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={Math.round(c)} strokeDashoffset={off} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ARCHIVO, fontWeight: 900, fontSize: fs, color: "var(--brand)" }}>{pct}%</span>
    </div>
  );
}

// Selector de cargo buscable (patrón CityAutocomplete) sobre la taxonomía de job titles.
// Al elegir devuelve el cargo y su categoría (para sembrar skills).
function RoleAutocomplete({ value, onSelect, t }: { value: string; onSelect: (title: string, cat: CatKey) => void; t: Tx }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDoc(e: MouseEvent) { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  const results = JOB_TITLES.filter((j) => j.t.toLowerCase().includes(query.toLowerCase())).slice(0, 8);
  const noResults = results.length === 0;
  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <input
        value={open ? query : value}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => { setQuery(""); setOpen(true); }}
        placeholder={t("roleSearchPlaceholder")}
        style={inputStyle}
      />
      {open && (
        <div className="jb-pop" style={{ position: "absolute", top: "calc(100% + 5px)", left: 0, right: 0, zIndex: 30, background: "var(--surface)", border: "1.5px solid var(--ink)", borderRadius: 12, boxShadow: "0 14px 30px -14px rgba(0,0,0,.4)", overflow: "hidden" }}>
          <div style={{ maxHeight: 240, overflowY: "auto" }}>
            {results.map((r) => (
              <div key={r.t} onClick={() => { onSelect(r.t, r.cat); setOpen(false); setQuery(""); }} className="jb-tap" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 13px", cursor: "pointer" }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{r.t}</span>
                <span style={{ fontFamily: MONO, fontSize: 9, textTransform: "uppercase", color: "var(--soft)" }}>{t(`cat.${r.cat}`)}</span>
              </div>
            ))}
            {noResults && <div style={{ padding: "12px 13px", fontSize: 13, color: "var(--soft)" }}>{t("roleNoResults")}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

const proposalSkillChip: CSSProperties = { fontFamily: MONO, fontSize: 11, fontWeight: 700, color: "var(--brand)", background: "var(--brandSoft)", border: "1px solid #BEE0CE", borderRadius: 8, padding: "5px 9px" };

export function ProfileBuilder({ locale }: { locale: string }) {
  const t = useTranslations("Board.builder");
  const tMod = useTranslations("Board.modality");
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("intake");
  const [loading, setLoading] = useState(true);

  // ── Intake ──────────────────────────────────────────────────────────────
  const [role, setRole] = useState("");
  const [cat, setCat] = useState<CatKey | null>(null);
  const [exp, setExp] = useState("");
  const [modality, setModality] = useState<Modality | null>(null);
  const [pitch, setPitch] = useState("");
  const [cv, setCv] = useState<File | null>(null);
  const [cvName, setCvName] = useState("");
  const [cityIn, setCityIn] = useState("");
  const [countryIn, setCountryIn] = useState(locale === "pt" ? "BR" : locale === "en" ? "US" : "VE");
  const [lastTitle, setLastTitle] = useState("");
  const [lastCompany, setLastCompany] = useState("");
  // Skills confirmadas en el intake (sembradas por categoría del rol; el candidato toca para incluir/quitar y puede añadir).
  const [intakeSkills, setIntakeSkills] = useState<string[]>([]);
  const [skillDraft, setSkillDraft] = useState("");

  const [existingCv, setExistingCv] = useState(false);

  // ── Propuesta (review) ──────────────────────────────────────────────────
  const [gen, setGen] = useState<{
    headline: string; about: string; skills: string[]; experience_years: number;
    city: string | null; phone: string | null; country_code: string | null;
    languages: any[]; education: any[]; experiences?: any[];
  }>({ headline: "", about: "", skills: [], experience_years: 0, city: null, phone: null, country_code: null, languages: [], education: [], experiences: [] });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [genStepIdx, setGenStepIdx] = useState(0);

  const expChips = ["Junior", "1–3 años", "3–5 años", "5+ años"];
  const modChips: Modality[] = ["remoto", "hibrido", "presencial"];

  const canGenerate = !!cv || (!!role.trim() && !!exp && !!cityIn.trim());

  // Chips de skills del intake: skills de la categoría + extras añadidas; marca ✓/+ y estilo on/off.
  const skillCatalog = Array.from(new Set([...(cat ? SKILLS_BY_CAT[cat] : []), ...intakeSkills]));
  const toggleSkill = (s: string) => setIntakeSkills((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));
  const addIntakeSkill = (v: string) => {
    const s = v.trim();
    if (!s) { return; }
    setIntakeSkills((p) => (p.includes(s) ? p : [...p, s]));
    setSkillDraft("");
  };
  const selectRole = (title: string, category: CatKey) => {
    setRole(title);
    setCat(category);
    setIntakeSkills(SKILLS_BY_CAT[category].slice());
  };

  // Completitud canónica (6 criterios como Mi cuenta): about, experiencia, educación, idiomas, skills≥3, portafolio.
  const reviewDone = [
    !!gen.about,
    (gen.experiences?.length ?? 0) > 0,
    gen.education.length > 0,
    gen.languages.length > 0,
    gen.skills.length >= 3,
    false, // portafolio — no se captura en el express todavía
  ].filter(Boolean).length;
  const reviewPct = Math.round((reviewDone / 6) * 100);

  const genSteps = [t("generatingAnalys"), t("generatingWrite"), t("generatingSkills"), t("generatingFit")];

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/board/profile");
        if (res.ok) {
          const data = await res.json();
          if (data.completeness?.hasCv) setExistingCv(true);
          const hasProfile = data.profile && (data.profile.headline || data.profile.about);
          const hasSourced = data.sourced && (data.sourced.experiences?.length > 0 || data.sourced.first_name);
          if (hasProfile || hasSourced) {
            const headline = data.profile?.headline || data.sourced?.experiences?.[0]?.title || "";
            const about = data.profile?.about || data.sourced?.summary || "";
            const skillsList = data.profile ? (data.skills || []) : (data.sourced?.skills || []);
            const expYears = data.profile?.experience_years ?? data.sourced?.experience_years ?? 0;
            setGen({
              headline, about, skills: skillsList, experience_years: expYears,
              city: data.profile?.city ?? data.sourced?.city ?? null,
              phone: data.profile?.phone ?? data.sourced?.phone ?? null,
              country_code: data.profile?.country_code ?? data.sourced?.country_code ?? null,
              languages: data.profile?.languages ?? data.sourced?.languages ?? [],
              education: data.profile?.education ?? data.sourced?.education ?? [],
              experiences: data.sourced?.experiences ?? [],
            });
            if (data.profile?.pref_modality?.length > 0) setModality(data.profile.pref_modality[0]);
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

  function handleFile(file: File | null) {
    if (!file) return;
    setCv(file);
    setCvName(file.name);
    // Subir CV = autocompletar: arranca la generación (fase parsing) inmediatamente.
    generate(file);
  }

  async function generate(fileArg?: File) {
    const useCv = fileArg ?? cv;
    setError("");
    setStep("generating");
    setGenStepIdx(0);

    const stepsCount = 4;
    const interval = setInterval(() => setGenStepIdx((prev) => (prev < stepsCount - 1 ? prev + 1 : prev)), 550);

    let parsed: any = null;
    try {
      if (useCv) {
        const fd = new FormData();
        fd.append("cv", useCv);
        const r = await fetch("/api/careers/parse-cv", { method: "POST", body: fd })
          .then((x) => (x.ok ? x.json() : null)).catch(() => null);
        if (r?.profile) parsed = r.profile;
      }

      const expYears = Number(exp.replace(/[^0-9]/g, "")) || parsed?.experience_years || 0;

      // Arranque en frío (sin CV): el agente PROPONE titular/"Sobre mí"/skills desde rol+exp+pitch.
      let enriched: { headline?: string; about?: string; skills?: string[] } | null = null;
      if (!parsed && role.trim()) {
        const r = await fetch("/api/agents/profile-writer", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role, experience_years: expYears, pitch, modality }),
        }).then((x) => (x.ok ? x.json() : null)).catch(() => null);
        if (r?.output) enriched = r.output;
      }

      const headline = parsed?.experiences?.[0]?.title || enriched?.headline || lastTitle || role || "";
      const about = parsed?.summary || enriched?.about || pitch || "";
      const baseSkills = (Array.isArray(parsed?.skills) && parsed.skills.length)
        ? parsed.skills
        : (Array.isArray(enriched?.skills) ? enriched!.skills! : []);
      const skills = Array.from(new Set([...baseSkills, ...intakeSkills]));
      const manualExp = lastTitle.trim() ? [{ title: lastTitle.trim(), company: lastCompany.trim() || null, is_current: true }] : [];

      setGen({
        headline, about, skills, experience_years: expYears,
        city: parsed?.city || cityIn.trim() || null,
        phone: parsed?.phone || null,
        country_code: parsed?.country_code || countryIn || null,
        languages: parsed?.languages || [],
        education: parsed?.education || [],
        experiences: (parsed?.experiences && parsed.experiences.length) ? parsed.experiences : manualExp,
      });

      await new Promise((resolve) => setTimeout(resolve, useCv ? 2000 : 2400));
      clearInterval(interval);
      setStep("review");
    } catch (e) {
      clearInterval(interval);
      setError(t("error"));
      setStep("intake");
    }
  }

  // Guardar la propuesta confirmada (el usuario confirma → se persiste) y navegar. Los agentes
  // no escriben en DB por su cuenta: la persistencia ocurre aquí, al pulsar el CTA.
  async function save(destination: "/empleos" | "/cuenta") {
    setSaving(true);
    setError("");
    const body = {
      headline: gen.headline || null, about: gen.about || null,
      city: gen.city, phone: gen.phone, country_code: gen.country_code,
      experience_years: gen.experience_years, languages: gen.languages, education: gen.education,
      experiences: gen.experiences ?? [],
      pref_modality: modality ? [modality] : [],
      pref_locations: gen.city ? [gen.city] : [],
      skills: gen.skills,
    };
    try {
      const res = await fetch("/api/board/profile", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      }).then((x) => (x.ok ? x.json() : null)).catch(() => null);
      if (!res) { setError(t("error")); setSaving(false); return; }
      router.push(destination);
    } catch (e) {
      setError(t("error"));
      setSaving(false);
    }
  }

  // Experiencia reciente para el preview/propuesta (del CV o capturada a mano en el intake).
  const recent = {
    title: lastTitle || gen.experiences?.[0]?.title || "",
    company: lastCompany || gen.experiences?.[0]?.company || "",
  };
  const hasRecent = !!recent.title;
  const recentLogo = (recent.company || recent.title || "?").slice(0, 2).toUpperCase();
  const previewSkills = step === "intake" ? intakeSkills : gen.skills;
  const previewHeadline = gen.headline || role || t("previewRole");
  const modalityLabel = modality ? tMod(modality) : "";
  const subline = [modalityLabel, exp, gen.city || cityIn].filter(Boolean).join(" · ");

  if (loading) {
    return (
      <BoardRoot>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
          <span style={{ fontFamily: MONO, fontSize: 13, color: "var(--soft)" }}>{t("loading")}</span>
        </div>
      </BoardRoot>
    );
  }

  const phased = step !== "intake";

  return (
    <BoardRoot>
      <style>{`
        .jb-fade { animation: jb-fade .2s ease both; }
        @keyframes jb-fade { from { opacity: 0; } to { opacity: 1; } }
        .jb-pop { animation: jb-pop .22s ease both; }
        @keyframes jb-pop { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        @keyframes jb-dots { 0%,80%,100% { opacity: .25; } 40% { opacity: 1; } }
        .jb-d1 { animation: jb-dots 1.2s infinite; } .jb-d2 { animation: jb-dots 1.2s .2s infinite; } .jb-d3 { animation: jb-dots 1.2s .4s infinite; }
        @keyframes jb-bar { from { width: 6%; } to { width: 100%; } }
        .jb-bar { animation: jb-bar 2.2s cubic-bezier(.4,0,.2,1) forwards; }
        @keyframes jb-scan { 0% { top: 8%; } 50% { top: 84%; } 100% { top: 8%; } }
        .jb-scan { animation: jb-scan 1.4s ease-in-out infinite; }
      `}</style>

      <div className="jb-pib-page">
        {/* Header full-width (desktop 64px con logo de marca + nota; mobile compacto) */}
        <header className="jb-pib-header">
          <button onClick={() => { if (step === "review") setStep("intake"); else router.push("/cuenta"); }} className="jb-pib-back jb-hard">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="var(--ink)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <span className="jb-pib-logo">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M4 7l8 4 8-4M4 7l8-4 8 4M4 7v10l8 4 8-4V7M12 11v10" stroke="#C6F24E" strokeWidth="2" strokeLinejoin="round" /></svg>
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: .5, textTransform: "uppercase", color: "var(--brand)" }}>{t("eyebrow")}</div>
            <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 15, letterSpacing: "-.3px" }}>{t("title")}</div>
          </div>
          <span className="jb-pib-hdr-note">{t("disclaimer")}</span>
        </header>

        <div className="jb-pib-body">
          {/* LEFT — intake (siempre visible en desktop; en mobile solo en fase intake) */}
          <div className={"jb-pib-intake" + (phased ? " jb-pib-intake--phased" : "")}>
            <IntakeForm
              t={t} tMod={tMod}
              role={role} onSelectRole={selectRole}
              exp={exp} setExp={setExp} expChips={expChips}
              modality={modality} setModality={setModality} modChips={modChips}
              cityIn={cityIn} setCityIn={setCityIn} countryIn={countryIn} setCountryIn={setCountryIn}
              lastTitle={lastTitle} setLastTitle={setLastTitle} lastCompany={lastCompany} setLastCompany={setLastCompany}
              skillCatalog={skillCatalog} intakeSkills={intakeSkills} toggleSkill={toggleSkill}
              skillDraft={skillDraft} setSkillDraft={setSkillDraft} addIntakeSkill={addIntakeSkill}
              pitch={pitch} setPitch={setPitch}
              cvName={cvName} existingCv={existingCv} onPickCv={() => fileRef.current?.click()}
              canGenerate={canGenerate} onGenerate={() => generate()}
            />
            <input ref={fileRef} type="file" accept="application/pdf,text/plain" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} style={{ display: "none" }} />
          </div>

          {/* RIGHT — panel de tinta (solo desktop): cambia por fase */}
          <aside className="jb-pib-panel">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <span style={{ fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: .5, color: "var(--lime)", display: "flex", alignItems: "center", gap: 7 }}>
                <Sparkle size={13} stroke="#C6F24E" />{step === "review" ? t("previewDone") : t("previewLive")}
              </span>
              <span style={{ fontFamily: MONO, fontSize: 11, color: "#8C877E" }}>
                {step === "review" ? t("previewMetaDone", { pct: reviewPct }) : t("previewMetaLive")}
              </span>
            </div>

            {step === "generating" ? (
              <GeneratingPanel t={t} cv={!!cv} cvName={cvName} genStep={genSteps[genStepIdx] || genSteps[0]} tone="ink" />
            ) : (
              <div className="jb-fade">
                {/* Tarjeta borrador / propuesta (blanca sobre tinta) */}
                <div style={{ background: "var(--surface)", borderRadius: 18, padding: 28 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <span style={{ width: 60, height: 60, borderRadius: 16, background: "var(--brandSoft)", color: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ARCHIVO, fontWeight: 900, fontSize: 20, flexShrink: 0 }}>{t("previewYou")}</span>
                    <div>
                      <h2 style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 22, letterSpacing: "-.6px", margin: 0 }}>{previewHeadline}</h2>
                      {subline && <div style={{ fontSize: 14, color: "var(--soft)" }}>{subline}</div>}
                    </div>
                  </div>

                  <div style={{ marginTop: 20 }}>
                    <div style={{ fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: .5, color: "var(--soft)", marginBottom: 7, display: "flex", alignItems: "center", gap: 6 }}>
                      {t("about")} {step === "review" && <AiTag>{t("aiWritten")}</AiTag>}
                    </div>
                    {step === "review" && gen.about
                      ? <p style={{ fontSize: 14, lineHeight: 1.6, color: "#3A3833", margin: 0 }}>{gen.about}</p>
                      : (
                        <div style={{ display: "flex", alignItems: "center", gap: 9, background: "var(--bg)", border: "1px dashed #CFC7B6", borderRadius: 11, padding: "12px 13px" }}>
                          <Sparkle size={16} stroke="#79746B" />
                          <span style={{ fontSize: 12.5, color: "var(--soft)", lineHeight: 1.45 }}>{t("previewAboutNotice")}</span>
                        </div>
                      )}
                  </div>

                  {hasRecent && (
                    <div style={{ marginTop: 18 }}>
                      <div style={{ fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: .5, color: "var(--soft)", marginBottom: 8 }}>{t("recentExpSection")}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                        <span style={{ width: 34, height: 34, borderRadius: 9, background: "var(--brandSoft)", color: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ARCHIVO, fontWeight: 900, fontSize: 12, flexShrink: 0 }}>{recentLogo}</span>
                        <div>
                          <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 14 }}>{recent.title}</div>
                          {recent.company && <div style={{ fontFamily: MONO, fontSize: 10, color: "var(--soft)" }}>{recent.company}</div>}
                        </div>
                      </div>
                    </div>
                  )}

                  {previewSkills.length > 0 && (
                    <div style={{ marginTop: 18 }}>
                      <div style={{ fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: .5, color: "var(--soft)", marginBottom: 8 }}>{t("skillsSection")}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                        {previewSkills.slice(0, 12).map((s) => <span key={s} style={proposalSkillChip}>{s}</span>)}
                      </div>
                    </div>
                  )}
                </div>

                {step === "review" && (
                  <>
                    <ConfirmContactCard gen={gen} setGen={setGen} t={t} />
                    <div className="jb-pop" style={{ marginTop: 16, background: "var(--brandSoft)", border: "1px solid #BEE0CE", borderRadius: 14, padding: 15, display: "flex", alignItems: "center", gap: 14 }}>
                      <CompletenessRing pct={reviewPct} size={48} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 15, color: "#0A4638" }}>{t("complete", { pct: reviewPct })}</div>
                        <div style={{ fontSize: 13, color: "#2C5247", lineHeight: 1.4 }}>{t("completeMissing")}</div>
                      </div>
                    </div>
                    {error && <p style={{ fontSize: 13, color: "#F1543F", margin: "12px 0 0" }}>{error}</p>}
                    <div className="jb-pop" style={{ marginTop: 18, display: "flex", gap: 12 }}>
                      {/* Voz de agente: lima PLANO (sin borde/sombra) → Board */}
                      <button onClick={() => save("/empleos")} disabled={saving} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: ARCHIVO, fontWeight: 800, fontSize: 15, color: "var(--ink)", background: "var(--lime)", border: "none", borderRadius: 11, padding: 14, cursor: saving ? "not-allowed" : "pointer" }}>
                        {saving ? t("saving") : t("findJobs")}
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#1A1A17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </button>
                      <button onClick={() => save("/cuenta")} disabled={saving} style={{ display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 700, fontSize: 14, color: "#B7B2A8", background: "transparent", border: "none", padding: "14px 18px", cursor: saving ? "not-allowed" : "pointer" }}>
                        {t("viewProfile")}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </aside>

          {/* MOBILE — fases apiladas (solo mobile; en desktop ocultas) */}
          {phased && (
            <div className="jb-pib-mobilephase">
              {step === "generating" ? (
                <GeneratingPanel t={t} cv={!!cv} cvName={cvName} genStep={genSteps[genStepIdx] || genSteps[0]} tone="light" />
              ) : (
                <div className="jb-fade" style={{ padding: "16px 16px 150px" }}>
                  <div className="jb-pop" style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--limeSoft)", border: "1px solid #D6E89A", borderRadius: 12, padding: "12px 13px", marginBottom: 16 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="11" fill="#C6F24E" /><path d="M7 12.5l3 3 6-7" stroke="#1A1A17" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    <div>
                      <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 14, color: "#2C3907" }}>{t("doneTitle")}</div>
                      <div style={{ fontSize: 12, color: "#46540F", marginTop: 1 }}>{t("doneDesc")}</div>
                    </div>
                  </div>

                  {/* Titular propuesto + Sobre mí (solo lectura) */}
                  <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 16, marginBottom: 12 }}>
                    <div style={{ fontFamily: MONO, fontSize: 9.5, textTransform: "uppercase", letterSpacing: .5, color: "var(--brand)", marginBottom: 6 }}>{t("headline")}</div>
                    <div style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 18, letterSpacing: "-.4px" }}>{previewHeadline}</div>
                    {subline && <div style={{ fontSize: 12.5, color: "var(--soft)", marginTop: 2 }}>{subline}</div>}
                    <div style={{ fontFamily: MONO, fontSize: 9.5, textTransform: "uppercase", letterSpacing: .5, color: "var(--brand)", margin: "14px 0 6px", display: "flex", alignItems: "center", gap: 6 }}>
                      {t("about")} <AiTag>{t("aiWritten")}</AiTag>
                    </div>
                    <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "#3A3833", margin: 0 }}>{gen.about}</p>
                  </div>

                  {hasRecent && (
                    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 16, marginBottom: 12 }}>
                      <div style={{ fontFamily: MONO, fontSize: 9.5, textTransform: "uppercase", letterSpacing: .5, color: "var(--brand)", marginBottom: 10 }}>{t("recentExpSection")}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                        <span style={{ width: 34, height: 34, borderRadius: 9, background: "var(--brandSoft)", color: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ARCHIVO, fontWeight: 900, fontSize: 12, flexShrink: 0 }}>{recentLogo}</span>
                        <div>
                          <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 14 }}>{recent.title}</div>
                          {recent.company && <div style={{ fontFamily: MONO, fontSize: 10, color: "var(--soft)" }}>{recent.company}</div>}
                        </div>
                      </div>
                    </div>
                  )}

                  {gen.skills.length > 0 && (
                    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 16, marginBottom: 12 }}>
                      <div style={{ fontFamily: MONO, fontSize: 9.5, textTransform: "uppercase", letterSpacing: .5, color: "var(--brand)", marginBottom: 10 }}>{t("skillsSection")}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {gen.skills.map((s) => <span key={s} style={proposalSkillChip}>{s}</span>)}
                      </div>
                    </div>
                  )}

                  <ConfirmContactCard gen={gen} setGen={setGen} t={t} />

                  <div style={{ background: "var(--brandSoft)", border: "1px solid #BEE0CE", borderRadius: 14, padding: 14, marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
                    <CompletenessRing pct={reviewPct} size={44} />
                    <div>
                      <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 14, color: "#0A4638" }}>{t("complete", { pct: reviewPct })}</div>
                      <div style={{ fontSize: 12, color: "#2C5247", lineHeight: 1.4 }}>{t("completeMissing")}</div>
                    </div>
                  </div>

                  {error && <p style={{ fontSize: 13, color: "#F1543F", margin: "0 0 12px" }}>{error}</p>}

                  {/* Footer sticky (mobile): conversión coral + ghost */}
                  <div className="jb-pib-footer">
                    <div className="jb-pib-footer-inner">
                      <button onClick={() => save("/empleos")} disabled={saving} className="jb-hard" style={{ width: "100%", fontFamily: ARCHIVO, fontWeight: 800, fontSize: 15, color: "#fff", background: "var(--accent)", border: "2px solid var(--ink)", borderRadius: 11, padding: 14, boxShadow: "3px 3px 0 var(--ink)", cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                        {saving ? t("saving") : t("findJobs")}
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </button>
                      <button onClick={() => save("/cuenta")} disabled={saving} style={{ width: "100%", textAlign: "center", fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 700, fontSize: 13.5, color: "var(--soft)", background: "transparent", border: "none", padding: 6, cursor: saving ? "not-allowed" : "pointer" }}>
                        {t("viewProfile")}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </BoardRoot>
  );
}

// ── Fase generando / parsing (compartida ink|light) ──────────────────────────
function GeneratingPanel({ t, cv, cvName, genStep, tone }: { t: Tx; cv: boolean; cvName: string; genStep: string; tone: "ink" | "light" }) {
  const onInk = tone === "ink";
  if (cv) {
    // Parsing del CV: scanner sobre documento + barra de progreso ("sin publicar nada").
    return (
      <div className="jb-fade" style={onInk ? { background: "rgba(255,255,255,.04)", border: "1px solid #38352E", borderRadius: 18, padding: 28 } : { padding: "22px 16px" }}>
        <div style={onInk ? {} : { background: "var(--ink)", borderRadius: 16, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18 }}>
            <div style={{ position: "relative", width: 52, height: 66, borderRadius: 7, background: "#2A2823", border: "1px solid #45413A", overflow: "hidden", flexShrink: 0 }}>
              <div className="jb-scan" style={{ position: "absolute", left: 0, right: 0, height: 2, background: "var(--lime)", boxShadow: "0 0 8px 1px var(--lime)" }} />
              <div style={{ position: "absolute", left: 8, right: 8, top: 11, height: 2, background: "#45413A" }} />
              <div style={{ position: "absolute", left: 8, right: 17, top: 18, height: 2, background: "#45413A" }} />
              <div style={{ position: "absolute", left: 8, right: 12, top: 29, height: 2, background: "#45413A" }} />
            </div>
            <div>
              <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 17, color: "#fff" }}>{t("parsingTitle")}…</div>
              {cvName && <div style={{ fontFamily: MONO, fontSize: 11, color: "#B7B2A8", marginTop: 4 }}>{cvName}</div>}
            </div>
          </div>
          <div style={{ height: 7, borderRadius: 999, background: "#38352E", overflow: "hidden" }}><div className="jb-bar" style={{ height: "100%", background: "var(--lime)" }} /></div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: "#8C877E", marginTop: 11 }}>{t("parsingReassure")}</div>
        </div>
      </div>
    );
  }
  // Generación en frío: sparkle + pasos + barra.
  return (
    <div className="jb-fade" style={onInk ? { background: "rgba(255,255,255,.04)", border: "1px solid #38352E", borderRadius: 18, padding: "44px 28px", textAlign: "center" } : { padding: "40px 22px", textAlign: "center" }}>
      <span style={{ width: 64, height: 64, borderRadius: 19, background: onInk ? "rgba(198,242,78,.14)" : "var(--ink)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
        <Sparkle size={30} stroke="#C6F24E" />
      </span>
      <div style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 20, letterSpacing: "-.5px", marginBottom: 6, color: onInk ? "#fff" : "var(--ink)" }}>
        {t("generating")}<span className="jb-d1">.</span><span className="jb-d2">.</span><span className="jb-d3">.</span>
      </div>
      <p style={{ fontSize: 13.5, color: onInk ? "#B7B2A8" : "var(--soft)", margin: "0 auto 20px", maxWidth: 280 }}>{genStep}</p>
      <div style={{ maxWidth: 280, margin: "0 auto", height: 6, borderRadius: 999, background: onInk ? "#38352E" : "#E0DACC", overflow: "hidden" }}>
        <div className="jb-bar" style={{ height: "100%", background: onInk ? "var(--lime)" : "var(--brand)" }} />
      </div>
    </div>
  );
}

// ── Card de confirmación de datos parseados del CV (impl-only; paso de confirmación marcado) ──
function ConfirmContactCard({ gen, setGen, t }: { gen: any; setGen: (g: any) => void; t: Tx }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 16, marginBottom: 12, marginTop: 12, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ fontFamily: MONO, fontSize: 11, textTransform: "uppercase", letterSpacing: .5, color: "var(--brand)", borderBottom: "1px solid var(--line)", paddingBottom: 6 }}>{t("confirmContact")}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={label}>{t("phone")}</label>
          <input value={gen.phone || ""} onChange={(e) => setGen({ ...gen, phone: e.target.value })} placeholder={t("phonePlaceholder")} style={inputStyle} />
        </div>
        <div>
          <label style={label}>{t("city")}</label>
          <CityAutocomplete value={gen.city || ""} onChange={(city) => setGen({ ...gen, city })} placeholder={t("city")} />
        </div>
      </div>

      {(gen.experiences?.length ?? 0) > 0 && (
        <div>
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

      {gen.education.length > 0 && (
        <div>
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

      {gen.languages.length > 0 && (
        <div>
          <label style={label}>{t("languages")} <AiTag>{t("fromCV")}</AiTag></label>
          <div style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 12, padding: "4px 12px" }}>
            {gen.languages.map((l: any, i: number) => {
              const lvl = (l.level || "").toLowerCase();
              const dots = lvl.includes("nat") || lvl.includes("c2") ? 5 : lvl.includes("avan") || lvl.includes("c1") || lvl.includes("b2") ? 4 : 2;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: i < gen.languages.length - 1 ? "1px solid var(--line)" : "none" }}>
                  <span style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 13, flex: 1 }}>{l.language}</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    {Array.from({ length: 5 }).map((_, dIdx) => (
                      <span key={dIdx} style={{ width: 7, height: 7, borderRadius: "50%", background: dIdx < dots ? "#0E5C4A" : "#E0DACC" }} />
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
  );
}

// ── Formulario de intake (siempre visible en desktop; fase intake en mobile) ────────
function IntakeForm(props: {
  t: Tx; tMod: Tx;
  role: string; onSelectRole: (title: string, cat: CatKey) => void;
  exp: string; setExp: (v: string) => void; expChips: string[];
  modality: Modality | null; setModality: (m: Modality) => void; modChips: Modality[];
  cityIn: string; setCityIn: (v: string) => void; countryIn: string; setCountryIn: (v: string) => void;
  lastTitle: string; setLastTitle: (v: string) => void; lastCompany: string; setLastCompany: (v: string) => void;
  skillCatalog: string[]; intakeSkills: string[]; toggleSkill: (s: string) => void;
  skillDraft: string; setSkillDraft: (v: string) => void; addIntakeSkill: (v: string) => void;
  pitch: string; setPitch: (v: string) => void;
  cvName: string; existingCv: boolean; onPickCv: () => void;
  canGenerate: boolean; onGenerate: () => void;
}) {
  const { t, tMod } = props;
  const chipStyle = (sel: boolean): CSSProperties => ({
    fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: sel ? 700 : 600, fontSize: 13, borderRadius: 999, padding: "8px 13px",
    border: `1.5px solid ${sel ? "#1A1A17" : "#E7E1D4"}`, background: sel ? "#DCEFE4" : "#FCFAF6", color: sel ? "#0E5C4A" : "#54504A", cursor: "pointer", outline: "none",
  });
  const skillChipStyle = (on: boolean): CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 5, fontFamily: MONO, fontWeight: 700, fontSize: 12, borderRadius: 8, padding: "6px 10px", cursor: "pointer",
    border: `1px ${on ? "solid #1A1A17" : "dashed #CFC7B6"}`, background: on ? "#DCEFE4" : "#FCFAF6", color: on ? "#0E5C4A" : "#79746B",
  });
  const req = <span style={{ color: "var(--accent)" }}>*</span>;

  return (
    <div className="jb-fade">
      {/* Encabezado (solo desktop) */}
      <div className="jb-pib-lead">
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: "var(--brand)", display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
          <Sparkle size={14} />{t("intakeEyebrow")}
        </div>
        <h1 style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 30, letterSpacing: "-1.1px", lineHeight: 1.05, margin: "0 0 8px" }}>{t("intakeTitle")}</h1>
        <p style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--soft)", margin: "0 0 24px" }}>{t("intakeLead")}</p>
      </div>

      {/* CV — fila compacta (icono + textos + chevron) */}
      <div onClick={props.onPickCv} className="jb-tap" style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--limeSoft)", border: "1.5px solid #D6E89A", borderRadius: 12, padding: "13px 14px", cursor: "pointer", marginBottom: 16 }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><path d="M12 16V4M7 9l5-5 5 5" stroke="#46540F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M5 16v3a1 1 0 001 1h12a1 1 0 001-1v-3" stroke="#46540F" strokeWidth="2" strokeLinecap="round" /></svg>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 14.5, color: "#2C3907" }}>{props.cvName ? `${t("cvUploaded")}: ${props.cvName}` : props.existingCv ? t("cvQuestionUpdate") : t("cvRowTitle")}</div>
          <div style={{ fontSize: 12, color: "#46540F" }}>
            <span className="jb-pib-lbl-desk">{t("cvRowHint")}</span>
            <span className="jb-pib-lbl-mob">{t("cvRowHintMobile")}</span>
          </div>
        </div>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="#46540F" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <span style={{ flex: 1, height: 1, background: "var(--line)" }} /><span style={{ fontFamily: MONO, fontSize: 10, color: "var(--soft)" }}>{t("orTellUs")}</span><span style={{ flex: 1, height: 1, background: "var(--line)" }} />
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={label}>{t("role")} {req}</label>
          <RoleAutocomplete value={props.role} onSelect={props.onSelectRole} t={t} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={label}><span className="jb-pib-lbl-desk">{t("experienceShort")}</span><span className="jb-pib-lbl-mob">{t("experience")}</span> {req}</label>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {props.expChips.map((c) => <button key={c} type="button" onClick={() => props.setExp(c)} style={chipStyle(props.exp === c)}>{c}</button>)}
            </div>
          </div>
          <div>
            <label style={label}><span className="jb-pib-lbl-desk">{t("modalityShort")}</span><span className="jb-pib-lbl-mob">{t("modality")}</span></label>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {props.modChips.map((c) => <button key={c} type="button" onClick={() => props.setModality(c)} style={chipStyle(props.modality === c)}>{tMod(c)}</button>)}
            </div>
          </div>
        </div>

        <div>
          <label style={label}>{t("locationRequired")} {req}</label>
          <CityAutocomplete value={props.cityIn} country={props.countryIn} onChange={(city, meta) => { props.setCityIn(city); if (meta?.country) props.setCountryIn(meta.country); }} placeholder={t("locationPlaceholder")} inputStyle={inputStyle} />
        </div>

        <div>
          <label style={label}>{t("recentExperience")} <span style={{ textTransform: "none", color: "#B0AAA0" }}>{t("pitchOptional")}</span></label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
            <input value={props.lastTitle} onChange={(e) => props.setLastTitle(e.target.value)} placeholder={t("recentRolePlaceholder")} style={inputStyle} />
            <input value={props.lastCompany} onChange={(e) => props.setLastCompany(e.target.value)} placeholder={t("recentCompanyPlaceholder")} style={inputStyle} />
          </div>
        </div>

        {props.skillCatalog.length > 0 && (
          <div>
            <label style={label}>{t("confirmSkills")} <span style={{ textTransform: "none", color: "#B0AAA0" }}>{t("skillsToggleHint")}</span></label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 9 }}>
              {props.skillCatalog.map((s) => {
                const on = props.intakeSkills.includes(s);
                return <span key={s} onClick={() => props.toggleSkill(s)} className="jb-tap" style={skillChipStyle(on)}>{on ? "✓ " : "+ "}{s}</span>;
              })}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={props.skillDraft} onChange={(e) => props.setSkillDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); props.addIntakeSkill(props.skillDraft); } }} placeholder={t("addSkillPlaceholder")} style={{ ...inputStyle, flex: 1 }} />
              <button type="button" onClick={() => props.addIntakeSkill(props.skillDraft)} className="jb-hard" style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 13.5, color: "#fff", background: "var(--brand)", border: "2px solid var(--ink)", borderRadius: 11, padding: "0 16px", boxShadow: "3px 3px 0 var(--ink)", cursor: "pointer", flexShrink: 0 }}>{t("addSkill")}</button>
            </div>
          </div>
        )}

        <div>
          <label style={label}>{t("pitch")} <span style={{ textTransform: "none", color: "#B0AAA0" }}>{t("pitchOptional")}</span></label>
          <textarea value={props.pitch} onChange={(e) => props.setPitch(e.target.value)} placeholder={t("pitchPlaceholder")} style={{ ...inputStyle, minHeight: 66, resize: "none", fontFamily: "'Hanken Grotesk',sans-serif", lineHeight: 1.5 }} />
        </div>
      </div>

      <button onClick={props.onGenerate} disabled={!props.canGenerate} className="jb-hard" style={{ width: "100%", marginTop: 18, display: "flex", alignItems: "center", justifyContent: "center", gap: 9, fontFamily: ARCHIVO, fontWeight: 800, fontSize: 15, color: "#fff", background: props.canGenerate ? "var(--accent)" : "#C9C2B4", border: "2px solid var(--ink)", borderRadius: 11, padding: 14, boxShadow: "3px 3px 0 var(--ink)", cursor: props.canGenerate ? "pointer" : "not-allowed" }}>
        <Sparkle size={17} stroke="#fff" />{t("generate")}
      </button>
      <div style={{ fontFamily: MONO, fontSize: 9.5, color: props.canGenerate ? "var(--soft)" : "var(--accent)", textAlign: "center", marginTop: 10 }}>
        {props.canGenerate ? t("disclaimer") : t("gateHint")}
      </div>
    </div>
  );
}
