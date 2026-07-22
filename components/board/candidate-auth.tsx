"use client";

import { useState, useEffect, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";

const ARCHIVO = "'Archivo',sans-serif";
const MONO = "'Space Mono',monospace";

const ROOT: CSSProperties = {
  "--brand": "#0E5C4A", "--accent": "#F1543F", "--lime": "#C6F24E", "--ink": "#1A1A17",
  "--soft": "#79746B", "--line": "#E7E1D4", "--surface": "#FCFAF6", "--bg": "#F4F0E8",
  "--brandSoft": "#DCEFE4", "--limeSoft": "#EAF7C4",
  fontFamily: "'Hanken Grotesk',system-ui,sans-serif", color: "#1A1A17", background: "#F4F0E8",
  minHeight: "100vh", WebkitFontSmoothing: "antialiased",
} as CSSProperties;

const input: CSSProperties = { width: "100%", fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 15, color: "#1A1A17", background: "#FCFAF6", border: "1.5px solid #E7E1D4", borderRadius: 11, padding: "12px 13px", outline: "none", boxSizing: "border-box" };
const labelStyle: CSSProperties = { fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: .5, color: "#79746B", display: "block", marginBottom: 6 };

export function CandidateAuth({ locale, companySession = false }: { locale: string; companySession?: boolean }) {
  const t = useTranslations("Board.auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams ? (searchParams.get("email") || "") : "";

  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [form, setForm] = useState({ firstName: "", lastName: "", email: emailParam, password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [soon, setSoon] = useState(false);
  const signup = mode === "signup";

  useEffect(() => {
    if (emailParam) {
      setForm((f) => ({ ...f, email: emailParam }));
    }
  }, [emailParam]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const supabase = createClient();
    try {
      if (signup) {
        const fullName = `${form.firstName} ${form.lastName}`.trim();
        const res = await fetch("/api/board/auth/signup", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: fullName,
            first_name: form.firstName,
            last_name: form.lastName,
            email: form.email,
            password: form.password
          }),
        });
        if (!res.ok) { const j = await res.json().catch(() => ({})); setError(j.error || t("errGeneric")); setLoading(false); return; }
      }
      const { error: signErr } = await supabase.auth.signInWithPassword({ email: form.email.trim().toLowerCase(), password: form.password });
      if (signErr) { setError(signup ? t("errGeneric") : t("errCredentials")); setLoading(false); return; }
      // Vincula las candidaturas hechas como invitado con este email a la cuenta.
      await fetch("/api/board/auth/link", { method: "POST" }).catch(() => {});
      // Tras registrarse, al constructor de perfil con IA; al iniciar sesión, a la cuenta.
      router.push(signup ? "/cuenta/perfil" : "/cuenta");
      router.refresh();
    } catch {
      setError(t("errGeneric")); setLoading(false);
    }
  }

  const seg = (on: boolean): CSSProperties => ({ flex: 1, textAlign: "center", fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: on ? 800 : 600, fontSize: 13.5, borderRadius: 10, padding: 9, color: on ? "#fff" : "#79746B", background: on ? "#1A1A17" : "transparent", border: "none", cursor: "pointer" });

  const isEmailReadOnly = !!emailParam;

  return (
    <div style={ROOT} className="jb-auth-root">
      <div className="jb-auth-form">
      <div style={{ width: "100%", maxWidth: 400, display: "flex", flexDirection: "column" }}>
        {/* brand */}
        <Link href="/empleos" style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, color: "var(--ink)" }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "2px 2px 0 var(--ink)" }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M4 7l8 4 8-4M4 7l8-4 8 4M4 7v10l8 4 8-4V7M12 11v10" stroke="#C6F24E" strokeWidth="2" strokeLinejoin="round" /></svg>
          </div>
          <span style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 18, letterSpacing: "-.5px" }}>TalentOS <span style={{ color: "var(--brand)" }}>Empleos</span></span>
        </Link>

        {companySession && (
          <div style={{ marginTop: 18, display: "flex", gap: 9, background: "#F8E7C4", border: "1px solid #EBD4A0", borderRadius: 12, padding: "11px 13px" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="9" stroke="#946312" strokeWidth="2" /><path d="M12 8v5M12 16h.01" stroke="#946312" strokeWidth="2" strokeLinecap="round" /></svg>
            <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "#7A5210", margin: 0 }}>{t("companySessionNote")}</p>
          </div>
        )}
        <h1 style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 29, lineHeight: 1.02, letterSpacing: "-1.2px", margin: "26px 0 6px" }}>{signup ? t("signupTitle") : t("signinTitle")}</h1>
        <p style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--soft)", margin: "0 0 20px" }}>{signup ? t("signupSub") : t("signinSub")}</p>

        {/* segmented */}
        <div style={{ display: "flex", gap: 4, background: "var(--surface)", border: "1.5px solid var(--line)", borderRadius: 13, padding: 4, marginBottom: 20 }}>
          <button onClick={() => { setMode("signin"); setError(""); }} style={seg(!signup)}>{t("signin")}</button>
          <button onClick={() => { setMode("signup"); setError(""); }} style={seg(signup)}>{t("signup")}</button>
        </div>

        {/* social (OAuth se cablea aparte — de momento "Próximamente"). Mobile: columna;
            desktop: fila de 2 (.jb-auth-social). Verbo "Registrarme/Entrar" (no el CTA). */}
        <div className="jb-auth-social" style={{ display: "flex", gap: 9, marginBottom: 16 }}>
          {([["Google", "withGoogle"], ["LinkedIn", "withLinkedin"]] as const).map(([prov, key]) => (
            <button key={prov} onClick={() => setSoon(true)} className="jb-hard" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 9, fontFamily: ARCHIVO, fontWeight: 700, fontSize: 14, color: "var(--ink)", background: "var(--surface)", border: "2px solid var(--ink)", borderRadius: 11, padding: 12, boxShadow: "3px 3px 0 var(--ink)", cursor: "pointer" }}>
              {prov === "Google"
                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M21.6 12.2c0-.6-.1-1.2-.2-1.8H12v3.4h5.4c-.2 1.2-.9 2.3-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.1Z" fill="#4285F4" /><path d="M12 22c2.7 0 5-1 6.6-2.7l-3.2-2.5c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.7-5.6-4.1H3.1v2.6C4.7 19.8 8.1 22 12 22Z" fill="#34A853" /><path d="M6.4 13.6c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7H3.1C2.4 8.5 2 10.2 2 12s.4 3.5 1.1 5l3.3-2.6Z" fill="#FBBC05" /><path d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8C16.9 2.9 14.7 2 12 2 8.1 2 4.7 4.2 3.1 7.5l3.3 2.6C7.2 7.6 9.4 5.9 12 5.9Z" fill="#EA4335" /></svg>
                : <svg width="18" height="18" viewBox="0 0 24 24" fill="#0A66C2"><path d="M20.4 3H3.6A.6.6 0 003 3.6v16.8a.6.6 0 00.6.6h16.8a.6.6 0 00.6-.6V3.6a.6.6 0 00-.6-.6ZM8.3 18.3H5.5V9.4h2.8v8.9ZM6.9 8.2a1.6 1.6 0 110-3.3 1.6 1.6 0 010 3.3Zm11.4 10.1h-2.8v-4.3c0-1 0-2.4-1.4-2.4s-1.7 1.1-1.7 2.3v4.4H9.6V9.4h2.7v1.2h.04c.4-.7 1.3-1.5 2.6-1.5 2.8 0 3.3 1.9 3.3 4.3v4.9Z" /></svg>}
              {signup ? t("socialVerbSignup") : t("socialVerbSignin")} {t(key)}
            </button>
          ))}
        </div>
        {soon && <div style={{ fontFamily: MONO, fontSize: 11, color: "var(--soft)", textAlign: "center", margin: "-6px 0 14px" }}>{t("soon")}</div>}

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
          <span style={{ fontFamily: MONO, fontSize: 10, color: "var(--soft)" }}>{t("orEmail")}</span>
          <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {signup && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={labelStyle}>{t("firstName")}</label>
                <input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder={t("firstNamePlaceholder")} style={input} />
              </div>
              <div>
                <label style={labelStyle}>{t("lastName")}</label>
                <input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} placeholder={t("lastNamePlaceholder")} style={input} />
              </div>
            </div>
          )}
          <div>
            <label style={labelStyle}>{t("email")}</label>
            <div style={{ position: "relative" }}>
              <input type="email" required readOnly={isEmailReadOnly} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="tu@correo.com" style={{ ...input, background: isEmailReadOnly ? "var(--line)" : "#FCFAF6", cursor: isEmailReadOnly ? "not-allowed" : "text", paddingRight: isEmailReadOnly ? 38 : 13 }} />
              {isEmailReadOnly && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }}><rect x="5" y="11" width="14" height="9" rx="2" stroke="#79746B" strokeWidth="1.8" /><path d="M8 11V8a4 4 0 018 0v3" stroke="#79746B" strokeWidth="1.8" /></svg>}
            </div>
            {isEmailReadOnly && <p style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--soft)", margin: "5px 0 0" }}>{t("emailVerified")}</p>}
          </div>
          <div>
            <label style={{ ...labelStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{t("password")}</span>
              {!signup && (
                <span onClick={() => setSoon(true)} style={{ textTransform: "none", letterSpacing: 0, color: "var(--brand)", fontWeight: 700, cursor: "pointer" }}>
                  {t("forgot")}
                </span>
              )}
            </label>
            <input type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" style={input} />
          </div>

          {error && <p style={{ fontSize: 13, color: "#BD4332", margin: "2px 0 0" }}>{error}</p>}

          <button type="submit" disabled={loading} className="jb-hard" style={{ width: "100%", marginTop: 6, fontFamily: ARCHIVO, fontWeight: 800, fontSize: 15, color: "#fff", background: "var(--accent)", border: "2px solid var(--ink)", borderRadius: 11, padding: 14, boxShadow: "3px 3px 0 var(--ink)", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {signup ? t("signupAction") : t("signinAction")}
          </button>
        </form>

        {signup && (
          <div style={{ marginTop: 16, background: "var(--limeSoft)", border: "1px solid #D6E89A", borderRadius: 13, padding: "13px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2Z" stroke="#46540F" strokeWidth="1.6" strokeLinejoin="round" /></svg>
              <span style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 13, color: "#2C3907" }}>{t("perkHeading")}</span>
            </div>
            <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "#46540F", margin: 0 }}>{t("perk")}</p>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 18, fontSize: 13, color: "var(--soft)" }}>
          {signup ? t("haveAccount") : t("noAccount")}{" "}
          <button onClick={() => { setMode(signup ? "signin" : "signup"); setError(""); }} style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 13, color: "var(--brand)", background: "none", border: "none", cursor: "pointer" }}>{signup ? t("goSignin") : t("goSignup")}</button>
        </div>

        <div style={{ marginTop: 24, textAlign: "center" }}>
          <Link href="/empleos" style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: "var(--soft)" }}>{t("guest")}</Link>
          <p style={{ fontFamily: MONO, fontSize: 9, color: "#A39E94", lineHeight: 1.5, margin: "14px 0 0" }}>{t("terms")}</p>
        </div>
      </div>
      </div>
      <AuthBrandPanel t={t} />
    </div>
  );
}

// Panel de marca (solo desktop, oculto en mobile por CSS): tinta + acentos lima, eyebrow,
// titular, 3 perks (título + descripción) y prueba social con avatares. Fiel al mockup desktop.
function AuthBrandPanel({ t }: { t: ReturnType<typeof useTranslations> }) {
  const perks = [
    { k: "perkProfile", d: "perkProfileDesc", icon: <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2Z" strokeLinejoin="round" /> },
    { k: "perkOneTap", d: "perkOneTapDesc", icon: <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8Z" strokeLinejoin="round" /> },
    { k: "perkAlerts", d: "perkAlertsDesc", icon: <><path d="M6 8a6 6 0 1112 0c0 7 3 8 3 8H3s3-1 3-8Z" strokeLinejoin="round" /><path d="M10 21a2 2 0 004 0" /></> },
  ];
  const avatars = [
    { i: "MC", bg: "#DCEFE4", c: "#0E5C4A" },
    { i: "JL", bg: "#F8E7C4", c: "#946312" },
    { i: "AR", bg: "#E7E0F2", c: "#5A4C86" },
  ];
  return (
    <aside className="jb-auth-panel" style={{ background: "var(--ink)", color: "#F4F0E8", padding: 64, flexDirection: "column", justifyContent: "center" }}>
      <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: "var(--lime)", marginBottom: 20 }}>{t("panelEyebrow")}</div>
      <h2 style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 42, lineHeight: 1.04, letterSpacing: "-1.6px", maxWidth: 480, margin: "0 0 28px" }}>{t("panelTitle")}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 430 }}>
        {perks.map((p) => (
          <div key={p.k} style={{ display: "flex", alignItems: "flex-start", gap: 13 }}>
            <span style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(198,242,78,.15)", color: "var(--lime)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">{p.icon}</svg>
            </span>
            <div>
              <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 16 }}>{t(p.k)}</div>
              <div style={{ fontSize: 13.5, color: "#B7B2A8", lineHeight: 1.45 }}>{t(p.d)}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 40, paddingTop: 26, borderTop: "1px solid rgba(244,240,232,.15)", maxWidth: 430 }}>
        <div style={{ display: "flex" }}>
          {avatars.map((a, i) => (
            <span key={a.i} style={{ width: 34, height: 34, borderRadius: "50%", background: a.bg, color: a.c, border: "2px solid #1A1A17", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ARCHIVO, fontWeight: 900, fontSize: 12, marginLeft: i ? -10 : 0 }}>{a.i}</span>
          ))}
        </div>
        <span style={{ fontSize: 13, color: "#B7B2A8", lineHeight: 1.4 }}><b style={{ color: "#F4F0E8" }}>{t("socialProofCount")}</b> {t("socialProofRest")}</span>
      </div>
    </aside>
  );
}
