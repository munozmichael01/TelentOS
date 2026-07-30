/**
 * SkillChips — lista de skills/competencias como pastillas (DS §3.1).
 *
 * Existe porque el patrón estaba inlineado en cinco sitios distintos con estilos que ya habían
 * empezado a divergir (job-form, apply-wizard, offer-detail-panel, account-client,
 * cv-profile-fields). Aquí vive una sola vez; los consumidores componen.
 *
 * - tone="core"  → competencia esperada del puesto: borde y texto de marca sobre brand-soft.
 * - tone="soft"  → deseable / complementaria: neutra sobre superficie.
 * Sin `translateY` ni sombras: no son elementos accionables.
 */
const TONES = {
  core: { background: "#E4F0EA", color: "#0E5C4A", border: "1px solid #0E5C4A" },
  soft: { background: "#F8F4EB", color: "#54504A", border: "1px solid #E7E1D4" },
} as const;

export function SkillChips({
  items,
  tone = "soft",
  emptyLabel,
}: {
  items: string[];
  tone?: keyof typeof TONES;
  /** Texto cuando no hay nada que mostrar. Si se omite, no se renderiza nada. */
  emptyLabel?: string;
}) {
  if (!items.length) {
    return emptyLabel ? <div style={{ fontSize: "13px", color: "#79746B" }}>{emptyLabel}</div> : null;
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
      {items.map((s) => (
        <span
          key={s}
          style={{
            display: "inline-flex", alignItems: "center", fontSize: "12.5px", fontWeight: 600,
            borderRadius: "999px", padding: "5px 10px", ...TONES[tone],
          }}
        >
          {s}
        </span>
      ))}
    </div>
  );
}
