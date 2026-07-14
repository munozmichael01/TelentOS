"use client";

/**
 * FieldProposal.Multi — lista de chips añadibles/quitables (design-system Anexo B-7c).
 * Variante de FieldProposal para un campo lista (skills/requisitos). El agente propone
 * un set; el usuario quita (× en el chip) y añade (input + Enter/blur). «Usar sugerencia»
 * rellena la lista con la propuesta; a partir de ahí es edición libre. Sin duplicados.
 */

import { useState } from "react";
import { Label } from "@/components/ui/label";

export function FieldProposalMulti({
  label,
  value,
  suggested,
  rationale,
  disabled,
  onUse,
  onChange,
}: {
  label: string;
  value: string[];
  suggested?: string[];
  rationale?: string;
  disabled?: boolean;
  onUse: () => void; // value := suggested
  onChange: (v: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const differs = suggested != null && suggested.join("") !== value.join("");
  const add = () => {
    const t = draft.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setDraft("");
  };
  const remove = (s: string) => onChange(value.filter((x) => x !== s));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs">{label}</Label>
        {differs && !disabled && (
          <button type="button" onClick={onUse} className="text-[11px] font-semibold text-[#0E5C4A] hover:underline">
            Usar sugerencia ({suggested!.length})
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5 rounded-[11px] border-[1.5px] border-line bg-paper p-2 min-h-9">
        {value.map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5 text-xs font-semibold bg-brand-soft text-brand rounded-full pl-2.5 pr-1.5 py-1">
            {s}
            {!disabled && (
              <button type="button" onClick={() => remove(s)} aria-label={`Quitar ${s}`} className="text-brand/60 hover:text-brand flex items-center">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
              </button>
            )}
          </span>
        ))}
        {!disabled && (
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
            onBlur={add}
            placeholder={value.length ? "Añadir…" : "Añade una skill y pulsa Enter"}
            aria-label={`Añadir a ${label}`}
            className="flex-1 min-w-[120px] bg-transparent text-sm outline-none px-1"
          />
        )}
      </div>
      {rationale && <p className="text-[11px] text-muted-foreground">{rationale}</p>}
    </div>
  );
}
