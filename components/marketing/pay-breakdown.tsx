"use client";

// Desglose interactivo de nómina por país (mockup Landing V2 · Nómina, módulo
// "Motor de cálculo"): chips de país que cambian retenciones, neto y nota.
// Copy en Nomina.motor.breakdown; banderas SVG del DS (nunca emoji).

import { useState } from "react";
import { useTranslations } from "next-intl";

import { PackIcon } from "@/components/ui/pack-icons";
import { MIcon } from "./icons";

const ARCHIVO = "'Archivo',sans-serif";
const MONO = "'Space Mono',monospace";

type Country = {
  key: string;
  kind: "active" | "preview" | "soon";
  label: string;
  status: string;
  deductions: { label: string; amount: string }[];
  net: string;
  note: string;
};

const KIND_LOOK: Record<Country["kind"], { color: string; bg: string }> = {
  active: { color: "#1B6B4F", bg: "#DCEFE3" },
  preview: { color: "#946312", bg: "#F8E7C4" },
  soon: { color: "#79746B", bg: "#EEE9DD" },
};

const rowStyle: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--line)", fontSize: 13,
};

export function PayBreakdown() {
  const t = useTranslations("Nomina.motor.breakdown");
  const countries = t.raw("countries") as Country[];
  const [activeKey, setActiveKey] = useState(countries[0]?.key ?? "generic");
  const country = countries.find((c) => c.key === activeKey) ?? countries[0];
  const look = KIND_LOOK[country.kind] ?? KIND_LOOK.active;

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 22, boxShadow: "0 24px 50px -34px rgba(26,26,23,.4)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ fontFamily: MONO, fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".8px", color: "var(--soft)" }}>{t("kicker")}</div>
        <span key={`st-${country.key}`} className="ld-pop" style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", color: look.color, background: look.bg, borderRadius: 999, padding: "3px 9px" }}>{country.status}</span>
      </div>

      {/* Chips de país */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {countries.map((c) => {
          const on = c.key === activeKey;
          return (
            <button
              key={c.key}
              className="ld-ctychip"
              onClick={() => setActiveKey(c.key)}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: ARCHIVO, fontWeight: on ? 800 : 600, fontSize: 11.5, borderRadius: 999, padding: "5px 11px", border: `1.5px solid ${on ? "#1A1A17" : "#E7E1D4"}`, background: on ? "#1A1A17" : "#FCFAF6", color: on ? "#fff" : "#79746B" }}
            >
              {c.key === "generic" ? <MIcon name="globe" size={13} /> : <PackIcon code={c.key} />}
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Devengos fijos */}
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        <div style={rowStyle}><span style={{ color: "#54504A" }}>{t("baseLabel")}</span><span style={{ fontFamily: MONO, fontWeight: 700 }}>{t("baseAmount")}</span></div>
        <div style={rowStyle}><span style={{ color: "#54504A" }}>{t("plusLabel")}</span><span style={{ fontFamily: MONO, fontWeight: 700 }}>{t("plusAmount")}</span></div>
        <div style={rowStyle}>
          <span style={{ color: "#54504A" }}>
            {t("otLabel")}{" "}
            <span style={{ fontFamily: MONO, fontSize: 9, color: "var(--brand)", background: "var(--brandSoft)", borderRadius: 5, padding: "1px 6px" }}>{t("otBadge")}</span>
          </span>
          <span style={{ fontFamily: MONO, fontWeight: 700, color: "var(--brand)" }}>{t("otAmount")}</span>
        </div>
        <div style={rowStyle}><span style={{ color: "#54504A" }}>{t("absLabel")}</span><span style={{ fontFamily: MONO, fontWeight: 700, color: "var(--accent)" }}>{t("absAmount")}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0" }}>
          <span style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 14 }}>{t("grossLabel")}</span>
          <span style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 16, letterSpacing: "-.3px" }}>{t("grossAmount")}</span>
        </div>
      </div>

      {/* Retenciones del pack seleccionado */}
      {country.deductions.length > 0 && (
        <div key={`ded-${country.key}`} className="ld-pop" style={{ background: "#F8F4EB", border: "1px solid var(--line)", borderRadius: 12, padding: "11px 13px", marginBottom: 4 }}>
          <div style={{ fontFamily: MONO, fontSize: 8.5, textTransform: "uppercase", letterSpacing: ".5px", color: "var(--soft)", marginBottom: 7 }}>{t("dedLabel")} · {country.label}</div>
          {country.deductions.map((d) => (
            <div key={d.label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 12.5 }}>
              <span style={{ color: "#54504A" }}>{d.label}</span>
              <span style={{ fontFamily: MONO, fontWeight: 700, color: "var(--accent)" }}>{d.amount}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 13px", marginTop: 8, background: "var(--ink)", color: "#F4F0E8", borderRadius: 12 }}>
        <span style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 14 }}>{t("netLabel")}</span>
        <span key={`net-${country.key}`} className="ld-pop" style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 19, letterSpacing: "-.4px", color: "var(--lime)" }}>{country.net}</span>
      </div>
      <div style={{ marginTop: 12, fontFamily: MONO, fontSize: 9.5, color: "var(--soft)", borderTop: "1px solid var(--line)", paddingTop: 11, lineHeight: 1.5 }}>{country.note}</div>
    </div>
  );
}
