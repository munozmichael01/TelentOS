"use client";

// "El dato viaja" (mockup Landing V3): 4 etapas clicables (Oferta → Candidato
// → Empleado → Recibo) con la ficha de detalle que muestra qué campos se
// heredan, cuáles se calculan y cuáles son nuevos.

import { useState, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { MIcon, type IconName } from "./icons";

const ARCHIVO = "'Archivo',sans-serif";
const MONO = "'Space Mono',monospace";

type Field = { label: string; value: string; tag: string; type: "new" | "from" | "calc" };
type Stage = { kicker: string; title: string; chip: string; subtitle: string; fields: Field[] };

const STAGE_LOOK: { icon: IconName; bg: string; color: string }[] = [
  { icon: "send", bg: "#DCEFE4", color: "#0E5C4A" },
  { icon: "user", bg: "#F8E7C4", color: "#946312" },
  { icon: "idcard", bg: "#E7E0F2", color: "#5A4C86" },
  { icon: "receipt", bg: "#EAF7C4", color: "#46540F" },
];

function tagStyle(type: Field["type"]): CSSProperties {
  const base: CSSProperties = { fontFamily: MONO, fontSize: 9, fontWeight: 700, whiteSpace: "nowrap", borderRadius: 999, padding: "3px 8px" };
  if (type === "from") return { ...base, color: "#0E5C4A", background: "#DCEFE4", border: "1px solid #BEE0CE" };
  if (type === "calc") return { ...base, color: "#946312", background: "#F8E7C4", border: "1px solid #EBD4A0" };
  return { ...base, color: "#79746B", background: "#F4F0E8", border: "1px solid #E7E1D4" };
}

export function DataTravel() {
  const t = useTranslations("Landing.plataforma");
  const [stage, setStage] = useState(0);

  const stages = t.raw("stages") as Stage[];
  const sel = stages[stage] ?? stages[0];
  const selLook = STAGE_LOOK[stage] ?? STAGE_LOOK[0];

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 22, padding: "38px 32px 30px", boxShadow: "0 26px 54px -40px rgba(26,26,23,.5)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 26, flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 16 }}>{t("boardTitle")}</div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: MONO, fontSize: 11, color: "#46540F", background: "var(--limeSoft)", border: "1px solid #D6E89A", borderRadius: 999, padding: "5px 12px" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--lime)" }} />
          {t("boardBadge")}
        </div>
      </div>

      <div style={{ position: "relative" }}>
        <div className="ld-track" style={{ position: "absolute", top: 40, left: "6%", right: "6%", height: 3, borderRadius: 2, overflow: "visible" }} />
        <div className="ld-flowdot" style={{ position: "absolute", top: 35, left: "6%", width: 56, height: 13, borderRadius: 999, background: "linear-gradient(90deg,rgba(14,92,74,0),var(--brand))", boxShadow: "0 0 16px 3px rgba(14,92,74,.35)", ["--flow-x" as string]: "min(760px,80vw)" } as CSSProperties} />
        <div className="ld-mgrid" style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
          {stages.map((s, i) => {
            const look = STAGE_LOOK[i] ?? STAGE_LOOK[0];
            const active = i === stage;
            return (
              <div key={s.title} onClick={() => setStage(i)} style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", cursor: "pointer" }}>
                <span style={{ width: 82, height: 82, borderRadius: 20, background: look.bg, color: look.color, border: "2px solid var(--ink)", boxShadow: active ? "5px 5px 0 var(--ink)" : "3px 3px 0 var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", transform: active ? "translate(-1px,-1px)" : "translate(0,0)", transition: "all .15s ease" }}>
                  <MIcon name={look.icon} size={30} />
                </span>
                <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: ".8px", textTransform: "uppercase", color: "var(--soft)", marginTop: 14 }}>{s.kicker}</div>
                <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 17, letterSpacing: "-.3px", marginTop: 3 }}>{s.title}</div>
                <div style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 700, color: active ? "#fff" : look.color, background: active ? "var(--ink)" : look.bg, borderRadius: 999, padding: "4px 10px", marginTop: 9, transition: "all .15s ease" }}>{s.chip}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 26, borderTop: "1px dashed var(--line)", paddingTop: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <span style={{ width: 40, height: 40, borderRadius: 12, background: selLook.bg, color: selLook.color, border: "2px solid var(--ink)", boxShadow: "2px 2px 0 var(--ink)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <MIcon name={selLook.icon} size={17} />
          </span>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: ".8px", textTransform: "uppercase", color: "var(--soft)" }}>{t("detailKicker", { title: sel.title })}</div>
            <div style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 20, letterSpacing: "-.5px" }}>{sel.subtitle}</div>
          </div>
          <div style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 7, fontFamily: MONO, fontSize: 10.5, color: "#0E5C4A", background: "#DCEFE4", border: "1px solid #BEE0CE", borderRadius: 999, padding: "6px 12px" }}>
            <span className="ld-pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--brand)" }} />
            {t("inheritedBadge")}
          </div>
        </div>
        <div className="ld-mgrid" style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
          {sel.fields.map((f) => (
            <div key={f.label} style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: MONO, fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".5px", color: "var(--soft)", marginBottom: 3 }}>{f.label}</div>
                <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 15, letterSpacing: "-.2px" }}>{f.value}</div>
              </div>
              <span style={tagStyle(f.type)}>{f.tag}</span>
            </div>
          ))}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 10.5, color: "var(--soft)", marginTop: 14, textAlign: "center" }}>{t("foot")}</div>
      </div>
    </div>
  );
}
