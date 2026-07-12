"use client";

import { useState } from "react";
import type { CvProfile } from "@/agents/agent-cv-parser";

const T = {
  ink: "#1A1A17",
  soft: "#79746B",
  line: "#E7E1D4",
  surface: "#FCFAF6",
  brand: "#0E5C4A",
  bg: "#F4F0E8",
  accent: "#F0857D",
};

function IconSparkle() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0 }}>
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
function IconSpinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0, animation: "spin 1s linear infinite" }}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeDasharray="28 14" strokeLinecap="round" />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </svg>
  );
}
function IconClose() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

type Props = {
  candidateId: string;
  hasCv: boolean;
};

type EditableProfile = {
  name: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  skills: string[];
  experience_years: number;
};

export function CvParserPanel({ candidateId, hasCv }: Props) {
  const [phase, setPhase] = useState<"idle" | "loading" | "review" | "saving" | "done" | "error">("idle");
  const [aiStatus, setAiStatus] = useState<"ok" | "fallback">("ok");
  const [profile, setProfile] = useState<EditableProfile | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [skillInput, setSkillInput] = useState("");

  if (!hasCv) return null;

  async function extract() {
    setPhase("loading");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/agents/cv-parser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId }),
      });
      const data = await res.json() as { profile: CvProfile; status: "ok" | "fallback"; error?: string };
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      setAiStatus(data.status);
      setProfile({
        name: data.profile.name ?? "",
        email: data.profile.email ?? "",
        phone: data.profile.phone ?? "",
        location: data.profile.location ?? "",
        summary: data.profile.summary,
        skills: data.profile.skills,
        experience_years: data.profile.experience_years,
      });
      setPhase("review");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Error inesperado");
      setPhase("error");
    }
  }

  async function confirm() {
    if (!profile) return;
    setPhase("saving");
    try {
      const res = await fetch(`/api/candidates/${candidateId}/cv-profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name || null,
          email: profile.email || null,
          phone: profile.phone || null,
          location: profile.location || null,
          summary: profile.summary,
          skills: profile.skills,
          experience_years: profile.experience_years,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(d.error ?? `Error ${res.status}`);
      }
      setPhase("done");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Error al guardar");
      setPhase("error");
    }
  }

  function addSkill() {
    const s = skillInput.trim();
    if (!s || !profile) return;
    if (profile.skills.includes(s)) { setSkillInput(""); return; }
    if (profile.skills.length >= 20) return;
    setProfile({ ...profile, skills: [...profile.skills, s] });
    setSkillInput("");
  }

  function removeSkill(s: string) {
    if (!profile) return;
    setProfile({ ...profile, skills: profile.skills.filter((x) => x !== s) });
  }

  // ── Idle: just the button ──────────────────────────────────────────────────
  if (phase === "idle") {
    return (
      <button
        onClick={extract}
        style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          fontFamily: "'Hanken Grotesk',sans-serif", fontSize: "13px", fontWeight: 600,
          color: T.brand, background: "none", border: `1.5px solid ${T.brand}`,
          borderRadius: "8px", padding: "7px 13px", cursor: "pointer", width: "100%",
          justifyContent: "center",
        }}
      >
        <IconSparkle />
        Extraer del CV
      </button>
    );
  }

  if (phase === "loading") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "8px", color: T.soft, fontSize: "13px", padding: "10px 0" }}>
        <IconSpinner />
        Analizando CV…
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div style={{ fontSize: "13px", color: T.brand, fontWeight: 600, padding: "8px 0" }}>
        Perfil actualizado correctamente.
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div style={{ fontSize: "13px", color: T.accent }}>
        {errorMsg ?? "Error desconocido"}
        <button
          onClick={() => setPhase("idle")}
          style={{ marginLeft: "8px", color: T.soft, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontSize: "12px" }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  // ── Review panel ────────────────────────────────────────────────────────────
  if (phase === "review" || phase === "saving") {
    const busy = phase === "saving";
    const p = profile!;

    const fieldStyle: React.CSSProperties = {
      width: "100%", fontFamily: "'Hanken Grotesk',sans-serif", fontSize: "13px",
      border: `1px solid ${T.line}`, borderRadius: "6px", padding: "6px 9px",
      background: T.surface, color: T.ink, outline: "none", boxSizing: "border-box",
    };

    return (
      <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: "12px", padding: "16px", marginTop: "2px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
            <span style={{
              fontSize: "10.5px", fontWeight: 700, fontFamily: "'Space Mono',monospace",
              background: aiStatus === "ok" ? "#DCEFE4" : T.bg,
              color: aiStatus === "ok" ? T.brand : T.soft,
              borderRadius: "999px", padding: "2px 9px",
            }}>
              {aiStatus === "ok" ? "extraído por IA" : "análisis heurístico"}
            </span>
            <span style={{ fontSize: "11.5px", color: T.soft }}>Revisa y confirma</span>
          </div>
          <button
            onClick={() => setPhase("idle")}
            disabled={busy}
            style={{ background: "none", border: "none", cursor: "pointer", color: T.soft, padding: "2px", display: "flex" }}
          >
            <IconClose />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <label style={{ fontSize: "11px", fontWeight: 700, color: T.soft, textTransform: "uppercase", letterSpacing: ".04em" }}>
            Nombre
            <input
              style={{ ...fieldStyle, marginTop: "4px", display: "block" }}
              value={p.name}
              disabled={busy}
              onChange={(e) => setProfile({ ...p, name: e.target.value })}
            />
          </label>

          <label style={{ fontSize: "11px", fontWeight: 700, color: T.soft, textTransform: "uppercase", letterSpacing: ".04em" }}>
            Email
            <input
              style={{ ...fieldStyle, marginTop: "4px", display: "block" }}
              value={p.email}
              disabled={busy}
              onChange={(e) => setProfile({ ...p, email: e.target.value })}
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <label style={{ fontSize: "11px", fontWeight: 700, color: T.soft, textTransform: "uppercase", letterSpacing: ".04em" }}>
              Teléfono
              <input
                style={{ ...fieldStyle, marginTop: "4px", display: "block" }}
                value={p.phone}
                disabled={busy}
                onChange={(e) => setProfile({ ...p, phone: e.target.value })}
              />
            </label>
            <label style={{ fontSize: "11px", fontWeight: 700, color: T.soft, textTransform: "uppercase", letterSpacing: ".04em" }}>
              Ubicación
              <input
                style={{ ...fieldStyle, marginTop: "4px", display: "block" }}
                value={p.location}
                disabled={busy}
                onChange={(e) => setProfile({ ...p, location: e.target.value })}
              />
            </label>
          </div>

          <label style={{ fontSize: "11px", fontWeight: 700, color: T.soft, textTransform: "uppercase", letterSpacing: ".04em" }}>
            Experiencia (años)
            <input
              type="number" min="0" max="60"
              style={{ ...fieldStyle, marginTop: "4px", display: "block", width: "80px" }}
              value={p.experience_years}
              disabled={busy}
              onChange={(e) => setProfile({ ...p, experience_years: Math.max(0, parseInt(e.target.value) || 0) })}
            />
          </label>

          <label style={{ fontSize: "11px", fontWeight: 700, color: T.soft, textTransform: "uppercase", letterSpacing: ".04em" }}>
            Resumen
            <textarea
              rows={3}
              style={{ ...fieldStyle, marginTop: "4px", display: "block", resize: "vertical" }}
              value={p.summary}
              disabled={busy}
              onChange={(e) => setProfile({ ...p, summary: e.target.value })}
            />
          </label>

          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, color: T.soft, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: "6px" }}>
              Skills {p.skills.length > 0 && <span style={{ fontWeight: 400 }}>({p.skills.length}/20)</span>}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "6px" }}>
              {p.skills.map((s) => (
                <span key={s} style={{
                  display: "inline-flex", alignItems: "center", gap: "4px",
                  fontSize: "12px", background: T.bg, color: T.ink,
                  borderRadius: "6px", padding: "2px 8px 2px 10px", border: `1px solid ${T.line}`,
                }}>
                  {s}
                  {!busy && (
                    <button
                      onClick={() => removeSkill(s)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: T.soft, padding: "0 1px", display: "flex", lineHeight: 1 }}
                    >
                      <IconClose />
                    </button>
                  )}
                </span>
              ))}
            </div>
            {p.skills.length < 20 && !busy && (
              <div style={{ display: "flex", gap: "6px" }}>
                <input
                  style={{ ...fieldStyle, flex: 1 }}
                  placeholder="Añadir skill…"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                />
                <button
                  onClick={addSkill}
                  style={{
                    padding: "6px 11px", borderRadius: "6px", border: `1px solid ${T.line}`,
                    background: T.bg, color: T.ink, fontSize: "12px", cursor: "pointer",
                    fontFamily: "'Hanken Grotesk',sans-serif",
                  }}
                >
                  +
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
          <button
            onClick={confirm}
            disabled={busy}
            style={{
              flex: 1, padding: "9px 0", borderRadius: "8px", border: "none",
              background: T.brand, color: "#fff", fontSize: "13px", fontWeight: 700,
              fontFamily: "'Archivo',sans-serif", cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? .7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
            }}
          >
            {busy ? <><IconSpinner />Guardando…</> : "Confirmar y guardar"}
          </button>
          <button
            onClick={() => setPhase("idle")}
            disabled={busy}
            style={{
              padding: "9px 14px", borderRadius: "8px", border: `1px solid ${T.line}`,
              background: "none", color: T.soft, fontSize: "13px", cursor: busy ? "not-allowed" : "pointer",
              fontFamily: "'Hanken Grotesk',sans-serif",
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return null;
}
