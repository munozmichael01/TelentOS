"use client";

/**
 * ToneSelector — tono de redacción (la voz con la que la IA escribe). DS §2.12.
 * Componente COMPARTIDO: career site (piel `onDark`, lima sobre tinta) y redacción
 * de ofertas (piel clara, marca sobre papel). Valor único (radiogroup). La selección
 * es un estado, no un CTA → relleno plano, sin sombra dura (§1.5 regla 1).
 */

export type Tone = "cercano" | "profesional" | "creativo";

export const TONES: { id: Tone; label: string }[] = [
  { id: "cercano", label: "Cercano" },
  { id: "profesional", label: "Profesional" },
  { id: "creativo", label: "Creativo" },
];

export function ToneSelector({
  value,
  onChange,
  onDark = false,
  "aria-label": ariaLabel = "Tono de redacción",
}: {
  value: Tone;
  onChange: (t: Tone) => void;
  onDark?: boolean;
  "aria-label"?: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} style={{ display: "flex", gap: "7px" }}>
      {TONES.map((t) => {
        const on = value === t.id;
        const sel = onDark
          ? { background: "#C6F24E", color: "#1A1A17", border: "1px solid #C6F24E" }
          : { background: "#0E5C4A", color: "#F4F0E8", border: "1px solid #0E5C4A" };
        const off = onDark
          ? { background: "transparent", color: "#C9C4BA", border: "1px solid rgba(244,240,232,.2)" }
          : { background: "transparent", color: "#79746B", border: "1px solid #E7E1D4" };
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(t.id)}
            style={{
              fontFamily: "'Space Mono',monospace",
              fontSize: "11.5px",
              fontWeight: 700,
              padding: "7px 13px",
              borderRadius: "11px",
              cursor: "pointer",
              ...(on ? sel : off),
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
