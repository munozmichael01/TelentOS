"use client";

/**
 * AgentActionButton — superficie S1 · Acción (design-system.md Anexo B-2).
 * El disparador de un especialista, junto a la acción manual (nunca flotante).
 * Label = verbo + objeto; nunca "IA"/"Agente" — el sparkle ya lo dice.
 * Estados: reposo → pensando (spinner + gerundio, disabled, aria-busy).
 */

import { Button } from "@/components/ui/button";
import { IconSparkle, IconSpinner } from "@/components/ui/icons";

export function AgentActionButton({
  idleLabel,
  busyLabel,
  busy,
  onClick,
  variant = "soft",
  className,
}: {
  idleLabel: string;
  busyLabel: string;
  busy: boolean;
  onClick: () => void;
  variant?: "soft" | "brand";
  className?: string;
}) {
  return (
    <Button variant={variant} size="sm" onClick={onClick} disabled={busy} aria-busy={busy} className={className}>
      {busy ? <IconSpinner /> : <IconSparkle />}
      {busy ? busyLabel : idleLabel}
    </Button>
  );
}
