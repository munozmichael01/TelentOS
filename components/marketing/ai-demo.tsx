"use client";

// Demo en vivo de la página AI Agents (port del mockup
// handoff/landing/TalentOS Landing V2 - AI Agents.dc.html): el agente
// «streamea» su salida palabra a palabra; el usuario elige tarea y tono.
// El copy (tareas, tonos y textos) llega por props desde el server component.
// Respeta prefers-reduced-motion mostrando el texto completo sin animación.

import { useEffect, useMemo, useState } from "react";
import { MIcon, type IconName } from "./icons";

const ARCHIVO = "'Archivo',sans-serif";
const MONO = "'Space Mono',monospace";

type Stream = { name: string; where: string; texts: Record<string, string> };

type AiDemoProps = {
  tasks: { key: string; label: string }[];
  tones: { key: string; label: string }[];
  streams: Record<string, Stream>;
  labels: {
    taskLabel: string;
    toneLabel: string;
    regenerate: string;
    generating: string;
    iaBadge: string;
    toneMeta: string; // «tono {tone} · sobre tus datos»
    use: string;
    discard: string;
    disclaimerPre: string;
    disclaimerAccent: string;
    disclaimerPost: string;
  };
};

const TASK_ICONS: Record<string, IconName> = { oferta: "pencil", cv: "search", canales: "chart" };

export function AiStreamDemo({ tasks, tones, streams, labels }: AiDemoProps) {
  const [task, setTask] = useState(tasks[0]?.key ?? "oferta");
  const [tone, setTone] = useState(tones[0]?.key ?? "directo");
  const [run, setRun] = useState(0);
  const [shown, setShown] = useState(0);

  const stream = streams[task];
  const full = stream?.texts[tone] ?? "";
  const words = useMemo(() => full.split(" "), [full]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(words.length);
      return;
    }
    setShown(0);
    const t = window.setInterval(() => {
      setShown((n) => {
        if (n + 1 >= words.length) {
          window.clearInterval(t);
          return words.length;
        }
        return n + 1;
      });
    }, 55);
    return () => window.clearInterval(t);
  }, [words, run]);

  const streaming = shown < words.length;
  const outputText = words.slice(0, shown).join(" ");
  const toneLabel = tones.find((t) => t.key === tone)?.label ?? tone;

  return (
    <div className="ld-mgrid" style={{ display: "grid", gridTemplateColumns: "0.85fr 1.15fr", gap: 20, alignItems: "stretch" }}>
      {/* controles */}
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", color: "#8C877E", marginBottom: 9 }}>{labels.taskLabel}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {tasks.map((t) => {
              const on = t.key === task;
              return (
                <button
                  key={t.key}
                  className="ld-tchip"
                  onClick={() => { setTask(t.key); }}
                  style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", cursor: "pointer", fontFamily: ARCHIVO, fontWeight: on ? 800 : 600, fontSize: 13.5, borderRadius: 11, padding: "10px 12px", border: `1.5px solid ${on ? "rgba(198,242,78,.5)" : "#38352E"}`, background: on ? "#26241F" : "#1A1A17", color: on ? "#F4F0E8" : "#B7B2A8" }}
                >
                  <span style={{ width: 24, height: 24, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: on ? "rgba(198,242,78,.16)" : "rgba(244,240,232,.06)", color: on ? "#C6F24E" : "#8C877E" }}>
                    <MIcon name={TASK_ICONS[t.key] ?? "pencil"} size={15} />
                  </span>
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", color: "#8C877E", marginBottom: 9 }}>{labels.toneLabel}</div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {tones.map((t) => {
              const on = t.key === tone;
              return (
                <button
                  key={t.key}
                  className="ld-tchip"
                  onClick={() => { setTone(t.key); }}
                  style={{ cursor: "pointer", fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 600, fontSize: 12.5, borderRadius: 999, padding: "7px 14px", border: `1.5px solid ${on ? "#C6F24E" : "#38352E"}`, background: on ? "rgba(198,242,78,.14)" : "#1A1A17", color: on ? "#C6F24E" : "#B7B2A8" }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
        <button
          onClick={() => setRun((r) => r + 1)}
          className="ld-hard"
          style={{ marginTop: 2, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: ARCHIVO, fontWeight: 800, fontSize: 14, color: "var(--ink)", background: "var(--lime)", border: "2px solid #000", borderRadius: 11, padding: "12px 18px", boxShadow: "3px 3px 0 #000", cursor: "pointer" }}
        >
          <MIcon name="refresh" size={15} />
          {labels.regenerate}
        </button>
        <div style={{ fontFamily: MONO, fontSize: 10, lineHeight: 1.6, color: "#8C877E", borderTop: "1px solid #38352E", paddingTop: 12 }}>
          {labels.disclaimerPre}
          <b style={{ color: "#C6F24E" }}>{labels.disclaimerAccent}</b>
          {labels.disclaimerPost}
        </div>
      </div>

      {/* salida del agente */}
      <div style={{ background: "var(--ink)", border: "1px solid #38352E", borderRadius: 16, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 17px", borderBottom: "1px solid #38352E" }}>
          <span style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(198,242,78,.14)", color: "var(--lime)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <MIcon name={TASK_ICONS[task] ?? "pencil"} size={17} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 14, color: "#F4F0E8" }}>{stream?.name}</div>
            <div style={{ fontFamily: MONO, fontSize: 9.5, color: "#8C877E" }}>{stream?.where}</div>
          </div>
          {streaming && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: MONO, fontSize: 9.5, color: "#C6F24E" }}>
              <span className="ld-cursor" style={{ width: 6, height: 6, borderRadius: "50%" }} />
              {labels.generating}
            </span>
          )}
        </div>
        <div style={{ flex: 1, padding: "18px 19px", fontSize: 14.5, lineHeight: 1.62, color: "#E4E0D8", minHeight: 200 }}>
          {outputText}
          {streaming && <span className="ld-cursor" />}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 17px", borderTop: "1px solid #38352E", flexWrap: "wrap" }}>
          <span style={{ fontFamily: MONO, fontSize: 9, color: "var(--lime)", background: "rgba(198,242,78,.12)", border: "1px solid rgba(198,242,78,.3)", borderRadius: 999, padding: "3px 9px" }}>{labels.iaBadge}</span>
          <span style={{ fontFamily: MONO, fontSize: 10, color: "#8C877E" }}>{labels.toneMeta.replace("{tone}", toneLabel)}</span>
          <span style={{ marginLeft: "auto", display: "flex", gap: 7 }}>
            <span style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 11, color: "var(--ink)", background: "var(--lime)", borderRadius: 8, padding: "6px 11px" }}>{labels.use}</span>
            <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 600, fontSize: 11, color: "#CFCAC0", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.14)", borderRadius: 8, padding: "6px 10px" }}>{labels.discard}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
