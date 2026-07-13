"use client";

/**
 * GeneratorBlock — patrón "agente redactor" (design-system Anexo B-6, P3).
 * Panel de tinta: el agente habla (borrador/rationale) y su salida ATERRIZA en
 * los campos claros del formulario de abajo (§4.1: la tinta es el taller, el
 * papel el entregable). Título "Redacción asistida" (§4.5a). Icono = sparkle único.
 *
 * El disparador vive dentro del panel oscuro → variant="brand" (lima/tinta no
 * aplica al Button; el brand teal con borde lee bien sobre tinta). idle/busyLabel
 * configurables para las dos voces documentadas ("Redactar con IA" / "Mejorar la oferta").
 */

import { AgentActionButton } from "@/components/ui/agent-action-button";
import { AgentBadge, type AgentProvenance } from "@/components/ui/agent-badge";
import { IconSparkle } from "@/components/ui/icons";

export function GeneratorBlock({
  title = "Redacción asistida",
  provenance,
  busy,
  hint,
  idleLabel = "Redactar con IA",
  busyLabel = "Redactando…",
  onGenerate,
  children,
}: {
  title?: string;
  provenance?: AgentProvenance;
  busy: boolean;
  hint?: string;
  idleLabel?: string;
  busyLabel?: string;
  onGenerate: () => void;
  /** controles de intención (chips, textarea) */
  children?: React.ReactNode;
}) {
  return (
    <div style={{ background: "#1A1A17", color: "#F4F0E8", borderRadius: "16px", padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: hint ? "6px" : "12px" }}>
        <span style={{ color: "#C6F24E", display: "flex", flexShrink: 0 }}>
          <IconSparkle className="size-4" />
        </span>
        <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "15px" }}>{title}</span>
        {provenance && (
          <span style={{ marginLeft: "auto" }}>
            <AgentBadge kind={provenance} onDark />
          </span>
        )}
      </div>
      {hint && <p style={{ fontSize: "13px", lineHeight: 1.55, color: "#8C877E", margin: "0 0 12px" }}>{hint}</p>}
      {children}
      <div style={{ marginTop: "12px" }}>
        <AgentActionButton idleLabel={idleLabel} busyLabel={busyLabel} busy={busy} onClick={onGenerate} variant="brand" />
      </div>
    </div>
  );
}
