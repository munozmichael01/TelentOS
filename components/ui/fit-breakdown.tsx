/**
 * FitBreakdown — desglose determinista del fit (design-system §4.5b).
 * Reemplaza las barras subjetivas 0–10 inventadas por el LLM. El número y su
 * reparto salen de lib/fit-score.ts (vía explainFitScore): 60% skills · 25%
 * experiencia · 15% ubicación, con matched/missing explícitos. Es HECHO, no
 * juicio → sin AgentBadge. Vive en el panel oscuro (voz del agente).
 */

import type { FitExplanation } from "@/lib/fit-explain";

const LOCATION_VERDICT: Record<FitExplanation["location"]["verdict"], string> = {
  remota: "Remota",
  exacta: "Ubicación exacta",
  "mismo-pais": "Mismo país",
  "pais-distinto": "País distinto",
  "texto-coincide": "Coincide",
  "texto-no-coincide": "No coincide",
  "sin-datos": "Sin datos",
};

function Axis({ label, points, weight, detail }: { label: string; points: number; weight: number; detail?: string }) {
  const pct = Math.round((points / weight) * 100);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: "12.5px", marginBottom: "5px" }}>
        <span style={{ color: "#E4E0D7" }}>
          {label}
          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", color: "#8C877E", marginLeft: "6px" }}>{weight}%</span>
        </span>
        <span style={{ fontFamily: "'Space Mono',monospace", fontWeight: 700, color: "#C6F24E" }}>
          {points}<span style={{ color: "#8C877E" }}>/{weight}</span>
        </span>
      </div>
      <div style={{ height: "7px", borderRadius: "99px", background: "#38352E", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "#C6F24E", transition: "width .4s ease" }} />
      </div>
      {detail && (
        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", color: "#8C877E", marginTop: "5px" }}>{detail}</div>
      )}
    </div>
  );
}

function SkillChip({ name, missing }: { name: string; missing?: boolean }) {
  return (
    <span
      style={{
        fontSize: "11px",
        fontWeight: 600,
        borderRadius: "999px",
        padding: "3px 9px",
        whiteSpace: "nowrap",
        ...(missing
          ? { background: "rgba(241,84,63,.13)", color: "#F0857D", textDecoration: "line-through" }
          : { background: "rgba(127,209,168,.15)", color: "#8FE0A8" }),
      }}
    >
      {name}
    </span>
  );
}

export function FitBreakdown({ breakdown }: { breakdown: FitExplanation }) {
  const { score, skills, experience, location } = breakdown;
  const hasSkillChips = skills.matched.length > 0 || skills.missing.length > 0;

  return (
    <div style={{ background: "#26241F", border: "1px solid #38352E", borderRadius: "13px", padding: "16px 18px", display: "flex", flexDirection: "column", gap: "13px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", textTransform: "uppercase", letterSpacing: ".5px", color: "#8C877E" }}>
          Desglose de fit
        </span>
        <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", color: "#8C877E" }}>determinista</span>
      </div>

      <Axis
        label="Skills"
        points={skills.points}
        weight={60}
        detail={
          skills.mode === "sin-requisitos"
            ? "La oferta no define skills"
            : skills.mode === "texto"
            ? "Comparación por texto (skills sin catalogar)"
            : undefined
        }
      />

      {hasSkillChips && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "-4px" }}>
          {skills.matched.map((s) => <SkillChip key={`m-${s}`} name={s} />)}
          {skills.missing.map((s) => <SkillChip key={`x-${s}`} name={s} missing />)}
        </div>
      )}

      <Axis
        label="Experiencia"
        points={experience.points}
        weight={25}
        detail={`${experience.actualYears} año${experience.actualYears === 1 ? "" : "s"} · mínimo ${experience.requiredYears}`}
      />

      <Axis
        label="Ubicación"
        points={location.points}
        weight={15}
        detail={LOCATION_VERDICT[location.verdict]}
      />

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", borderTop: "1px solid #38352E", paddingTop: "11px" }}>
        <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13px", color: "#F4F0E8" }}>Fit total</span>
        <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "20px", letterSpacing: "-.5px", color: "#C6F24E" }}>
          {score}<span style={{ fontSize: "12px", color: "#8C877E" }}>/100</span>
        </span>
      </div>
    </div>
  );
}
