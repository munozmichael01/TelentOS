"use client";

/**
 * AgentActionButton — superficie S1 · Acción (design-system.md Anexo B-2 + addendum).
 * El disparador de un especialista, junto a la acción manual (nunca flotante).
 * Label = verbo + objeto; nunca "IA"/"Agente" — el sparkle ya lo dice.
 * Estados: reposo → pensando (spinner + gerundio, aria-busy).
 * Addendum (fit-gaps pista B, confirmado por Diseño):
 *  - disabled + gatedReason: precondición de formulario con afordancia visible
 *    (tooltip nativo con el porqué), sin perder el estado deshabilitado.
 *  - tone="minimal": control compacto de texto para contextos densos (p. ej.
 *    "Actualizar insights" dentro del panel oscuro del dashboard).
 *  - onDark: sobre paneles de tinta — acento lima (la voz del agente).
 *  - size="xs": toolbars densas.
 */

import { Button } from "@/components/ui/button";
import { IconSparkle, IconSpinner } from "@/components/ui/icons";

export function AgentActionButton({
  idleLabel,
  busyLabel,
  busy,
  onClick,
  variant = "soft",
  disabled = false,
  gatedReason,
  tone = "solid",
  onDark = false,
  size = "sm",
  className,
}: {
  idleLabel: string;
  busyLabel: string;
  busy: boolean;
  onClick: () => void;
  variant?: "soft" | "brand";
  /** Precondición no cumplida (p. ej. brief vacío) — se muestra deshabilitado. */
  disabled?: boolean;
  /** Por qué está deshabilitado — tooltip accesible. */
  gatedReason?: string;
  /** "minimal" = control compacto de texto (paneles densos), sin píldora. */
  tone?: "solid" | "minimal";
  /** Sobre panel de tinta: acento lima. */
  onDark?: boolean;
  size?: "sm" | "xs";
  className?: string;
}) {
  const isDisabled = busy || disabled;
  const title = !busy && disabled && gatedReason ? gatedReason : undefined;

  if (tone === "minimal") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={isDisabled}
        aria-busy={busy}
        title={title}
        className={className}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          background: "none",
          border: "none",
          padding: "2px 4px",
          fontFamily: "'Space Mono',monospace",
          fontSize: size === "xs" ? "10px" : "10.5px",
          letterSpacing: ".3px",
          color: isDisabled ? (onDark ? "#8C877E" : "#B4B0A6") : onDark ? "#C6F24E" : "#0E5C4A",
          cursor: isDisabled ? "not-allowed" : "pointer",
        }}
      >
        {busy ? <IconSpinner className="size-3 animate-spin" /> : <IconSparkle className="size-3" />}
        {busy ? busyLabel : idleLabel}
      </button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size === "xs" ? "sm" : size}
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={busy}
      title={title}
      className={`${onDark && variant === "soft" ? "bg-[rgba(198,242,78,.12)] text-[#C6F24E] hover:bg-[rgba(198,242,78,.2)]" : ""} ${size === "xs" ? "h-7 px-2.5 text-[11px]" : ""} ${className ?? ""}`}
    >
      {busy ? <IconSpinner /> : <IconSparkle />}
      {busy ? busyLabel : idleLabel}
    </Button>
  );
}
