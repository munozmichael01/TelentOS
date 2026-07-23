"use client";

import { useState, useRef, useEffect, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { ARCHIVO, MONO, BoardRoot, HardButton, AiTag, MonoLabel, CompanyLogo, inputStyle } from "@/components/board/ui";

type Job = { id: string; title: string; modality: string | null; city: string | null; company: string; logoUrl: string | null; salary: string };
type PreviewSkill = { name: string; requirement: "excluyente" | "deseable" };
type Preview = { description: string | null; employmentType: string | null; skills: PreviewSkill[]; reqs: string[]; match: { met: number; total: number } | null };
type Question = { id: string; type: string; prompt: string; options: string[]; required: boolean };
type Exp = { title: string; company: string | null; seniority?: string | null; start_date: string | null; end_date: string | null; is_current?: boolean };
type Edu = { degree: string; institution: string | null; field?: string | null; level?: string | null; start_year: number | null; end_year: number | null };
type Lang = { language: string; level: string | null };

const label: CSSProperties = { fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: .5, color: "var(--soft)", display: "flex", alignItems: "center", gap: 7, marginBottom: 6 };

// Perfil del invitado guardado en su navegador para re-aplicar sin re-subir/re-parsear el CV
// (ahorra la llamada a OpenAI). Solo su propio dispositivo, sin lookup en servidor.
const GUEST_KEY = "talentos_board_guest_profile";

export function ApplyWizard({ job, preview, screening, slug, locale, authed = false }: { job: Job; preview?: Preview; screening: Question[]; slug: string; locale: string; authed?: boolean }) {
  const t = useTranslations("Board.apply");
  const tDetail = useTranslations("Board.detail");
  const tModality = useTranslations("Board.modality");
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [socialSoon, setSocialSoon] = useState(false);

  const hasScreening = screening.length > 0;
  const totalSteps = hasScreening ? 4 : 3;
  const doneStep = totalSteps;

  const [step, setStep] = useState(1);
  const [parsing, setParsing] = useState(false);
  const [fromCV, setFromCV] = useState(false);
  const [cvName, setCvName] = useState("");
  const [cvUrl, setCvUrl] = useState<string | null>(null);
  const [cvSize, setCvSize] = useState<number | null>(null);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", role: "", note: "" });
  const [skills, setSkills] = useState<string[]>([]);
  const [skillDraft, setSkillDraft] = useState("");
  const [parsed, setParsed] = useState<{ exp: Exp[]; edu: Edu[]; langs: Lang[]; expYears: number; summary: string; city: string | null }>({ exp: [], edu: [], langs: [], expYears: 0, summary: "", city: null });
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [btn, setBtn] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  // Paso de cuenta opcional al cerrar (invitado): crear contraseña o, si el email ya
  // existe, iniciar sesión. En ambos casos se liga la candidatura ya registrada.
  const [acctPw, setAcctPw] = useState("");
  const [acctMode, setAcctMode] = useState<"create" | "signin">("create");
  const [acctBusy, setAcctBusy] = useState(false);
  const [acctErr, setAcctErr] = useState("");

  async function finishAccount() {
    if (acctPw.length < 8) { setAcctErr(t("acctPwHint")); return; }
    setAcctBusy(true); setAcctErr("");
    const supabase = createClient();
    try {
      if (acctMode === "create") {
        const fullName = `${form.firstName} ${form.lastName}`.trim();
        const res = await fetch("/api/board/auth/signup", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: fullName, first_name: form.firstName, last_name: form.lastName, email: form.email, password: acctPw }),
        });
        if (res.status === 409) { setAcctMode("signin"); setAcctErr(t("acctExists")); setAcctBusy(false); return; }
        if (!res.ok) { setAcctErr(t("acctError")); setAcctBusy(false); return; }
      }
      const { error: signErr } = await supabase.auth.signInWithPassword({ email: form.email.trim().toLowerCase(), password: acctPw });
      if (signErr) { setAcctErr(acctMode === "signin" ? t("acctBadCreds") : t("acctError")); setAcctBusy(false); return; }
      await fetch("/api/board/auth/link", { method: "POST" }); // liga la candidatura a la cuenta
      router.push("/cuenta");
    } catch { setAcctErr(t("acctError")); setAcctBusy(false); }
  }

  // Re-aplicación: si el invitado ya tiene perfil guardado en este navegador, salta el
  // paso de CV/parse y entra directo a confirmar (pre-rellenado). Sin re-parsear.
  useEffect(() => {
    if (authed) return;
    try {
      const raw = window.localStorage.getItem(GUEST_KEY);
      if (!raw) return;
      const p = JSON.parse(raw) as { name?: string; firstName?: string; lastName?: string; email?: string; phone?: string; role?: string; skills?: string[]; exp?: Exp[]; edu?: Edu[]; langs?: Lang[]; expYears?: number; summary?: string; city?: string | null };
      
      let fName = p.firstName ?? "";
      let lName = p.lastName ?? "";
      if (!fName && !lName && p.name) {
        const parts = p.name.trim().split(/\s+/);
        fName = parts[0] ?? "";
        lName = parts.slice(1).join(" ") ?? "";
      }

      setForm((f) => ({ ...f, firstName: fName || f.firstName, lastName: lName || f.lastName, email: p.email ?? f.email, phone: p.phone ?? f.phone, role: p.role ?? f.role }));
      if (Array.isArray(p.skills)) setSkills(p.skills);
      setParsed({ exp: p.exp ?? [], edu: p.edu ?? [], langs: p.langs ?? [], expYears: p.expYears ?? 0, summary: p.summary ?? "", city: p.city ?? null });
      if (typeof (p as { cvUrl?: string }).cvUrl === "string") setCvUrl((p as { cvUrl?: string }).cvUrl ?? null);
      setFromCV(true);
      setStep(2);
    } catch { /* localStorage no disponible / corrupto → flujo normal */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const addSkill = (v: string) => { const s = v.trim(); if (!s) return; setSkills((cur) => cur.includes(s) ? cur : [...cur, s]); setSkillDraft(""); };
  const suggested = ["Figma", "UX research", "Prototyping", "Design systems", "Node.js", "SQL", "Comunicación", "Liderazgo"].filter((x) => !skills.includes(x)).slice(0, 6);

  async function onFile(file: File | null) {
    if (!file) return;
    setCvName(file.name); setCvSize(file.size); setParsing(true); setError("");
    const fd = new FormData(); fd.append("cv", file);
    const r = await fetch("/api/careers/parse-cv", { method: "POST", body: fd }).then((x) => (x.ok ? x.json() : null)).catch(() => null);
    setParsing(false);
    if (r?.cv_path) setCvUrl(r.cv_path);
    const p = r?.profile;
    if (p) {
      const fullName = p.name ?? "";
      const nameParts = fullName.trim().split(/\s+/);
      const firstName = p.first_name ?? nameParts[0] ?? "";
      const lastName = p.last_name ?? nameParts.slice(1).join(" ") ?? "";

      setForm((f) => ({
        ...f,
        firstName: firstName || f.firstName,
        lastName: lastName || f.lastName,
        email: p.email ?? f.email,
        phone: p.phone ?? f.phone,
        role: p.experiences?.[0]?.title ?? f.role
      }));
      setSkills(Array.isArray(p.skills) ? p.skills : []);
      setParsed({ exp: p.experiences ?? [], edu: p.education ?? [], langs: p.languages ?? [], expYears: p.experience_years ?? 0, summary: p.summary ?? "", city: p.city ?? null });
    }
    setFromCV(true); setStep(2);
  }

  async function submit() {
    setBtn("sending"); setError("");
    const fullName = `${form.firstName} ${form.lastName}`.trim();
    const res = await fetch("/api/board/apply", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId: job.id,
        locale,
        candidate: { name: fullName, first_name: form.firstName, last_name: form.lastName, email: form.email, phone: form.phone, skills, experience_years: parsed.expYears, summary: parsed.summary || form.note || null, city: parsed.city, cv_url: cvUrl, experiences: parsed.exp, education: parsed.edu, languages: parsed.langs },
        screeningAnswers: answers,
      }),
    }).catch(() => null);
    if (res?.ok) {
      // Guarda el perfil confirmado para re-aplicar sin re-parsear (solo invitado).
      if (!authed) {
        try {
          window.localStorage.setItem(GUEST_KEY, JSON.stringify({
            firstName: form.firstName, lastName: form.lastName, email: form.email, phone: form.phone, role: form.role,
            skills, exp: parsed.exp, edu: parsed.edu, langs: parsed.langs,
            expYears: parsed.expYears, summary: parsed.summary, city: parsed.city, cvUrl,
          }));
        } catch { /* ignore */ }
      }
      setBtn("sent"); setTimeout(() => setStep(doneStep), 800);
    }
    else { setBtn("idle"); setError(t("error")); }
  }

  const screeningComplete = screening.every((q) => !q.required || (answers[q.id] != null && String(answers[q.id]).trim() !== ""));
  const canContinue2 = form.firstName.trim() && form.lastName.trim() && form.email.trim();

  function primary() {
    if (step === 2) { if (hasScreening) setStep(3); else submit(); }
    else if (step === 3 && screeningComplete) submit();
  }

  const stepTitles: Record<number, string> = { 1: t("s1Title"), 2: t("s2Title"), 3: hasScreening ? t("s3Title") : t("doneTitle2"), 4: t("doneTitle2") };
  const isDone = step === doneStep;

  // Botón sticky de acción (pasos 2-3)
  let actionLabel = "", actionVariant: "accent" | "brand" | "disabled" = "accent", actionDisabled = false;
  if (btn === "sending") { actionLabel = t("sending"); actionVariant = "accent"; actionDisabled = true; }
  else if (btn === "sent") { actionLabel = t("sent"); actionVariant = "brand"; actionDisabled = true; }
  else if (step === 2) { actionLabel = hasScreening ? t("continue") : t("submitApply"); actionDisabled = !canContinue2; actionVariant = canContinue2 ? "accent" : "disabled"; }
  else if (step === 3) { actionLabel = screeningComplete ? t("submitApply") : t("answerRequired"); actionDisabled = !screeningComplete; actionVariant = screeningComplete ? "accent" : "disabled"; }
  const showAction = (step === 2 || step === 3) && !isDone;
  // Hint contextual junto al botón (según el paso; solo visible en desktop).
  const actionHint = btn !== "idle"
    ? ""
    : step === 2
      ? (hasScreening ? t("hintContinue") : t("hintReview"))
      : t("hintRequired");

  return (
    <BoardRoot>
      <div className="jb-apply-shell">
        {/* HEADER + PROGRESS — full width arriba en desktop, sticky arriba en mobile */}
        <header className="jb-apply-header">
          <div className="jb-apply-headrow">
            <button onClick={() => (step > 1 && !isDone ? setStep(step - 1) : router.push({ pathname: "/empleos/oferta/[slug]", params: { slug } }))} className="jb-hard jb-apply-back">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="var(--ink)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <div className="jb-apply-headtitle">
              <MonoLabel style={{ fontSize: 9.5 }}>{t("hdr", { n: step, total: totalSteps })}</MonoLabel>
              <div className="jb-apply-steptitle">{stepTitles[step]}</div>
            </div>
            <div className="jb-apply-progress">
              {Array.from({ length: totalSteps }, (_, i) => (
                <span key={i} style={{ background: i < step ? "var(--brand)" : "#E0DACC" }} />
              ))}
            </div>
          </div>
        </header>

        {/* CUERPO: columna de formulario + preview de la oferta (solo desktop) */}
        <div className="jb-apply-body">
          <div className="jb-apply-main" style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1, paddingBottom: showAction ? 96 : 24 }}>
              <div className="jb-apply-formpad">
                {/* banner de la oferta (persistente) — solo mobile; en desktop vive en el preview */}
                <div className="jb-apply-mobileblock" style={{ display: "flex", alignItems: "center", gap: 11, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 13, padding: "11px 13px" }}>
                  <CompanyLogo name={job.company} logoUrl={job.logoUrl} size={38} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 14, lineHeight: 1.1 }}>{job.title}</div>
                    <div style={{ fontFamily: MONO, fontSize: 10.5, color: "var(--soft)", marginTop: 2 }}>{[job.company, job.modality, job.salary].filter(Boolean).join(" · ")}</div>
                  </div>
                </div>

                {/* STEP 1 */}
                {step === 1 && (
                  <div style={{ paddingTop: 16 }}>
                    <h1 className="jb-apply-title-1" style={{ fontFamily: ARCHIVO, fontWeight: 900, letterSpacing: "-.7px", margin: "0 0 5px" }}>{t("cvHead")}</h1>
                    <p style={{ fontSize: 14, lineHeight: 1.5, color: "var(--soft)", margin: "0 0 16px" }}>{t("cvSub")}</p>
                    <input ref={fileRef} type="file" accept="application/pdf,text/plain" onChange={(e) => onFile(e.target.files?.[0] ?? null)} style={{ display: "none" }} />
                    {!parsing ? (
                      <div
                        role="button" tabIndex={0}
                        onClick={() => fileRef.current?.click()}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileRef.current?.click(); } }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files?.[0] ?? null); }}
                        className="jb-hard" style={{ width: "100%", cursor: "pointer", background: "var(--surface)", border: "2px dashed #C4BCA9", borderRadius: 16, padding: "30px 20px", textAlign: "center" }}>
                        <span style={{ width: 52, height: 52, borderRadius: 15, background: "var(--brandSoft)", color: "var(--brand)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 16V4M7 9l5-5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M5 16v3a1 1 0 001 1h12a1 1 0 001-1v-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                        </span>
                        <div className="jb-apply-mobileblock" style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 15 }}>{t("cvUploadBig")}</div>
                        <div className="jb-apply-desktopblock" style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 17 }}>{t("cvUploadBigDesktop")}</div>
                        <div style={{ fontFamily: MONO, fontSize: 10.5, color: "var(--soft)", marginTop: 5 }}>{t("cvUploadHint")}</div>
                      </div>
                    ) : (
                      <div style={{ background: "var(--ink)", borderRadius: 16, padding: "22px 20px", color: "#F4F0E8", display: "flex", alignItems: "center", gap: 16 }}>
                        <div style={{ position: "relative", width: 60, height: 76, flexShrink: 0, background: "#0F0E0C", borderRadius: 9, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M7 3h7l4 4v14H7z" stroke="#6E7A46" strokeWidth="1.6" strokeLinejoin="round" /><path d="M14 3v4h4" stroke="#6E7A46" strokeWidth="1.6" strokeLinejoin="round" /><path d="M9 12h6M9 15h6M9 18h3" stroke="#6E7A46" strokeWidth="1.4" strokeLinecap="round" /></svg>
                          <div className="jb-scan" style={{ position: "absolute", left: 0, right: 0, height: 3, background: "var(--lime)", boxShadow: "0 0 10px 2px rgba(198,242,78,.6)" }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 15, color: "#fff" }}>{t("parsing")}</div>
                          <div style={{ fontFamily: MONO, fontSize: 10, color: "#B7B2A8", margin: "3px 0 10px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cvName}</div>
                          <div style={{ height: 6, borderRadius: 999, background: "#38352E", overflow: "hidden" }}><div className="jb-fillbar" style={{ height: "100%", background: "var(--lime)" }} /></div>
                          <div style={{ fontFamily: MONO, fontSize: 9.5, color: "#8C877E", marginTop: 9 }}>{t("parsingHint")}</div>
                        </div>
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0" }}>
                      <span style={{ flex: 1, height: 1, background: "var(--line)" }} /><span style={{ fontFamily: MONO, fontSize: 10, color: "var(--soft)" }}>{t("orAuto")}</span><span style={{ flex: 1, height: 1, background: "var(--line)" }} />
                    </div>
                    <div className="jb-apply-social">
                      <HardButton variant="surface" onClick={() => setSocialSoon(true)} full style={{ fontSize: 14 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M21.6 12.2c0-.6-.1-1.2-.2-1.8H12v3.4h5.4c-.2 1.2-.9 2.3-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.1Z" fill="#4285F4" /><path d="M12 22c2.7 0 5-1 6.6-2.7l-3.2-2.5c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.7-5.6-4.1H3.1v2.6C4.7 19.8 8.1 22 12 22Z" fill="#34A853" /><path d="M6.4 13.6c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7H3.1C2.4 8.5 2 10.2 2 12s.4 3.5 1.1 5l3.3-2.6Z" fill="#FBBC05" /><path d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8C16.9 2.9 14.7 2 12 2 8.1 2 4.7 4.2 3.1 7.5l3.3 2.6C7.2 7.6 9.4 5.9 12 5.9Z" fill="#EA4335" /></svg>
                        <span className="jb-apply-mobileonly">{t("withGoogle")}</span><span className="jb-apply-desktoponly">{t("googleShort")}</span>
                      </HardButton>
                      <HardButton variant="surface" onClick={() => setSocialSoon(true)} full style={{ fontSize: 14 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="#0A66C2"><path d="M20.4 3H3.6A.6.6 0 003 3.6v16.8a.6.6 0 00.6.6h16.8a.6.6 0 00.6-.6V3.6a.6.6 0 00-.6-.6ZM8.3 18.3H5.5V9.4h2.8v8.9ZM6.9 8.2a1.6 1.6 0 110-3.3 1.6 1.6 0 010 3.3Zm11.4 10.1h-2.8v-4.3c0-1 0-2.4-1.4-2.4s-1.7 1.1-1.7 2.3v4.4H9.6V9.4h2.7v1.2h.04c.4-.7 1.3-1.5 2.6-1.5 2.8 0 3.3 1.9 3.3 4.3v4.9Z" /></svg>
                        <span className="jb-apply-mobileonly">{t("withLinkedin")}</span><span className="jb-apply-desktoponly">{t("linkedinShort")}</span>
                      </HardButton>
                    </div>
                    {socialSoon && <div style={{ fontFamily: MONO, fontSize: 11, color: "var(--soft)", textAlign: "center", marginTop: 10 }}>{t("soon")}</div>}
                    <button onClick={() => { setFromCV(false); setStep(2); }} className="jb-tap" style={{ display: "block", margin: "16px auto 0", fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 600, fontSize: 13, color: "var(--soft)", background: "transparent", border: "none", padding: 8, cursor: "pointer" }}>{t("manual")}</button>
                  </div>
                )}

                {/* STEP 2 */}
                {step === 2 && (
                  <div style={{ paddingTop: 16 }}>
                    {/* encabezado del paso — solo desktop (en mobile el título va en el header) */}
                    <div className="jb-apply-desktopblock" style={{ marginBottom: 20 }}>
                      <h1 style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 28, letterSpacing: "-1px", margin: "0 0 6px" }}>{t("s2Title")}</h1>
                      <p style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--soft)", margin: 0 }}>{t("s2Sub")}</p>
                    </div>
                    {fromCV && (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--limeSoft)", border: "1px solid #D6E89A", borderRadius: 12, padding: "11px 13px", marginBottom: 16 }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="11" fill="#C6F24E" /><path className="jb-checkline" d="M7 12.5l3 3 6-7" stroke="#1A1A17" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        <div><div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 14, color: "#2C3907" }}>{t("autofillBanner")}</div><div style={{ fontSize: 12, color: "#46540F", marginTop: 1 }}>{t("autofillHint")}</div></div>
                      </div>
                    )}
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div><label style={label}>{t("firstName")}{fromCV && form.firstName && <AiTag>{t("fromCV")}</AiTag>}</label><input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder={t("firstNamePlaceholder")} style={inputStyle} /></div>
                        <div><label style={label}>{t("lastName")}{fromCV && form.lastName && <AiTag>{t("fromCV")}</AiTag>}</label><input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder={t("lastNamePlaceholder")} style={inputStyle} /></div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div><label style={label}>{t("email")}{fromCV && form.email && <AiTag>{t("fromCV")}</AiTag>}</label><input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="tu@correo.com" style={inputStyle} /></div>
                        <div><label style={label}>{t("phone")} <span className="jb-apply-desktoponly" style={{ textTransform: "none", color: "#B0AAA0" }}>{t("optional")}</span></label><input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+58…" style={inputStyle} /></div>
                      </div>
                      <div><label style={label}>{t("role")}{fromCV && form.role && <AiTag>{t("fromCV")}</AiTag>}</label><input value={form.role} onChange={(e) => set("role", e.target.value)} placeholder={t("rolePlaceholder")} style={inputStyle} /></div>
                      <div>
                        <label style={label}>{fromCV ? t("skillsDetected") : t("skillsYours")}{fromCV && <AiTag>{t("fromCV")}</AiTag>}</label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {skills.map((s) => (
                            <span key={s} onClick={() => setSkills((cur) => cur.filter((x) => x !== s))} className="jb-tap" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: MONO, fontSize: 11, fontWeight: 700, color: "#54504A", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "5px 8px 5px 10px", cursor: "pointer" }}>{s}<svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="var(--soft)" strokeWidth="2.6" strokeLinecap="round" /></svg></span>
                          ))}
                        </div>
                        {skills.length === 0 && <div style={{ fontSize: 12.5, color: "var(--soft)", margin: "6px 0 4px" }}>{t("noSkills")}</div>}
                        <div style={{ display: "flex", gap: 7, marginTop: 8 }}>
                          <input value={skillDraft} onChange={(e) => setSkillDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(skillDraft); } }} placeholder={t("addSkillPlaceholder")} style={{ ...inputStyle, flex: 1 }} />
                          <HardButton variant="brand" onClick={() => addSkill(skillDraft)} style={{ fontSize: 13, padding: "0 15px" }}>{t("addSkill")}</HardButton>
                        </div>
                        {suggested.length > 0 && (
                          <div style={{ marginTop: 10 }}>
                            <MonoLabel style={{ fontSize: 9, marginBottom: 6 }}>{t("suggested")}</MonoLabel>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {suggested.map((sg) => <span key={sg} onClick={() => addSkill(sg)} className="jb-tap" style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: "var(--brand)", background: "var(--brandSoft)", border: "1px dashed #BEE0CE", borderRadius: 8, padding: "5px 9px", cursor: "pointer" }}>+ {sg}</span>)}
                            </div>
                          </div>
                        )}
                      </div>
                      <div><label style={label}>{t("messageLabel")} <span style={{ textTransform: "none", color: "#B0AAA0" }}>{t("optional")}</span></label><textarea value={form.note} onChange={(e) => set("note", e.target.value)} placeholder={t("messagePlaceholder")} style={{ ...inputStyle, minHeight: 74, resize: "none" }} /></div>

                      {/* card de CV — después del mensaje, antes de las secciones extraídas */}
                      {fromCV && cvName && <CvMiniCard name={cvName} size={cvSize} cvUrl={cvUrl} onReplace={onFile} t={t} />}

                      {fromCV && parsed.exp.length > 0 && <ParsedBlock title={t("experience")} tag={t("fromCV")} items={parsed.exp.map((e) => ({ main: e.title, sub: [e.company, [e.start_date, e.is_current ? "actual" : e.end_date].filter(Boolean).join(" — ")].filter(Boolean).join(" · ") }))} />}
                      {fromCV && parsed.edu.length > 0 && <ParsedBlock title={t("education")} tag={t("fromCV")} items={parsed.edu.map((e) => ({ main: e.degree, sub: [e.institution, [e.start_year, e.end_year].filter(Boolean).join(" — ")].filter(Boolean).join(" · ") }))} />}
                      {fromCV && parsed.langs.length > 0 && <LanguagesBlock langs={parsed.langs} tag={t("fromCV")} title={t("languages")} basic={t("basic")} />}
                    </div>
                  </div>
                )}

                {/* STEP 3: screening */}
                {step === 3 && hasScreening && (
                  <div style={{ paddingTop: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 6 }}>
                      <span className="jb-apply-screenbadge" style={{ width: 34, height: 34, borderRadius: 11, background: "var(--brandSoft)", color: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="2" /><path d="M9.5 14l1.8 1.8 3.7-3.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </span>
                      <h1 className="jb-apply-title-3" style={{ fontFamily: ARCHIVO, fontWeight: 900, letterSpacing: "-.6px", margin: 0 }}>{t("s3Title")}</h1>
                    </div>
                    <p style={{ fontSize: 14, lineHeight: 1.5, color: "var(--soft)", margin: "0 0 18px" }}>{t("screeningIntro", { company: job.company, job: job.title })}</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                      {screening.map((q, i) => (
                        <div key={q.id}>
                          <label style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", display: "block", marginBottom: 10 }}>{i + 1} · {q.prompt}{q.required && <span style={{ color: "var(--accent)" }}> *</span>}</label>
                          {q.type === "yes_no" || q.type === "single_choice" ? (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                              {(q.type === "yes_no" ? [t("yes"), t("no")] : q.options).map((opt) => {
                                const on = answers[q.id] === opt;
                                return <button key={opt} onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt }))} style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: on ? 700 : 600, fontSize: 13, borderRadius: 999, padding: "8px 14px", border: `1.5px solid ${on ? "#1A1A17" : "#E7E1D4"}`, background: on ? "#DCEFE4" : "#FCFAF6", color: on ? "#0E5C4A" : "#54504A", cursor: "pointer" }}>{opt}</button>;
                              })}
                            </div>
                          ) : (
                            <input type={q.type === "url" ? "url" : "text"} value={(answers[q.id] as string) ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} placeholder={q.type === "url" ? "https://…" : ""} style={inputStyle} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* STEP DONE */}
                {isDone && (
                  <div style={{ padding: "30px 4px", textAlign: "center" }}>
                    <span className="jb-apply-donebadge" style={{ borderRadius: 22, background: "var(--brandSoft)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}><svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path className="jb-checkline" d="M6 12.5l3.5 3.5 8-9" stroke="#0E5C4A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
                    <h1 className="jb-apply-title-done" style={{ fontFamily: ARCHIVO, fontWeight: 900, letterSpacing: "-.9px", margin: "0 0 8px" }}>{t("success")}</h1>
                    <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--soft)", margin: "0 auto 22px", maxWidth: 420 }}>{t("doneDesc", { company: job.company, job: job.title, email: form.email })}</p>
                    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 15, padding: 16, textAlign: "left", marginBottom: 16, maxWidth: 440, marginLeft: "auto", marginRight: "auto" }}>
                      <MonoLabel style={{ marginBottom: 11 }}>{t("whatsNext")}</MonoLabel>
                      {[t("next1"), t("next2")].map((txt, i) => (
                        <div key={i} style={{ display: "flex", gap: 11, alignItems: "flex-start", marginBottom: i === 0 ? 11 : 0 }}>
                          <span style={{ width: 24, height: 24, borderRadius: 8, background: i === 0 ? "var(--limeSoft)" : "var(--brandSoft)", color: i === 0 ? "#46540F" : "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontWeight: 700, fontSize: 11, flexShrink: 0 }}>{i + 1}</span>
                          <span style={{ fontSize: 13.5, lineHeight: 1.45, color: "#3A3833" }}>{txt}</span>
                        </div>
                      ))}
                    </div>
                    {authed ? (
                      <div className="jb-apply-donebtns">
                        <HardButton variant="brand" full onClick={() => router.push("/cuenta")}>{t("viewApps")}</HardButton>
                        <Link href="/empleos" style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 700, fontSize: 14, color: "var(--soft)", padding: 8, textAlign: "center" }}>
                          <span className="jb-apply-mobileonly">{t("keepBrowsing")}</span><span className="jb-apply-desktoponly">{t("keepBrowsingShort")}</span>
                        </Link>
                      </div>
                    ) : (
                      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 15, padding: 16, textAlign: "left", maxWidth: 440, marginLeft: "auto", marginRight: "auto" }}>
                        <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 15.5, letterSpacing: "-.3px", marginBottom: 3 }}>{acctMode === "signin" ? t("acctSigninTitle") : t("acctTitle")}</div>
                        <p style={{ fontSize: 13, lineHeight: 1.45, color: "var(--soft)", margin: "0 0 12px" }}>{acctMode === "signin" ? t("acctSigninSub") : t("acctSub")}</p>
                        <input
                          type="password" value={acctPw} onChange={(e) => setAcctPw(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") finishAccount(); }}
                          placeholder="••••••••" autoComplete={acctMode === "signin" ? "current-password" : "new-password"}
                          style={{ ...inputStyle, marginBottom: 10 }}
                        />
                        <HardButton variant={acctBusy ? "disabled" : "brand"} full disabled={acctBusy} onClick={finishAccount}>
                          {acctBusy ? t("sending") : acctMode === "signin" ? t("acctSigninCta") : t("acctCta")}
                        </HardButton>
                        {acctErr && <p style={{ fontSize: 12.5, color: acctMode === "signin" ? "#BD4332" : "var(--soft)", margin: "9px 0 0" }}>{acctErr}</p>}
                        <Link href="/empleos" style={{ display: "block", fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 700, fontSize: 13.5, color: "var(--soft)", padding: "10px 8px 2px", textAlign: "center" }}>{t("acctSkip")}</Link>
                      </div>
                    )}
                  </div>
                )}

                {error && <p style={{ fontSize: 13, color: "#BD4332", marginTop: 12 }}>{error}</p>}
              </div>
            </div>

            {/* sticky action — fija abajo en mobile; anclada bajo el formulario en desktop */}
            {showAction && (
              <div className="jb-apply-action" style={{ background: "rgba(252,250,246,.96)", backdropFilter: "blur(8px)", borderTop: "1px solid var(--line)", padding: "12px 16px 16px", zIndex: 20 }}>
                <div className="jb-apply-actioninner">
                  {actionHint && <p className="jb-apply-hint">{actionHint}</p>}
                  <HardButton variant={actionVariant} full disabled={actionDisabled} onClick={primary}>
                    {btn === "sending" && <span className="jb-apply-spinner" />}{actionLabel}
                  </HardButton>
                </div>
              </div>
            )}
          </div>{/* /jb-apply-main */}

          {preview && <OfferPreview job={job} preview={preview} t={t} tDetail={tDetail} tModality={tModality} />}
        </div>{/* /jb-apply-body */}
      </div>{/* /jb-apply-shell */}
    </BoardRoot>
  );
}

// Preview de la oferta (solo desktop): lo que el candidato está aplicando, a la vista.
function OfferPreview({ job, preview, t, tDetail, tModality }: { job: Job; preview: Preview; t: ReturnType<typeof useTranslations>; tDetail: ReturnType<typeof useTranslations>; tModality: ReturnType<typeof useTranslations> }) {
  const chipNeutral: CSSProperties = { fontSize: 12.5, fontWeight: 600, color: "#54504A", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 8, padding: "6px 11px" };
  return (
    <aside className="jb-apply-preview">
      <div style={{ padding: "32px 40px 40px", maxWidth: 640, position: "sticky", top: 88 }}>
        <MonoLabel style={{ marginBottom: 14 }}>{t("applyingTo")}</MonoLabel>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <CompanyLogo name={job.company} logoUrl={job.logoUrl} size={56} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: MONO, fontSize: 12, color: "var(--soft)" }}>{job.company}</div>
            <h2 style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 24, lineHeight: 1.05, letterSpacing: "-.8px", margin: "3px 0 0" }}>{job.title}</h2>
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 15 }}>
          {job.city && <span style={chipNeutral}>{job.city}</span>}
          {job.modality && <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--brand)", background: "var(--brandSoft)", border: "1px solid #BEE0CE", borderRadius: 8, padding: "6px 11px" }}>{tModality(job.modality)}</span>}
          {preview.employmentType && <span style={chipNeutral}>{preview.employmentType}</span>}
        </div>
        {(job.salary || preview.match) && (
          <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
            <div style={{ flex: 1, background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 14, padding: 14 }}>
              <MonoLabel style={{ fontSize: 10 }}>{tDetail("salary")}</MonoLabel>
              <div style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 20, color: "var(--brand)", marginTop: 4 }}>{job.salary || t("salaryOpen")}</div>
              <div style={{ fontSize: 12, color: "var(--soft)" }}>{t("salaryUnit")}</div>
            </div>
            {preview.match && (
              <div style={{ flex: 1, background: "var(--brandSoft)", border: "1px solid #BEE0CE", borderRadius: 14, padding: 14 }}>
                <div style={{ fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: .5, color: "var(--brand)", display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2Z" stroke="var(--brand)" strokeWidth="1.7" strokeLinejoin="round" /></svg>{t("matchLabel")}
                </div>
                <div style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 20, color: "var(--ink)", marginTop: 4 }}>{t("matchValue", { met: preview.match.met, total: preview.match.total })}</div>
                <div style={{ fontSize: 12, color: "#3A6558" }}>{t("matchUnit")}</div>
              </div>
            )}
          </div>
        )}
        {preview.description && <div style={{ marginTop: 22 }}>
          <div style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 16, marginBottom: 8 }}>{tDetail("about")}</div>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: "#3A3833", margin: 0, whiteSpace: "pre-wrap" }}>{preview.description}</p>
        </div>}
        {(preview.reqs.length > 0 || preview.skills.length > 0) && <div style={{ marginTop: 20 }}>
          <div style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 16, marginBottom: 10 }}>{tDetail("looking")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: preview.skills.length ? 11 : 0 }}>
            {preview.reqs.map((r, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10" fill="var(--brandSoft)" /><path d="M8 12.5l2.5 2.5 5.5-6" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "#3A3833" }}>{r}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {preview.skills.map((s) => (
              <span key={s.name} style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 700, color: s.requirement === "excluyente" ? "#0E5C4A" : "#54504A", background: s.requirement === "excluyente" ? "var(--brandSoft)" : "var(--surface)", border: `1px solid ${s.requirement === "excluyente" ? "#BEE0CE" : "var(--line)"}`, borderRadius: 7, padding: "3px 8px" }}>{s.name}</span>
            ))}
          </div>
        </div>}
        <div style={{ marginTop: 22, background: "var(--limeSoft)", border: "1px solid #D6E89A", borderRadius: 12, padding: "13px 14px", fontSize: 12.5, lineHeight: 1.5, color: "#46540F" }}>
          <b>{t("freeToApplyBold")}</b> {t("freeToApplyRest")}
        </div>
      </div>
    </aside>
  );
}

function CvMiniCard({ name, size, cvUrl, onReplace, t }: { name: string; size: number | null; cvUrl: string | null; onReplace: (f: File | null) => void; t: ReturnType<typeof useTranslations> }) {
  const meta = size ? `${t("cvAttached")} · ${Math.max(1, Math.round(size / 1024))} KB` : t("cvAttached");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: "11px 13px" }}>
      <span style={{ width: 40, height: 48, borderRadius: 8, background: "var(--brandSoft)", color: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M7 3h7l4 4v14H7z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M14 3v4h4" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
        <div style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--soft)", marginTop: 1 }}>{meta}</div>
      </div>
      {cvUrl && (
        <a href={cvUrl} target="_blank" rel="noopener noreferrer" className="jb-tap" style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 12, color: "var(--brand)", background: "var(--brandSoft)", border: "1px solid #BEE0CE", borderRadius: 9, padding: "7px 12px", cursor: "pointer", flexShrink: 0, textDecoration: "none" }}>{t("viewCv")}</a>
      )}
      <label className="jb-tap" style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: "var(--soft)", cursor: "pointer", flexShrink: 0 }}>
        <input type="file" accept="application/pdf,text/plain" onChange={(e) => onReplace(e.target.files?.[0] ?? null)} style={{ display: "none" }} />
        <span className="jb-apply-desktoponly">{t("cvReplace")}</span><span className="jb-apply-mobileonly">{t("change")}</span>
      </label>
    </div>
  );
}

function LanguagesBlock({ langs, tag, title, basic }: { langs: Lang[]; tag: string; title: string; basic: string }) {
  const dots = (level?: string | null) => { const k = (level ?? "").toLowerCase(); if (/nat|c2/.test(k)) return 5; if (/avan|c1|b2/.test(k)) return 4; if (/inter|b1/.test(k)) return 3; if (/bas|a2|a1/.test(k)) return 2; return 2; };
  return (
    <div>
      <label style={label}>{title} <AiTag>{tag}</AiTag></label>
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: "4px 12px" }}>
        {langs.map((l, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: i < langs.length - 1 ? "1px solid var(--line)" : "none" }}>
            <span style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 13, flex: 1 }}>{l.language}</span>
            <div style={{ display: "flex", gap: 4 }}>{Array.from({ length: 5 }, (_, d) => <span key={d} style={{ width: 7, height: 7, borderRadius: "50%", background: d < dots(l.level) ? "#0E5C4A" : "#E0DACC" }} />)}</div>
            <span style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--soft)", width: 66, textAlign: "right" }}>{l.level || basic}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ParsedBlock({ title, tag, items }: { title: string; tag: string; items: { main: string; sub: string }[] }) {
  return (
    <div>
      <label style={label}>{title} <AiTag>{tag}</AiTag></label>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((it, i) => (
          <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: "10px 12px" }}>
            <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 13.5, letterSpacing: "-.2px" }}>{it.main}</div>
            {it.sub && <div style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--soft)", marginTop: 2 }}>{it.sub}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
