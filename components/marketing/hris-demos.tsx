"use client";

// Demos interactivas de la página de producto HRIS (port del mockup
// handoff/landing/TalentOS Landing V2 - HRIS.dc.html):
// - HrisDirectory: directorio del hero — pulsa una persona para abrir su ficha.
// - HrisOrgNode: nodo de organigrama plegable (card de directorio/organigrama).
// Copy por props desde el server component (namespace Hris).

import { useState } from "react";

const ARCHIVO = "'Archivo',sans-serif";
const MONO = "'Space Mono',monospace";

/* ───────────────────────── HrisDirectory ───────────────────────── */

type Person = { role: string; tag: string; fields: { g: string; v: string }[] };

type DirectoryLabels = {
  header: string;
  meta: string;
  hint: string;
  back: string;
  note: string;
  people: Person[]; // mismo orden que PEOPLE_LOOK
};

// Aspecto de cada persona (nombres propios y colores: no se traducen).
const PEOPLE_LOOK = [
  { id: "im", ini: "IM", name: "Isabel Moreno", avBg: "#0E5C4A", avColor: "#C6F24E", tagColor: "#1B6B4F", tagBg: "#DCEFE3" },
  { id: "cr", ini: "CR", name: "Carla Ruiz", avBg: "#EAE4D6", avColor: "#5A564E", tagColor: "#946312", tagBg: "#F8E7C4" },
  { id: "ds", ini: "DS", name: "Diego Salas", avBg: "#EAE4D6", avColor: "#5A564E", tagColor: "#79746B", tagBg: "#EEE9DD" },
  { id: "nv", ini: "NV", name: "Nora Vidal", avBg: "#EAE4D6", avColor: "#5A564E", tagColor: "#79746B", tagBg: "#EEE9DD" },
];

export function HrisDirectory({ labels }: { labels: DirectoryLabels }) {
  const [sel, setSel] = useState<number | null>(null);
  const look = sel === null ? null : PEOPLE_LOOK[sel];
  const person = sel === null ? null : labels.people[sel];

  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 16, background: "var(--surface)", boxShadow: "0 40px 80px -48px rgba(26,26,23,.55)", overflow: "hidden" }}>
      {sel === null || !look || !person ? (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid var(--line)", background: "#F8F4EB" }}>
            <div style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 15, letterSpacing: "-.3px" }}>{labels.header}</div>
            <span style={{ fontFamily: MONO, fontSize: 10, color: "var(--soft)" }}>{labels.meta}</span>
          </div>
          <div style={{ padding: "6px 16px 12px" }}>
            {PEOPLE_LOOK.map((p, i) => {
              const data = labels.people[i];
              return (
                <button
                  key={p.id}
                  className="ld-hrrow"
                  onClick={() => setSel(i)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 8px", margin: "0 -8px", width: "calc(100% + 16px)", borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "1px solid var(--line)", borderRadius: 8, background: "transparent", textAlign: "left", fontFamily: "inherit" }}
                >
                  <span style={{ width: 32, height: 32, borderRadius: 9, background: p.avBg, color: p.avColor, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ARCHIVO, fontWeight: 800, fontSize: 11, flexShrink: 0 }}>{p.ini}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)" }}>{p.name}</div>
                    <div style={{ fontFamily: MONO, fontSize: 10, color: "var(--soft)" }}>{data?.role}</div>
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 9, textTransform: "uppercase", letterSpacing: ".5px", borderRadius: 999, padding: "3px 9px", color: p.tagColor, background: p.tagBg }}>{data?.tag}</span>
                  <span style={{ fontFamily: MONO, fontSize: 12, color: "var(--soft)" }}>›</span>
                </button>
              );
            })}
            <div style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--soft)", marginTop: 11 }}>{labels.hint}</div>
          </div>
        </>
      ) : (
        <div className="ld-pop">
          <button
            onClick={() => setSel(null)}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "13px 16px", borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "1px solid var(--line)", background: "#F8F4EB", cursor: "pointer", fontFamily: MONO, fontSize: 11, fontWeight: 700, color: "var(--brand)", width: "100%", textAlign: "left" }}
          >
            {labels.back}
          </button>
          <div style={{ padding: "18px 18px 6px", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 46, height: 46, borderRadius: 13, background: look.avBg, color: look.avColor, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ARCHIVO, fontWeight: 900, fontSize: 15 }}>{look.ini}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 17, letterSpacing: "-.3px" }}>{look.name}</div>
              <div style={{ fontSize: 12.5, color: "var(--soft)" }}>{person.role}</div>
            </div>
            <span style={{ fontFamily: MONO, fontSize: 9, textTransform: "uppercase", letterSpacing: ".5px", borderRadius: 999, padding: "3px 9px", color: look.tagColor, background: look.tagBg }}>{person.tag}</span>
          </div>
          <div style={{ padding: "12px 16px 4px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
            {person.fields.map((f) => (
              <div key={f.g} style={{ background: "#F8F4EB", border: "1px solid var(--line)", borderRadius: 11, padding: "11px 12px" }}>
                <div style={{ fontFamily: MONO, fontSize: 8.5, textTransform: "uppercase", letterSpacing: ".5px", color: "var(--brand)", marginBottom: 6 }}>{f.g}</div>
                <div style={{ fontSize: 11.5, color: "#54504A", lineHeight: 1.4 }}>{f.v}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px 16px", fontFamily: MONO, fontSize: 10, color: "var(--soft)" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 12l5 5 9-11" stroke="#0E5C4A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {labels.note}
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── HrisOrgNode ───────────────────────── */

type OrgLabels = {
  rootMeta: string; // «Head of Product · 2 reportes»
  reports: { role: string }[];
};

const ORG_ROOT = { ini: "CR", name: "Carla Ruiz" };
const ORG_REPORTS = [
  { ini: "IM", name: "Isabel Moreno" },
  { ini: "DS", name: "Diego Salas" },
];

export function HrisOrgNode({ labels }: { labels: OrgLabels }) {
  const [open, setOpen] = useState(true);

  return (
    <>
      <button
        className="ld-orgnode"
        onClick={() => setOpen((o) => !o)}
        style={{ display: "flex", alignItems: "center", gap: 10, background: "#F8F4EB", border: "1px solid var(--line)", borderRadius: 10, padding: "9px 11px", width: "100%", textAlign: "left", fontFamily: "inherit" }}
      >
        <span style={{ width: 30, height: 30, borderRadius: 9, background: "#E7E0F2", color: "#5A4C86", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ARCHIVO, fontWeight: 800, fontSize: 10.5 }}>{ORG_ROOT.ini}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)" }}>{ORG_ROOT.name}</div>
          <div style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--soft)" }}>{labels.rootMeta}</div>
        </div>
        <span style={{ fontFamily: MONO, fontSize: 12, color: "var(--soft)" }}>{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="ld-pop" style={{ margin: "6px 0 0 15px", borderLeft: "2px solid var(--line)", paddingLeft: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          {ORG_REPORTS.map((r, i) => (
            <div key={r.ini} style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: "8px 11px" }}>
              <span style={{ width: 27, height: 27, borderRadius: 8, background: "#EAE4D6", color: "#5A564E", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ARCHIVO, fontWeight: 800, fontSize: 10 }}>{r.ini}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 12.5 }}>{r.name}</div>
                <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--soft)" }}>{labels.reports[i]?.role}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
