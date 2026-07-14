"use client";

/**
 * AgentPanelShell — chasis del ciclo de vida §4.6 (blueprint B-5b).
 * Cualquier panel de agente invocado (P3 generador · P5 análisis · P6 copilot)
 * se COLAPSA, no se cierra: un único toggle «Ver menos / Ver más», el contenido
 * persiste (no se recomputa al expandir). Re-invocar es responsabilidad del
 * AgentActionButton externo — este toggle NUNCA golpea la API.
 *
 * Desviación del blueprint literal (reconciliación de los 3 patrones): `provenance`
 * y `count` son OPCIONALES. P5/P6 los pasan; P3 (generador) no tiene procedencia ni
 * conteo antes de generar. Requerido→opcional es un superset seguro (no rompe callers).
 */

import { useState } from "react";
import { AgentBadge, type AgentProvenance } from "@/components/ui/agent-badge";
import { IconSparkle } from "@/components/ui/icons";

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      aria-hidden
      style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }}
    >
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AgentPanelShell({
  title,
  provenance,
  count,
  defaultOpen = true,
  className,
  children,
}: {
  title: string;
  provenance?: AgentProvenance;
  /** Resumen de una palabra por patrón — solo visible colapsado ("Fit 82" · "3 avisos" · "6 campos"). */
  count?: string;
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={className} style={{ background: "#1A1A17", color: "#F4F0E8", borderRadius: "16px", overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "9px",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "inherit",
          padding: open ? "16px 20px 10px" : "12px 18px",
          textAlign: "left",
        }}
      >
        <span style={{ color: "#C6F24E", display: "flex", flexShrink: 0 }}>
          <IconSparkle className="size-4" />
        </span>
        <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "15px" }}>{title}</span>
        {provenance && <AgentBadge kind={provenance} onDark />}
        {/* el conteo solo se muestra colapsado: expandido, el contenido ya lo dice */}
        {!open && count && (
          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "11px", color: "#8C877E" }}>{count}</span>
        )}
        <span
          style={{
            marginLeft: "auto",
            color: "#8C877E",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontFamily: "'Space Mono',monospace",
            fontSize: "10.5px",
          }}
        >
          {open ? "Ver menos" : "Ver más"}
          <IconChevron open={open} />
        </span>
      </button>
      {open && <div style={{ padding: "0 20px 18px" }}>{children}</div>}
    </div>
  );
}
