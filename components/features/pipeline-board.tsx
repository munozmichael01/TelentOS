"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { FitBadge } from "@/components/fit-badge";
import { initials } from "@/lib/utils";
import type { Application, JobStage } from "@/lib/types";

const STAGE_DOT: Record<string, string> = {
  "Aplicado":   "#9C9588",
  "Screening":  "#E0A23C",
  "Entrevista": "#3B7FC4",
  "Oferta":     "#F1543F",
  "Contratado": "#0E5C4A",
  "Descartado": "#BD4332",
};

const DISCARD_REASONS = [
  "No encaja con el perfil",
  "Experiencia insuficiente",
  "Expectativas salariales fuera de rango",
  "Retiró su candidatura",
  "Posición cubierta por otro candidato",
  "Proceso pausado / cancelado",
  "Otro",
];

const AVATAR_PALETTES = [
  { bg: "#DCEFE4", color: "#0E5C4A" },
  { bg: "#F6D9D2", color: "#BD4332" },
  { bg: "#E7E0F2", color: "#5A4C86" },
  { bg: "#F8E7C4", color: "#946312" },
  { bg: "#D6E4F2", color: "#2B5E8A" },
  { bg: "#E9F0D2", color: "#52610F" },
];

function avatarPalette(name: string) {
  const code = name.charCodeAt(0) + (name.charCodeAt(1) || 0);
  return AVATAR_PALETTES[code % AVATAR_PALETTES.length];
}

export function PipelineBoard({
  stages,
  applications,
}: {
  stages: JobStage[];
  applications: Application[];
}) {
  const router = useRouter();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [moving, setMoving] = useState<{ app: Application; stage: JobStage } | null>(null);
  const [reasonCode, setReasonCode] = useState("");
  const [reasonNote, setReasonNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isDiscard = moving?.stage.name === "Descartado";
  const canConfirm = !!moving && (!isDiscard || !!reasonCode);

  async function confirmMove() {
    if (!moving || !canConfirm) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/applications/${moving.app.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage_id: moving.stage.id,
          reason: reasonCode || reasonNote || undefined,
          reason_code: reasonCode || undefined,
          reason_note: reasonNote || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al mover");
      closeDialog();
      router.refresh();
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setSaving(false);
    }
  }

  function closeDialog() {
    setMoving(null);
    setReasonCode("");
    setReasonNote("");
    setError("");
  }

  function handleDrop(stage: JobStage) {
    if (!draggingId) return;
    const app = applications.find((a) => a.id === draggingId);
    if (!app || app.stage_id === stage.id) {
      setDraggingId(null);
      setOverCol(null);
      return;
    }
    setMoving({ app, stage });
    setDraggingId(null);
    setOverCol(null);
  }

  function handleAutoScroll(e: React.DragEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const edge = 90;
    if (e.clientX > rect.right - edge) el.scrollLeft += 22;
    else if (e.clientX < rect.left + edge) el.scrollLeft -= 22;
  }

  return (
    <>
      <div
        style={{ fontSize: "11px", fontFamily: "'Space Mono',monospace", color: "#79746B", marginBottom: "10px" }}
      >
        ↔ Arrastra las tarjetas · clic para abrir la ficha
      </div>

      <div
        onDragOver={handleAutoScroll}
        style={{ display: "flex", gap: "14px", overflowX: "auto", paddingBottom: "10px", scrollBehavior: "smooth", touchAction: "pan-x" }}
      >
        {stages.map((stage) => {
          const apps = applications.filter((a) => a.stage_id === stage.id);
          const isOver = overCol === stage.id;
          const dot = STAGE_DOT[stage.name] ?? "#9C9588";

          return (
            <div
              key={stage.id}
              onDragOver={(e) => { e.preventDefault(); if (overCol !== stage.id) setOverCol(stage.id); }}
              onDragLeave={() => { if (overCol === stage.id) setOverCol(null); }}
              onDrop={(e) => { e.preventDefault(); handleDrop(stage); }}
              style={{
                width: "228px",
                flexShrink: 0,
                background: "#F8F4EB",
                border: `2px solid ${isOver ? "#0E5C4A" : "transparent"}`,
                borderRadius: "14px",
                padding: "10px",
                transition: "border-color .12s ease",
              }}
            >
              {/* column header */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 6px 10px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "3px", background: dot, flexShrink: 0 }} />
                <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13.5px", letterSpacing: "-.2px" }}>
                  {stage.name}
                </span>
                <span style={{ marginLeft: "auto", fontFamily: "'Space Mono',monospace", fontSize: "11px", color: "#79746B", background: "#F4F0E8", border: "1px solid #E7E1D4", borderRadius: "999px", padding: "1px 8px" }}>
                  {apps.length}
                </span>
              </div>

              {/* cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: "9px", minHeight: "50px" }}>
                {apps.map((app) => {
                  const name = app.candidates?.name ?? "?";
                  const av = avatarPalette(name);
                  const isTop = (app.fit_score ?? 0) >= 85;
                  const source = app.utm?.utm_source === "career_site" ? "career site" : app.utm?.utm_source || app.source;

                  return (
                    <div
                      key={app.id}
                      draggable
                      onDragStart={() => setDraggingId(app.id)}
                      onDragEnd={() => { setDraggingId(null); setOverCol(null); }}
                      style={{
                        background: "#FCFAF6",
                        border: "1px solid #E7E1D4",
                        borderRadius: "12px",
                        padding: "11px 12px",
                        cursor: "grab",
                        boxShadow: "0 1px 0 rgba(26,26,23,.04)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                        <span style={{ width: "30px", height: "30px", flexShrink: 0, borderRadius: "50%", background: av.bg, color: av.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 800 }}>
                          {initials(name)}
                        </span>
                        <Link
                          href={`/app/applications/${app.id}`}
                          style={{ flex: 1, minWidth: 0, fontSize: "13.5px", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "inherit", textDecoration: "none" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {name}
                        </Link>
                        <FitBadge score={app.fit_score} />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "7px", marginTop: "9px" }}>
                        <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: "#79746B" }}>
                          {source}
                        </span>
                        {isTop && (
                          <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "10.5px", fontWeight: 700, background: "#EAF7C4", color: "#46540F", border: "1px solid #D6E89A", borderRadius: "999px", padding: "2px 7px 2px 5px" }}>
                            <span style={{ display: "inline-flex", width: "13px", height: "13px", borderRadius: "50%", background: "#C6F24E", alignItems: "center", justifyContent: "center" }}>
                              <svg width="7" height="7" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.2l2.3 2.3 4.7-5" stroke="#46540F" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </span>
                            Top fit
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Move dialog ── */}
      {moving && (
        <div
          onClick={closeDialog}
          style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(26,26,23,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: "448px", maxHeight: "88vh", overflowY: "auto", background: "#FCFAF6", border: "1.5px solid #1A1A17", borderRadius: "18px", boxShadow: "6px 6px 0 #1A1A17" }}
          >
            {/* title */}
            <div style={{ padding: "22px 24px 0" }}>
              <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "20px", letterSpacing: "-.5px" }}>
                Mover a {moving.app.candidates?.name}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "9px", marginTop: "12px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, borderRadius: "999px", padding: "4px 11px", background: "#F8F4EB", color: "#54504A", border: "1px solid #E7E1D4" }}>
                  {stages.find((s) => s.id === moving.app.stage_id)?.name ?? "—"}
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#79746B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span style={{ fontSize: "12px", fontWeight: 700, borderRadius: "999px", padding: "4px 11px", background: isDiscard ? "#F6D9D2" : "#DCEFE3", color: isDiscard ? "#BD4332" : "#1B6B4F" }}>
                  {moving.stage.name}
                </span>
              </div>
            </div>

            {/* body */}
            <div style={{ padding: "18px 24px 0" }}>
              {isDiscard && (
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", textTransform: "uppercase", letterSpacing: ".5px", color: "#79746B", marginBottom: "9px" }}>
                    Motivo del descarte · obligatorio
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                    {DISCARD_REASONS.map((r) => {
                      const on = reasonCode === r;
                      return (
                        <div
                          key={r}
                          onClick={() => setReasonCode(on ? "" : r)}
                          style={{
                            fontSize: "13px",
                            fontWeight: 600,
                            padding: "9px 13px",
                            borderRadius: "11px",
                            cursor: "pointer",
                            border: `1.5px solid ${on ? "#0E5C4A" : "#E7E1D4"}`,
                            background: on ? "#DCEFE4" : "#F4F0E8",
                            color: on ? "#0E5C4A" : "#1A1A17",
                            transition: "all .12s ease",
                          }}
                        >
                          {r}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", textTransform: "uppercase", letterSpacing: ".5px", color: "#79746B", marginBottom: "9px" }}>
                {isDiscard ? "Nota adicional (opcional)" : "Nota (opcional)"}
              </div>
              <textarea
                value={reasonNote}
                onChange={(e) => setReasonNote(e.target.value)}
                placeholder="Contexto adicional para el historial…"
                style={{ width: "100%", resize: "none", height: "58px", fontFamily: "'Hanken Grotesk',sans-serif", fontSize: "13.5px", color: "#1A1A17", background: "#F4F0E8", border: "1.5px solid #E7E1D4", borderRadius: "11px", padding: "10px 12px", outline: "none" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#0E5C4A"; e.currentTarget.style.boxShadow = "0 0 0 3px #DCEFE4"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#E7E1D4"; e.currentTarget.style.boxShadow = "none"; }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: "7px", marginTop: "12px", fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: "#79746B" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/><path d="M12 8v5M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                Se registrará con tu usuario y la fecha en el historial.
              </div>
              {error && <p style={{ fontSize: "13px", color: "#BD4332", marginTop: "10px" }}>{error}</p>}
            </div>

            {/* footer */}
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", padding: "18px 24px 22px" }}>
              <button
                onClick={closeDialog}
                style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 600, fontSize: "13px", color: "#79746B", background: "transparent", border: "none", padding: "10px 14px", cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmMove}
                disabled={!canConfirm || saving}
                style={{
                  fontFamily: "'Archivo',sans-serif",
                  fontWeight: 800,
                  fontSize: "13px",
                  color: "#fff",
                  background: canConfirm ? "#0E5C4A" : "#C2B8A4",
                  border: "2px solid #1A1A17",
                  borderRadius: "11px",
                  padding: "10px 20px",
                  boxShadow: canConfirm ? "3px 3px 0 #1A1A17" : "none",
                  cursor: canConfirm ? "pointer" : "not-allowed",
                  opacity: canConfirm ? 1 : 0.7,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
