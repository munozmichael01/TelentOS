"use client";

import { useState, useRef, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const ARCHIVO = "'Archivo',sans-serif";
const MONO = "'Space Mono',monospace";

const ROOT: CSSProperties = {
  "--brand": "#0E5C4A", "--accent": "#F1543F", "--lime": "#C6F24E", "--ink": "#1A1A17",
  "--soft": "#79746B", "--line": "#E7E1D4", "--surface": "#FCFAF6", "--bg": "#F4F0E8",
  "--brandSoft": "#DCEFE4", "--limeSoft": "#EAF7C4",
  fontFamily: "'Hanken Grotesk',system-ui,sans-serif", color: "#1A1A17", background: "#F4F0E8",
  minHeight: "100vh", WebkitFontSmoothing: "antialiased", display: "flex", justifyContent: "center", padding: "20px 16px",
} as CSSProperties;

const input: CSSProperties = { width: "100%", fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 15, color: "#1A1A17", background: "#FCFAF6", border: "1.5px solid #E7E1D4", borderRadius: 11, padding: "12px 13px", outline: "none", boxSizing: "border-box" };
const label: CSSProperties = { fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: .5, color: "#79746B", display: "block", marginBottom: 6 };

type Modality = "remoto" | "hibrido" | "presencial";
type Generated = { headline: string; about: string; skills: string; experience_years: number; city: string | null; phone: string | null; country_code: string | null; languages: unknown[]; education: unknown[] };

export function ProfileBuilder({ locale }: { locale: string }) {
  const t = useTranslations("Board.builder");
  const tMod = useTranslations("Board.modality");
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"intake" | "generating" | "review">("intake");
  const [role, setRole] = useState("");
  const [exp, setExp] = useState("");
  const [modality, setModality] = useState<Modality | null>(null);
  const [pitch, setPitch] = useState("");
  const [cv, setCv] = useState<File | null>(null);
  const [gen, setGen] = useState<Generated | null>(null);
  const [pct, setPct] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setError(""); setStep("generating");
    let parsed: Record<string, unknown> = {};
    if (cv) {
      const fd = new FormData();
      fd.append("cv", cv);
      const r = await fetch("/api/careers/parse-cv", { method: "POST", body: fd }).then((x) => (x.ok ? x.json() : null)).catch(() => null);
      if (r?.profile) parsed = r.profile;
    }
    const expYears = Number(exp) || (typeof parsed.experience_years === "number" ? parsed.experience_years : 0);
    const skills = Array.isArray(parsed.skills) ? (parsed.skills as string[]) : [];
    setGen({
      headline: role || "",
      about: (parsed.summary as string) || pitch || "",
      skills: skills.join(", "),
      experience_years: expYears,
      city: (parsed.city as string) ?? null,
      phone: (parsed.phone as string) ?? null,
      country_code: (parsed.country_code as string) ?? null,
      languages: Array.isArray(parsed.languages) ? (parsed.languages as unknown[]) : [],
      education: Array.isArray(parsed.education) ? (parsed.education as unknown[]) : [],
    });
    setStep("review");
  }

  async function save() {
    if (!gen) return;
    setSaving(true); setError("");
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
      skills: gen.skills.split(",").map((s) => s.trim()).filter(Boolean),
    };
    const res = await fetch("/api/board/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((x) => (x.ok ? x.json() : null)).catch(() => null);
    setSaving(false);
    if (!res) { setError(t("error")); return; }
    setPct(res.completeness?.pct ?? null);
  }

  const seg = (on: boolean): CSSProperties => ({ flex: 1, fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: on ? 700 : 600, fontSize: 13, padding: "9px", borderRadius: 10, border: `1.5px solid ${on ? "#1A1A17" : "#E7E1D4"}`, background: on ? "#DCEFE4" : "#FCFAF6", color: on ? "#0E5C4A" : "#54504A", cursor: "pointer" });

  return (
    <div style={ROOT}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <Link href="/cuenta" style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 8, marginBottom: 4 }}>
          <span style={{ width: 32, height: 32, borderRadius: 10, background: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2Z" stroke="#C6F24E" strokeWidth="1.7" strokeLinejoin="round" /></svg></span>
          <span style={{ fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: "var(--brand)" }}>{t("eyebrow")}</span>
        </Link>

        {step === "review" && pct != null ? (
          // Done
          <div style={{ marginTop: 20 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: "var(--brandSoft)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5 9-11" stroke="#0E5C4A" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <h1 style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 26, letterSpacing: "-1px", margin: "0 0 6px" }}>{t("complete", { pct })}</h1>
            <p style={{ fontSize: 14, color: "var(--soft)", margin: "0 0 22px", lineHeight: 1.5 }}>{gen?.headline}</p>
            <Link href="/empleos/asistente" className="jb-hard" style={{ display: "block", textAlign: "center", fontFamily: ARCHIVO, fontWeight: 800, fontSize: 15, color: "#fff", background: "var(--accent)", border: "2px solid var(--ink)", borderRadius: 12, padding: 14, boxShadow: "3px 3px 0 var(--ink)", marginBottom: 10 }}>{t("findJobs")}</Link>
            <Link href="/cuenta" style={{ display: "block", textAlign: "center", fontFamily: ARCHIVO, fontWeight: 700, fontSize: 14, color: "var(--brand)", padding: 10 }}>{t("viewProfile")}</Link>
          </div>
        ) : step === "generating" ? (
          <div style={{ marginTop: 60, textAlign: "center" }}>
            <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 18, marginBottom: 10 }}>{t("generating")}</div>
            <div style={{ color: "var(--soft)", fontSize: 20, letterSpacing: 3 }}>···</div>
          </div>
        ) : step === "review" && gen ? (
          <div style={{ marginTop: 16 }}>
            <h1 style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 24, letterSpacing: "-.8px", margin: "0 0 18px" }}>{t("doneTitle")}</h1>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div><label style={label}>{t("headline")}</label><input value={gen.headline} onChange={(e) => setGen({ ...gen, headline: e.target.value })} style={input} /></div>
              <div><label style={label}>{t("about")}</label><textarea value={gen.about} onChange={(e) => setGen({ ...gen, about: e.target.value })} rows={4} style={{ ...input, resize: "vertical" }} /></div>
              <div><label style={label}>{t("skills")}</label><input value={gen.skills} onChange={(e) => setGen({ ...gen, skills: e.target.value })} placeholder="React, SQL, Figma…" style={input} /></div>
            </div>
            {error && <p style={{ fontSize: 13, color: "#BD4332", marginTop: 12 }}>{error}</p>}
            <button onClick={save} disabled={saving} className="jb-hard" style={{ width: "100%", marginTop: 20, fontFamily: ARCHIVO, fontWeight: 800, fontSize: 15, color: "#fff", background: "var(--brand)", border: "2px solid var(--ink)", borderRadius: 12, padding: 14, boxShadow: "3px 3px 0 var(--ink)", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>{saving ? t("saving") : t("save")}</button>
          </div>
        ) : (
          // Intake
          <div style={{ marginTop: 16 }}>
            <h1 style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 26, lineHeight: 1.05, letterSpacing: "-1px", margin: "0 0 8px" }}>{t("title")}</h1>
            <p style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--soft)", margin: "0 0 22px" }}>{t("intro")}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div><label style={label}>{t("role")}</label><input value={role} onChange={(e) => setRole(e.target.value)} placeholder={t("rolePlaceholder")} style={input} /></div>
              <div><label style={label}>{t("experience")}</label><input type="number" min="0" value={exp} onChange={(e) => setExp(e.target.value)} placeholder="3" style={input} /></div>
              <div>
                <label style={label}>{t("modality")}</label>
                <div style={{ display: "flex", gap: 7 }}>
                  {(["remoto", "hibrido", "presencial"] as Modality[]).map((m) => (
                    <button key={m} type="button" onClick={() => setModality(m)} style={seg(modality === m)}>{tMod(m)}</button>
                  ))}
                </div>
              </div>
              <div><label style={label}>{t("pitch")}</label><textarea value={pitch} onChange={(e) => setPitch(e.target.value)} rows={3} placeholder={t("pitchPlaceholder")} style={{ ...input, resize: "vertical" }} /></div>
              <div>
                <label style={label}>{t("cvQuestion")}</label>
                <input ref={fileRef} type="file" accept="application/pdf,text/plain" onChange={(e) => setCv(e.target.files?.[0] ?? null)} style={{ display: "none" }} />
                <button type="button" onClick={() => fileRef.current?.click()} style={{ ...input, textAlign: "left", cursor: "pointer", color: cv ? "#0E5C4A" : "#79746B", fontWeight: cv ? 700 : 400 }}>
                  {cv ? `✓ ${t("cvUploaded")}: ${cv.name}` : t("cvUpload")}
                </button>
              </div>
            </div>
            <button onClick={generate} disabled={!role.trim() && !cv} className="jb-hard" style={{ width: "100%", marginTop: 22, fontFamily: ARCHIVO, fontWeight: 800, fontSize: 15, color: "#fff", background: (role.trim() || cv) ? "var(--accent)" : "#C7B9B0", border: "2px solid var(--ink)", borderRadius: 12, padding: 14, boxShadow: "3px 3px 0 var(--ink)", cursor: (role.trim() || cv) ? "pointer" : "not-allowed" }}>{t("generate")}</button>
            <div style={{ textAlign: "center", marginTop: 14 }}>
              <div style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--soft)", marginBottom: 10 }}>{t("disclaimer")}</div>
              <Link href="/cuenta" style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: "var(--soft)" }}>{t("skip")}</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
