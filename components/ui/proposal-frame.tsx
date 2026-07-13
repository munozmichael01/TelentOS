"use client";

/**
 * ProposalFrame — superficie S2 · Propuesta con datos editables (Anexo B-3).
 * Form claro del DS pre-rellenado + franja de procedencia + confirmar/descartar
 * con IGUAL peso visual. La variante narrativa (rationale/plan) usa AgentPanel
 * oscuro, no este marco. Nunca auto-aplicar (invariante + AI Act).
 */

import { Button } from "@/components/ui/button";
import { AgentBadge, type AgentProvenance } from "@/components/ui/agent-badge";
import { IconClose, IconSpinner } from "@/components/ui/icons";

export function ProposalFrame({
  provenance,
  rationale,
  busy,
  onConfirm,
  onDiscard,
  confirmLabel = "Confirmar y guardar",
  children,
}: {
  provenance: AgentProvenance;
  rationale?: string;
  busy: boolean;
  onConfirm: () => void;
  onDiscard: () => void;
  confirmLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[14px] border border-line bg-surface p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AgentBadge kind={provenance} />
          <span className="text-xs text-muted-foreground">Revisa y confirma</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDiscard}
          disabled={busy}
          aria-label="Descartar propuesta"
          className="h-7 w-7"
        >
          <IconClose />
        </Button>
      </div>

      {children}

      {rationale && (
        <p className="text-xs text-muted-foreground leading-relaxed border-l-2 border-line pl-3">{rationale}</p>
      )}

      <div className="flex gap-2 pt-1">
        <Button variant="brand" onClick={onConfirm} disabled={busy} className="flex-1">
          {busy && <IconSpinner />}
          {busy ? "Guardando…" : confirmLabel}
        </Button>
        <Button variant="ghost" onClick={onDiscard} disabled={busy}>
          Descartar
        </Button>
      </div>
    </div>
  );
}
