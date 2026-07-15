"use client";

/**
 * ModalitySelector — modalidad de trabajo (presencial · híbrido · remoto).
 * DS §2.14: mismo segmentado que ToneSelector (§2.12), preset ICONO. Selección
 * de valor único (radiogroup). La selección es un ESTADO, no un CTA → sin sombra
 * dura ni transform (§1.5 regla 1); relleno de marca plano sobre papel.
 */

export type WorkModality = "presencial" | "hibrido" | "remoto";

const OPTS: { id: WorkModality; label: string; icon: React.ReactNode }[] = [
  {
    id: "presencial",
    label: "Presencial",
    icon: (
      <path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M14 21V9h4a1 1 0 0 1 1 1v11M3 21h18M8 8h2M8 12h2M8 16h2" />
    ),
  },
  {
    id: "hibrido",
    label: "Híbrido",
    icon: <path d="M4 8h13l-3-3M20 16H7l3 3" />,
  },
  {
    id: "remoto",
    label: "Remoto",
    icon: <path d="M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10" />,
  },
];

export function ModalitySelector({
  value,
  onChange,
  "aria-label": ariaLabel = "Modalidad de trabajo",
}: {
  value: WorkModality | null;
  onChange: (m: WorkModality) => void;
  "aria-label"?: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} style={{ display: "flex", gap: "8px" }}>
      {OPTS.map((o) => {
        const on = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.id)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "6px",
              padding: "12px 8px",
              borderRadius: "11px",
              cursor: "pointer",
              background: on ? "#0E5C4A" : "#F4F0E8",
              border: on ? "1.5px solid #0E5C4A" : "1.5px solid #E7E1D4",
              color: on ? "#FCFAF6" : "#79746B",
            }}
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {o.icon}
            </svg>
            <span style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: "13px" }}>
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
