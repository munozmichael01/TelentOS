"use client";

/**
 * FieldProposal.Range — banda de dos números (design-system Anexo B-7b).
 * Variante de FieldProposal para un rango (banda salarial). Un solo «usar sugerencia»
 * gobierna AMBOS extremos: la sugerencia es la banda entera, atómica. Validación
 * max ≥ min con aria-invalid (§2.7). rationale cubre "percentil de tus 12 ofertas".
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FieldProposalRange({
  label,
  value,
  suggested,
  unit = "€",
  rationale,
  disabled,
  onUse,
  onChange,
}: {
  label: string;
  value: [number | "", number | ""]; // [min, max]
  suggested?: [number, number];
  unit?: string;
  rationale?: string;
  disabled?: boolean;
  onUse: () => void; // aplica la banda sugerida completa
  onChange: (v: [number | "", number | ""]) => void;
}) {
  const [min, max] = value;
  const differs = suggested != null && (suggested[0] !== min || suggested[1] !== max);
  const set = (i: 0 | 1) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = e.target.value === "" ? "" : Number(e.target.value);
    onChange(i === 0 ? [n, max] : [min, n]);
  };
  const invalid = min !== "" && max !== "" && Number(max) < Number(min);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs">{label}</Label>
        {differs && !disabled && (
          <button type="button" onClick={onUse} className="text-[11px] font-semibold text-[#0E5C4A] hover:underline">
            Usar {unit}{suggested![0].toLocaleString()}–{unit}{suggested![1].toLocaleString()}
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Input type="number" inputMode="numeric" value={min} disabled={disabled} onChange={set(0)} aria-label={`${label} mínimo`} aria-invalid={invalid} />
        <span className="text-muted-foreground text-xs shrink-0">—</span>
        <Input type="number" inputMode="numeric" value={max} disabled={disabled} onChange={set(1)} aria-label={`${label} máximo`} aria-invalid={invalid} />
      </div>
      {invalid && <p className="text-[11px] text-[#BD4332]">El máximo no puede ser menor que el mínimo.</p>}
      {rationale && !invalid && <p className="text-[11px] text-muted-foreground">{rationale}</p>}
    </div>
  );
}
