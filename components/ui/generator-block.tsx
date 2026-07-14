"use client";

/**
 * GeneratorBlock — patrón "agente redactor" (design-system Anexo B-6, P3).
 * Panel de tinta: el agente habla (borrador/rationale) y su salida ATERRIZA en
 * los campos claros del formulario de abajo (§4.1: la tinta es el taller, el
 * papel el entregable). Título "Redacción asistida" (§4.5a). Icono = sparkle único.
 *
 * Ciclo de vida §4.6: el chasis (colapsar/expandir) lo da AgentPanelShell (B-5b),
 * para que P3/P5/P6 compartan un solo código. El disparador vive dentro del panel
 * → variant="brand" (lee bien sobre tinta). idle/busyLabel configurables para las
 * dos voces documentadas ("Redactar con IA" / "Mejorar la oferta").
 */

import { AgentActionButton } from "@/components/ui/agent-action-button";
import { AgentPanelShell } from "@/components/ui/agent-panel-shell";
import type { AgentProvenance } from "@/components/ui/agent-badge";

export function GeneratorBlock({
  title = "Redacción asistida",
  provenance,
  count,
  busy,
  hint,
  idleLabel = "Redactar con IA",
  busyLabel = "Redactando…",
  onGenerate,
  children,
}: {
  title?: string;
  provenance?: AgentProvenance;
  /** Resumen colapsado (p. ej. "6 campos" tras redactar). */
  count?: string;
  busy: boolean;
  hint?: string;
  idleLabel?: string;
  busyLabel?: string;
  onGenerate: () => void;
  /** controles de intención (chips, textarea) */
  children?: React.ReactNode;
}) {
  return (
    <AgentPanelShell title={title} provenance={provenance} count={count}>
      {hint && <p style={{ fontSize: "13px", lineHeight: 1.55, color: "#8C877E", margin: "0 0 12px" }}>{hint}</p>}
      {children}
      <div style={{ marginTop: "12px" }}>
        <AgentActionButton idleLabel={idleLabel} busyLabel={busyLabel} busy={busy} onClick={onGenerate} variant="brand" />
      </div>
    </AgentPanelShell>
  );
}
