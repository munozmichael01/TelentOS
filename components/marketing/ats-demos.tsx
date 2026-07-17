"use client";

// Demos interactivas de la página de producto ATS (port del mockup
// handoff/landing/TalentOS Landing V2 - ATS.dc.html):
// - AtsPipeline: kanban del hero — pulsa un candidato para avanzarlo de fase.
// - AtsFitRows: filas de candidatos con desglose de fit expandible.
// Todo el copy llega por props desde el server component (namespace Ats).

import { useState } from "react";

const ARCHIVO = "'Archivo',sans-serif";
const MONO = "'Space Mono',monospace";

/* ───────────────────────── AtsPipeline ───────────────────────── */

type PipelineLabels = {
  jobTitle: string;
  jobMeta: string;
  stages: string[]; // 3 columnas
  fitPrefix: string;
  hiredLabel: string;
  hint: string;
  reset: string;
  hiredBanner: string;
};

// Datos de demo (nombres propios, no se traducen).
const CANDS = [
  { id: "ev", name: "Elena Vidal", fit: 82, fitColor: "#1B6B4F", fitBg: "#DCEFE3", s0: 0 },
  { id: "ro", name: "Rubén Ortega", fit: 61, fitColor: "#946312", fitBg: "#F8E7C4", s0: 0 },
  { id: "sm", name: "Sara Márquez", fit: 88, fitColor: "#1B6B4F", fitBg: "#DCEFE3", s0: 1 },
  { id: "tr", name: "Tomás Ruiz", fit: 91, fitColor: "#1B6B4F", fitBg: "#DCEFE3", s0: 2 },
];

export function AtsPipeline({ labels }: { labels: PipelineLabels }) {
  const [stages, setStages] = useState<Record<string, number>>(() =>
    Object.fromEntries(CANDS.map((c) => [c.id, c.s0]))
  );

  const advance = (id: string) =>
    setStages((s) => ({ ...s, [id]: Math.min((s[id] ?? 0) + 1, 3) }));
  const reset = () => setStages(Object.fromEntries(CANDS.map((c) => [c.id, c.s0])));
  const anyHired = CANDS.some((c) => (stages[c.id] ?? 0) >= 3);

  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 16, background: "var(--surface)", boxShadow: "0 40px 80px -48px rgba(26,26,23,.55)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid var(--line)", background: "#F8F4EB" }}>
        <div style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 15, letterSpacing: "-.3px" }}>{labels.jobTitle}</div>
        <span style={{ fontFamily: MONO, fontSize: 10, color: "var(--soft)" }}>{labels.jobMeta}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: 14 }}>
        {labels.stages.map((stageName, i) => {
          const cards = CANDS.filter((c) => (i < 2 ? stages[c.id] === i : (stages[c.id] ?? 0) >= 2));
          return (
            <div key={stageName} style={{ background: "#F8F4EB", border: "1px solid var(--line)", borderRadius: 11, padding: 9, minHeight: 132 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: MONO, fontSize: 8.5, textTransform: "uppercase", letterSpacing: ".5px", color: "var(--soft)", marginBottom: 8 }}>
                {stageName}
                <span style={{ opacity: 0.55 }}>{cards.length}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {cards.map((c) => {
                  const hired = (stages[c.id] ?? 0) >= 3;
                  return (
                    <button
                      key={c.id}
                      onClick={() => advance(c.id)}
                      className="ld-kan ld-pop"
                      style={{ textAlign: "left", fontFamily: "inherit", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 9, padding: 8, width: "100%" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 5 }}>
                        <span style={{ fontWeight: 700, fontSize: 11, color: "var(--ink)" }}>{c.name}</span>
                      </div>
                      <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: c.fitColor, background: c.fitBg, borderRadius: 5, padding: "2px 6px" }}>
                        {hired ? labels.hiredLabel : `${labels.fitPrefix}${c.fit}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "0 14px 12px" }}>
        <span style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--soft)" }}>{labels.hint}</span>
        <button onClick={reset} style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 9.5, fontWeight: 700, color: "var(--accent)", cursor: "pointer", background: "transparent", border: "none", padding: 0 }}>
          {labels.reset}
        </button>
      </div>
      {anyHired && (
        <div className="ld-pop" style={{ margin: "0 14px 14px", display: "flex", alignItems: "center", gap: 9, background: "var(--brandSoft)", border: "1px solid #BFE0CF", borderRadius: 10, padding: "9px 12px" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12l5 5 9-11" stroke="#0E5C4A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: "#0A4638" }}>{labels.hiredBanner}</span>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── AtsFitRows ───────────────────────── */

type FitRowLabels = {
  breakdownLabel: string;
  rows: { stage: string; breakdown: string[] }[];
};

const FIT_ROWS = [
  { id: "sm", ini: "SM", name: "Sara Márquez", fit: 88, fitColor: "#1B6B4F", brk: [92, 85, 80] },
  { id: "ev", ini: "EV", name: "Elena Vidal", fit: 82, fitColor: "#1B6B4F", brk: [88, 78, 80] },
  { id: "ro", ini: "RO", name: "Rubén Ortega", fit: 61, fitColor: "#946312", brk: [70, 55, 58] },
];

export function AtsFitRows({ labels }: { labels: FitRowLabels }) {
  const [open, setOpen] = useState<string | null>("sm");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      {FIT_ROWS.map((r, i) => {
        const row = labels.rows[i];
        const isOpen = open === r.id;
        return (
          <div
            key={r.id}
            className="ld-fitrow"
            onClick={() => setOpen((o) => (o === r.id ? null : r.id))}
            style={{ background: "#F8F4EB", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
              <span style={{ width: 34, height: 34, borderRadius: 10, background: "#EAE4D6", color: "#5A564E", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ARCHIVO, fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{r.ini}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{r.name}</div>
                <div style={{ fontFamily: MONO, fontSize: 10, color: "var(--soft)" }}>{row?.stage}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 52, height: 6, borderRadius: 999, background: "#E7E1D4", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${r.fit}%`, background: r.fitColor }} />
                </div>
                <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, minWidth: 24 }}>{r.fit}</span>
                <span style={{ fontFamily: MONO, fontSize: 11, color: "var(--soft)", width: 12 }}>{isOpen ? "▾" : "▸"}</span>
              </div>
            </div>
            {isOpen && (
              <div className="ld-pop" style={{ marginTop: 11, paddingTop: 11, borderTop: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontFamily: MONO, fontSize: 9, textTransform: "uppercase", letterSpacing: ".5px", color: "var(--soft)" }}>{labels.breakdownLabel}</div>
                {r.brk.map((pct, j) => (
                  <div key={j} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, color: "#54504A", minWidth: 112 }}>{row?.breakdown[j]}</span>
                    <div style={{ flex: 1, height: 6, borderRadius: 999, background: "#E7E1D4", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: "var(--brand)" }} />
                    </div>
                    <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, minWidth: 34, textAlign: "right" }}>{pct}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
