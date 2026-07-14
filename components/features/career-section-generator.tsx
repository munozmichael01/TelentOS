"use client";

/**
 * CareerSectionGenerator — B-9 · Redacción asistida por sección del career site.
 *
 * Aplica GeneratorBlock (B-6) DIRECTO (ya trae AgentPanelShell + title/provenance/count)
 * a cada sección editable del career site: el agente redacta el contenido de la sección,
 * el borrador se muestra para revisar y RR.HH. lo aplica o descarta sobre draft_content.
 * Nunca publica: aplicar solo muta el estado de borrador del editor; la publicación es un
 * paso aparte. Vive dentro del SectionPanel del acordeón → una superficie por pantalla.
 *
 * Contrato con el agente (pista A) — POST /api/agents/career-writer:
 *   req:  { section: SectionKey, prompt?: string, current: SectionProposal }
 *   res:  { section: SectionKey, proposal: SectionProposal, rationale?: string, status: "ok"|"fallback" }
 * El companyId/contexto de empresa lo resuelve el servidor desde la sesión (no se envía).
 */

import { useState } from "react";
import { GeneratorBlock } from "@/components/ui/generator-block";
import { Button } from "@/components/ui/button";
import type { CareerSiteContent } from "@/lib/career-site-types";

export type CareerSectionKey = "about" | "culture" | "benefits";

/** Propuesta = subconjunto de CareerSiteContent con las claves de UNA sección. */
export type CareerSectionProposal = Partial<
  Pick<
    CareerSiteContent,
    | "aboutTitle"
    | "aboutDescription"
    | "cultureTitle"
    | "cultureDescription"
    | "cultureValues"
    | "benefitsTitle"
    | "benefits"
  >
>;

type ProposalResponse = {
  section: CareerSectionKey;
  proposal: CareerSectionProposal;
  rationale?: string;
  status: "ok" | "fallback";
};

const SECTION_HINT: Record<CareerSectionKey, string> = {
  about: "Redacto el título y la descripción de «Sobre nosotros» con el tono de tu empresa. Lo revisas y aplicas.",
  culture: "Propongo título, descripción y una lista de valores para «Cultura y valores». Lo revisas y aplicas.",
  benefits: "Propongo el título y una lista de beneficios atractivos. Lo revisas y aplicas.",
};

/** Resumen colapsado tras redactar (chip de AgentPanelShell). */
function countLabel(section: CareerSectionKey, p: CareerSectionProposal): string {
  if (section === "about") return "Título + descripción";
  if (section === "culture") return `Título, descripción · ${(p.cultureValues ?? []).length} valores`;
  return `Título · ${(p.benefits ?? []).length} beneficios`;
}

/* ── Preview del borrador por sección (papel: lo que aterrizará en los campos) ── */

const T = { ink: "#1A1A17", soft: "#79746B", line: "#E7E1D4", surface: "#FCFAF6", bg: "#F4F0E8" };

function ProposalPreview({ section, proposal }: { section: CareerSectionKey; proposal: CareerSectionProposal }) {
  const chip = (icon: string, name: string, key: string) => (
    <span key={key} style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "12px", background: T.bg, border: `1px solid ${T.line}`, borderRadius: "999px", padding: "3px 10px" }}>
      {icon && <span aria-hidden>{icon}</span>}
      {name}
    </span>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {section === "about" && (
        <>
          {proposal.aboutTitle && <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13.5px", color: T.ink }}>{proposal.aboutTitle}</div>}
          {proposal.aboutDescription && <p style={{ fontSize: "13px", lineHeight: 1.55, color: "#3A3833", margin: 0 }}>{proposal.aboutDescription}</p>}
        </>
      )}
      {section === "culture" && (
        <>
          {proposal.cultureTitle && <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13.5px", color: T.ink }}>{proposal.cultureTitle}</div>}
          {proposal.cultureDescription && <p style={{ fontSize: "13px", lineHeight: 1.55, color: "#3A3833", margin: 0 }}>{proposal.cultureDescription}</p>}
          {(proposal.cultureValues ?? []).length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {(proposal.cultureValues ?? []).map((v, i) => chip(v.icon, v.name, `cv-${i}`))}
            </div>
          )}
        </>
      )}
      {section === "benefits" && (
        <>
          {proposal.benefitsTitle && <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13.5px", color: T.ink }}>{proposal.benefitsTitle}</div>}
          {(proposal.benefits ?? []).length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {(proposal.benefits ?? []).map((b, i) => chip(b.icon, b.name, `bf-${i}`))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── Componente ────────────────────────────────────────────────────────────── */

export function CareerSectionGenerator({
  section,
  current,
  onApply,
}: {
  section: CareerSectionKey;
  current: CareerSectionProposal;
  onApply: (proposal: CareerSectionProposal) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState<CareerSectionProposal | null>(null);
  const [status, setStatus] = useState<"ok" | "fallback">("ok");
  const [rationale, setRationale] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/agents/career-writer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, prompt: prompt.trim() || undefined, current }),
      });
      const data = (await res.json().catch(() => ({}))) as Partial<ProposalResponse> & { error?: string };
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      if (!data.proposal) throw new Error("Respuesta sin propuesta");
      setProposal(data.proposal);
      setStatus(data.status ?? "ok");
      setRationale(data.rationale ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo generar");
      setProposal(null);
    } finally {
      setBusy(false);
    }
  }

  function apply() {
    if (!proposal) return;
    onApply(proposal);
    setProposal(null);
    setRationale(null);
  }

  function discard() {
    setProposal(null);
    setRationale(null);
  }

  return (
    <div style={{ marginBottom: "14px" }}>
      <GeneratorBlock
        hint={SECTION_HINT[section]}
        provenance={proposal ? (status === "ok" ? "ia" : "heuristica") : undefined}
        count={proposal ? countLabel(section, proposal) : undefined}
        busy={busy}
        idleLabel={proposal ? "Regenerar" : "Redactar con IA"}
        busyLabel="Redactando…"
        onGenerate={generate}
      >
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Tono o enfoque (opcional): p. ej. cercano y humano, técnico, startup en crecimiento…"
          style={{ width: "100%", resize: "none", height: "52px", fontFamily: "'Hanken Grotesk',sans-serif", fontSize: "13px", color: T.ink, background: T.surface, border: "none", borderRadius: "10px", padding: "10px 12px", outline: "none", boxSizing: "border-box" }}
          onFocus={(e) => { e.currentTarget.style.boxShadow = "0 0 0 3px rgba(220,239,228,0.7)"; }}
          onBlur={(e) => { e.currentTarget.style.boxShadow = "none"; }}
        />
        {error && <p style={{ fontSize: "12px", color: "#F0857D", margin: "10px 0 0" }}>{error}</p>}
      </GeneratorBlock>

      {/* Borrador (papel): revisar → aplicar sobre draft_content o descartar. Nunca publica. */}
      {proposal && (
        <div style={{ marginTop: "8px", background: T.surface, border: `1px solid ${T.line}`, borderRadius: "12px", padding: "14px 16px" }}>
          <ProposalPreview section={section} proposal={proposal} />
          {rationale && <p style={{ fontSize: "11.5px", color: T.soft, lineHeight: 1.5, borderLeft: `2px solid ${T.line}`, paddingLeft: "10px", margin: "10px 0 0" }}>{rationale}</p>}
          <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
            <Button variant="brand" size="sm" onClick={apply}>Aplicar a la sección</Button>
            <Button variant="ghost" size="sm" onClick={discard}>Descartar</Button>
          </div>
        </div>
      )}
    </div>
  );
}
