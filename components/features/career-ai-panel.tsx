"use client";

import { useState } from "react";
import { ToneSelector, type Tone } from "@/components/ui/tone-selector";

/**
 * Panel de generación con IA del career site (rework B-9, 2026-07-14).
 * UNA entrada visible arriba del Editor (no un generador por sección). El intake es
 * el objeto de contexto editable; genera TODO el site de una vez (bloques 🟢) y se
 * recede a una barra fina. Sin chat: el preview es el bucle. Regenerar por bloque es
 * secundario (vive en cada bloque del editor, no aquí).
 */

const T = {
  ink: "#1A1A17", soft: "#8C877E", lime: "#C6F24E", limeText: "#1A1A17",
  paper: "#F4F0E8", line: "rgba(244,240,232,0.16)", brand: "#0E5C4A",
};

export type CareerAIProposal = Record<string, unknown>;

export type Intake = {
  about: string;
  values: string[];
  benefits: string[];
  metrics: { value: string; label: string }[];
  tone: string;
};

const EMPTY: Intake = { about: "", values: [], benefits: [], metrics: [], tone: "cercano" };

function ChipList({ items, onChange, placeholder }: { items: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState("");
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
      {items.map((it, i) => (
        <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "12px", background: "rgba(244,240,232,0.08)", border: `1px solid ${T.line}`, borderRadius: "999px", padding: "3px 6px 3px 11px", color: "#E9E4D8" }}>
          {it}
          <span onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={`Quitar ${it}`} style={{ cursor: "pointer", color: T.soft, fontFamily: "'Space Mono',monospace", padding: "0 3px" }}>✕</span>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && draft.trim()) { e.preventDefault(); onChange([...items, draft.trim()]); setDraft(""); }
        }}
        placeholder={placeholder}
        style={{ minWidth: "90px", flex: "1", background: "transparent", border: `1px dashed ${T.line}`, borderRadius: "999px", padding: "4px 11px", fontSize: "12px", color: T.paper, outline: "none" }}
      />
    </div>
  );
}

const monoLabel: React.CSSProperties = { fontFamily: "'Space Mono',monospace", fontSize: "9.5px", letterSpacing: "1px", textTransform: "uppercase", color: T.soft, marginBottom: "7px", display: "block" };

export function CareerAIPanel({ onApply, onGenerated, hasContent }: { onApply: (p: CareerAIProposal) => void; onGenerated?: (intake: Intake) => void; hasContent: boolean }) {
  const [phase, setPhase] = useState<"entry" | "setup" | "generating" | "done">(hasContent ? "done" : "entry");
  const [intake, setIntake] = useState<Intake>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"ok" | "fallback" | null>(null);
  const [url, setUrl] = useState("");
  const [importState, setImportState] = useState<"idle" | "loading" | "done">("idle");
  const [importErr, setImportErr] = useState<string | null>(null);

  const upd = (patch: Partial<Intake>) => setIntake((p) => ({ ...p, ...patch }));

  // Import desde web (URL) o documento (PDF/Word) — ambos pueblan el mismo intake.
  async function runImport(init: RequestInit) {
    setImportState("loading"); setImportErr(null);
    try {
      const res = await fetch("/api/agents/company-parser", init);
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "No se pudo leer la fuente");
      // Puebla el intake (🟢) con lo extraído, sin pisar lo que el usuario ya escribió.
      setIntake((p) => ({
        ...p,
        about: p.about || j.about || "",
        values: p.values.length ? p.values : (j.values ?? []),
        benefits: p.benefits.length ? p.benefits : (j.benefits ?? []),
        metrics: p.metrics.length ? p.metrics : (j.metrics ?? []),
      }));
      // Redes sociales (🟡) → van directas al borrador.
      if (Array.isArray(j.social) && j.social.length) onApply({ socialLinks: j.social });
      setImportState("done");
    } catch (e) {
      setImportErr(String(e instanceof Error ? e.message : e));
      setImportState("idle");
    }
  }
  const importSource = () => { if (url.trim()) runImport({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: url.trim() }) }); };
  const importFile = (file: File) => { const fd = new FormData(); fd.append("file", file); runImport({ method: "POST", body: fd }); };

  async function generate() {
    setPhase("generating"); setError(null);
    try {
      const res = await fetch("/api/agents/career-writer", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ intake }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Error al generar");
      onApply(j.proposal);
      onGenerated?.(intake); // el editor guarda el intake para regenerar bloques sueltos
      setSource(j.status === "fallback" ? "fallback" : "ok");
      setPhase("done");
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
      setPhase("setup");
    }
  }

  const panel: React.CSSProperties = { background: T.ink, color: T.paper, borderRadius: "16px", marginBottom: "16px" };

  if (phase === "done") {
    return (
      <div style={{ ...panel, padding: "11px 16px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke={T.lime} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13.5px" }}>Career site generado</span>
        {source && <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", color: source === "ok" ? T.lime : "#E0A23C", background: source === "ok" ? "rgba(198,242,78,.12)" : "rgba(224,162,60,.12)", border: `1px solid ${source === "ok" ? "rgba(198,242,78,.3)" : "rgba(224,162,60,.3)"}`, borderRadius: "999px", padding: "2px 9px" }}>{source === "ok" ? "IA" : "Heurística"}</span>}
        <span style={{ fontSize: "12px", color: T.soft }}>Revísalo en el preview y edita cualquier bloque.</span>
        <button onClick={() => setPhase("setup")} style={{ marginLeft: "auto", fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: "12px", color: T.lime, background: "transparent", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>Rehacer con otros datos ↻</button>
      </div>
    );
  }

  if (phase === "generating") {
    return (
      <div style={{ ...panel, padding: "18px 20px", display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ display: "inline-flex", animation: "spin 0.8s linear infinite", color: T.lime }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 3a9 9 0 1 0 9 9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
        </span>
        <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "15px" }}>Generando tu career site…</span>
      </div>
    );
  }

  if (phase === "entry") {
    return (
      <div style={{ ...panel, padding: "20px 22px", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
        <span style={{ width: "42px", height: "42px", borderRadius: "12px", background: "rgba(198,242,78,.14)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2l1.7 6.9L21 10.6l-7.3 1.7L12 19l-1.7-6.7L3 10.6l7.3-1.7L12 2Z" fill={T.lime} /></svg>
        </span>
        <div style={{ flex: 1, minWidth: "200px" }}>
          <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "16px" }}>Genera tu career site con IA</div>
          <div style={{ fontSize: "13px", lineHeight: 1.5, color: T.soft, marginTop: "3px" }}>Respóndenos unas preguntas y rellenamos todas las secciones de una vez. Tú revisas y editas en el preview.</div>
        </div>
        <button onClick={() => setPhase("setup")} style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13.5px", color: T.limeText, background: T.lime, border: "none", borderRadius: "11px", padding: "11px 20px", cursor: "pointer" }}>Empezar con IA</button>
      </div>
    );
  }

  // setup
  return (
    <div style={{ ...panel, padding: "18px 20px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "4px" }}>
        <span style={{ color: T.lime, display: "flex" }}><svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M12 2l1.7 6.9L21 10.6l-7.3 1.7L12 19l-1.7-6.7L3 10.6l7.3-1.7L12 2Z" fill="currentColor" /></svg></span>
        <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "16px" }}>Generar career site</span>
        <button onClick={() => setPhase(hasContent ? "done" : "entry")} style={{ marginLeft: "auto", fontFamily: "'Space Mono',monospace", fontSize: "11px", color: T.soft, background: "transparent", border: "none", cursor: "pointer" }}>✕ Cerrar</button>
      </div>
      <p style={{ fontSize: "12.5px", lineHeight: 1.5, color: T.soft, margin: "0 0 16px" }}>Danos tu contexto real y lo redactamos pulido. Cuanta más verdad, mejor sale — la IA no inventa hechos.</p>

      {/* import (parser de empresa) — POBLA el intake desde la web (§2.1) */}
      <div style={{ background: "rgba(244,240,232,0.05)", border: `1px solid ${T.line}`, borderRadius: "12px", padding: "11px 12px", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="9" stroke={T.soft} strokeWidth="2" /><path d="M3 12h18M12 3a15 15 0 010 18" stroke={T.soft} strokeWidth="2" /></svg>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Autorrellenar desde tu web:  https://tuempresa.com" style={{ flex: 1, background: "#FCFAF6", border: "none", borderRadius: "8px", padding: "8px 11px", fontSize: "12.5px", color: "#1A1A17", outline: "none" }} />
          <button onClick={importSource} disabled={importState === "loading" || !url.trim()} style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "12.5px", color: importState === "loading" || !url.trim() ? "#7C7768" : "#1A1A17", background: importState === "loading" || !url.trim() ? "rgba(198,242,78,.35)" : T.lime, border: "none", borderRadius: "8px", padding: "8px 14px", cursor: importState === "loading" || !url.trim() ? "default" : "pointer", whiteSpace: "nowrap" }}>
            {importState === "loading" ? "Leyendo…" : importState === "done" ? "Importado ✓" : "Importar"}
          </button>
        </div>
        <div style={{ marginTop: "8px", fontSize: "11.5px", color: T.soft }}>
          o <label style={{ color: T.lime, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "2px" }}>
            adjunta un PDF o Word
            <input type="file" accept=".pdf,.docx,.txt" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = ""; }} />
          </label>
        </div>
        {importState === "done" && <div style={{ fontSize: "11.5px", color: "#D8E9B0", marginTop: "8px" }}>Rellenamos lo que encontramos abajo. Completa los huecos y las cifras (no las inventamos).</div>}
        {importErr && <div style={{ fontSize: "11.5px", color: "#E0A23C", marginTop: "8px" }}>{importErr}</div>}
      </div>

      <div style={{ marginBottom: "13px" }}>
        <label style={monoLabel}>¿A qué os dedicáis?</label>
        <textarea value={intake.about} onChange={(e) => upd({ about: e.target.value })} rows={2} placeholder="Plataforma de RRHH: automatizamos lo rutinario para centrarnos en las personas…" style={{ width: "100%", resize: "none", background: "#FCFAF6", border: "none", borderRadius: "9px", padding: "9px 12px", fontSize: "13px", color: "#1A1A17", outline: "none", fontFamily: "'Hanken Grotesk',sans-serif" }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "13px", marginBottom: "13px" }}>
        <div><label style={monoLabel}>Valores</label><ChipList items={intake.values} onChange={(v) => upd({ values: v })} placeholder="+ añadir" /></div>
        <div><label style={monoLabel}>Beneficios</label><ChipList items={intake.benefits} onChange={(v) => upd({ benefits: v })} placeholder="+ añadir" /></div>
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label style={monoLabel}>Métricas destacadas <span style={{ textTransform: "none", letterSpacing: 0, color: "#6C675F" }}>· cifras reales, no las inventamos</span></label>
        {intake.metrics.map((m, i) => (
          <div key={i} style={{ display: "flex", gap: "7px", marginBottom: "6px" }}>
            <input value={m.value} onChange={(e) => upd({ metrics: intake.metrics.map((x, j) => j === i ? { ...x, value: e.target.value } : x) })} placeholder="180+" style={{ width: "90px", background: "#FCFAF6", border: "none", borderRadius: "8px", padding: "7px 10px", fontSize: "12.5px", color: "#1A1A17", outline: "none" }} />
            <input value={m.label} onChange={(e) => upd({ metrics: intake.metrics.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })} placeholder="personas" style={{ flex: 1, background: "#FCFAF6", border: "none", borderRadius: "8px", padding: "7px 10px", fontSize: "12.5px", color: "#1A1A17", outline: "none" }} />
            <button onClick={() => upd({ metrics: intake.metrics.filter((_, j) => j !== i) })} aria-label="Quitar métrica" style={{ color: "#E0A23C", background: "transparent", border: "none", cursor: "pointer", fontFamily: "'Space Mono',monospace" }}>✕</button>
          </div>
        ))}
        <button onClick={() => upd({ metrics: [...intake.metrics, { value: "", label: "" }] })} style={{ fontFamily: "'Space Mono',monospace", fontSize: "11px", color: T.lime, background: "transparent", border: "none", cursor: "pointer", padding: "2px 0" }}>+ añadir métrica</button>
      </div>

      <div style={{ marginBottom: "18px" }}>
        <label style={monoLabel}>Tono <span style={{ textTransform: "none", letterSpacing: 0, color: "#6C675F" }}>· componente compartido con ofertas</span></label>
        <ToneSelector value={intake.tone as Tone} onChange={(tone) => upd({ tone })} onDark />
      </div>

      {error && <p style={{ fontSize: "12px", color: "#E0A23C", margin: "0 0 12px" }}>{error}</p>}

      <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
        <button onClick={generate} style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "14px", color: T.limeText, background: T.lime, border: "none", borderRadius: "12px", padding: "12px 24px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "8px" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2l1.7 6.9L21 10.6l-7.3 1.7L12 19l-1.7-6.7L3 10.6l7.3-1.7L12 2Z" fill="#1A1A17" /></svg>
          Generar career site
        </button>
        <span style={{ fontSize: "11.5px", lineHeight: 1.4, color: T.soft }}>Rellena hero, sobre nosotros, métricas, cultura, beneficios, qué buscamos y FAQs de una vez.</span>
      </div>
    </div>
  );
}
