/**
 * AgentBadge — la píldora de honestidad (design-system.md Anexo B-1).
 * Declara la procedencia de un resultado: IA (hubo LLM), heurística (fallback
 * determinista), estimación (dato mock). Invariante anti-patrón #7: `heuristica`
 * NUNCA se oculta — si no hubo LLM, se dice. D1: `ia` = brand, sin violeta.
 */

export type AgentProvenance = "ia" | "heuristica" | "estimacion";

const LABEL: Record<AgentProvenance, string> = {
  ia: "IA",
  heuristica: "Heurística",
  estimacion: "Estimación",
};

// dark = sobre panel oscuro (voz del agente); light = sobre papel
const STYLE: Record<AgentProvenance, { light: React.CSSProperties; dark: React.CSSProperties }> = {
  ia: {
    light: { background: "#DCEFE4", color: "#0E5C4A" },
    dark: { background: "rgba(198,242,78,.12)", color: "#C6F24E", border: "1px solid rgba(198,242,78,.3)" },
  },
  heuristica: {
    light: { background: "#F8E7C4", color: "#946312" },
    dark: { background: "rgba(224,162,60,.12)", color: "#E0A23C", border: "1px solid rgba(224,162,60,.3)" },
  },
  estimacion: {
    light: { background: "#F8F4EB", color: "#79746B" },
    dark: { background: "rgba(255,255,255,.06)", color: "#8C877E" },
  },
};

export function AgentBadge({ kind, onDark = false }: { kind: AgentProvenance; onDark?: boolean }) {
  return (
    <span
      style={{
        fontFamily: "'Space Mono', monospace",
        fontSize: "10.5px",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: ".5px",
        borderRadius: "999px",
        padding: "3px 10px",
        whiteSpace: "nowrap",
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        ...(onDark ? STYLE[kind].dark : STYLE[kind].light),
      }}
    >
      {LABEL[kind]}
    </span>
  );
}
