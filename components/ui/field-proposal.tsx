"use client";

/**
 * FieldProposal — propuesta por campos (design-system Anexo B-7, P4 granular).
 * Refina ProposalFrame para propuestas campo a campo: cada campo propuesto se
 * acepta ("usar sugerencia") o se edita individualmente. Nada se auto-aplica; el
 * ProposalFrame contenedor confirma todo junto (invariante + AI Act).
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FieldProposal({
  label,
  value,
  suggested,
  rationale,
  disabled,
  onUse,
  onChange,
}: {
  label: string;
  value: string;
  suggested?: string;
  rationale?: string;
  disabled?: boolean;
  onUse: () => void;
  onChange: (v: string) => void;
}) {
  const differs = suggested != null && suggested !== value;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs">{label}</Label>
        {differs && !disabled && (
          <button
            type="button"
            onClick={onUse}
            className="text-[11px] font-semibold text-[#0E5C4A] hover:underline"
          >
            Usar sugerencia
          </button>
        )}
      </div>
      <Input value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
      {rationale && <p className="text-[11px] text-muted-foreground">{rationale}</p>}
    </div>
  );
}
