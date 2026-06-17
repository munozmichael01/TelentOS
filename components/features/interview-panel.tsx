"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Star } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import type { EvaluationTemplate, Interview, JobStage } from "@/lib/types";

type InterviewWithFeedback = Interview & {
  interview_feedback?: { id: string; overall: number; comments: string | null; author_email: string | null; ratings: Record<string, number> }[];
};

const IV_TYPES = ["Screening", "Entrevista técnica", "Cultural fit", "Entrevista final"];
const IV_DURATIONS = ["30 min", "45 min", "60 min", "90 min"];

type SchedulerMode = "list" | "manual" | "availability" | "sent";

const chipStyle = (on: boolean) => ({
  fontFamily: on ? "'Archivo',sans-serif" : "'Hanken Grotesk',sans-serif",
  fontWeight: on ? 700 : 600,
  fontSize: "13px",
  color: on ? "#fff" : "#79746B",
  background: on ? "#1A1A17" : "transparent",
  borderRadius: "8px",
  padding: "7px 15px",
  cursor: "pointer",
  border: "none",
  whiteSpace: "nowrap" as const,
});

const selChip = (on: boolean) => ({
  fontSize: "12.5px",
  fontWeight: on ? 700 : 600,
  color: on ? "#0E5C4A" : "#54504A",
  background: on ? "#DCEFE4" : "#F8F4EB",
  border: `1px solid ${on ? "#A8D9BC" : "#E7E1D4"}`,
  borderRadius: "999px",
  padding: "6px 12px",
  cursor: "pointer",
  transition: "all .1s ease",
  whiteSpace: "nowrap" as const,
});

const fieldLabel = {
  fontFamily: "'Space Mono',monospace",
  fontSize: "10.5px",
  textTransform: "uppercase" as const,
  letterSpacing: ".5px",
  color: "#79746B",
};

const fieldInput = {
  fontFamily: "'Hanken Grotesk',sans-serif",
  fontSize: "13.5px",
  color: "#1A1A17",
  background: "#F4F0E8",
  border: "1.5px solid #E7E1D4",
  borderRadius: "10px",
  padding: "10px 12px",
  outline: "none",
  width: "100%",
} as const;

function generateSlots() {
  const slots: string[] = [];
  const now = new Date();
  for (let d = 1; d <= 5; d++) {
    const day = new Date(now);
    day.setDate(now.getDate() + d);
    if (day.getDay() === 0 || day.getDay() === 6) continue;
    const label = day.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
    ["10:00", "11:30", "16:00", "17:30"].forEach((t) => slots.push(`${label} · ${t}`));
  }
  return slots.slice(0, 8);
}

const IV_SLOTS = generateSlots();

export function InterviewPanel({
  applicationId,
  interviews,
  templates,
  stages,
  candidateName,
  candidateEmail,
  managers,
}: {
  applicationId: string;
  interviews: InterviewWithFeedback[];
  templates: EvaluationTemplate[];
  stages: JobStage[];
  candidateName?: string;
  candidateEmail?: string;
  managers?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<SchedulerMode>("list");
  const [subMode, setSubMode] = useState<"manual" | "avail">("manual");
  const [feedbackFor, setFeedbackFor] = useState<InterviewWithFeedback | null>(null);
  const [saving, setSaving] = useState(false);

  // scheduler form
  const [ivType, setIvType] = useState(IV_TYPES[1]);
  const [ivDate, setIvDate] = useState("");
  const [ivTime, setIvTime] = useState("");
  const [ivDur, setIvDur] = useState("45 min");
  const [ivInterviewer, setIvInterviewer] = useState("");
  const [ivParticipants, setIvParticipants] = useState<string[]>([]);
  const [ivSlots, setIvSlots] = useState<string[]>([]);
  const [ivCandName, setIvCandName] = useState(candidateName ?? "");
  const [ivCandEmail, setIvCandEmail] = useState(candidateEmail ?? "");

  // feedback
  const [templateId, setTemplateId] = useState("");
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [overall, setOverall] = useState(0);
  const [comments, setComments] = useState("");
  const activeTemplate = templates.find((t) => t.id === templateId);

  async function schedule() {
    if (!ivDate || !ivTime) return;
    setSaving(true);
    const scheduledAt = new Date(`${ivDate}T${ivTime}`).toISOString();
    await fetch("/api/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        application_id: applicationId,
        scheduled_at: scheduledAt,
        interviewer: ivInterviewer || null,
        duration_min: parseInt(ivDur) || 45,
        stage_id: stages.find((s) => s.name.toLowerCase().includes("entrevista"))?.id || null,
      }),
    });
    setSaving(false);
    setMode("sent");
    router.refresh();
  }

  async function sendAvailability() {
    if (!ivSlots.length) return;
    setSaving(true);
    await fetch("/api/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        application_id: applicationId,
        scheduled_at: new Date().toISOString(),
        interviewer: ivInterviewer || null,
        duration_min: parseInt(ivDur) || 45,
        stage_id: stages.find((s) => s.name.toLowerCase().includes("entrevista"))?.id || null,
        notes: `Disponibilidad enviada: ${ivSlots.join("; ")}`,
      }),
    });
    setSaving(false);
    setMode("sent");
    router.refresh();
  }

  async function submitFeedback() {
    if (!feedbackFor) return;
    setSaving(true);
    await fetch(`/api/interviews/${feedbackFor.id}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template_id: templateId || null, ratings, overall, comments }),
    });
    setSaving(false);
    setFeedbackFor(null);
    setRatings({}); setOverall(0); setComments(""); setTemplateId("");
    router.refresh();
  }

  const pvWhen = ivDate && ivTime ? `${new Date(`${ivDate}T${ivTime}`).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })} · ${ivTime}` : "—";

  /* ── Interview list ─────────────────────────────────────── */
  if (mode === "list") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
          <span style={{ ...fieldLabel }}>Entrevistas</span>
          <button
            onClick={() => setMode("manual")}
            style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: "13px", color: "#1A1A17", background: "#FCFAF6", border: "2px solid #1A1A17", borderRadius: "11px", padding: "8px 14px", boxShadow: "3px 3px 0 #1A1A17", cursor: "pointer" }}
          >
            + Programar
          </button>
        </div>

        {interviews.length === 0 && (
          <p style={{ fontSize: "13px", color: "#79746B" }}>Sin entrevistas programadas.</p>
        )}

        {interviews.map((iv) => (
          <div key={iv.id} style={{ background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "14px", padding: "16px 18px", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            <div style={{ width: "42px", height: "42px", flexShrink: 0, borderRadius: "11px", background: "#DCEFE4", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="5" width="18" height="16" rx="2" stroke="#0E5C4A" strokeWidth="2"/>
                <path d="M3 9h18M8 3v4M16 3v4" stroke="#0E5C4A" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: "160px" }}>
              <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "15px" }}>
                {stages.find((s) => s.id === iv.stage_id)?.name ?? "Entrevista"}
              </div>
              <div style={{ fontSize: "12.5px", color: "#79746B", marginTop: "2px" }}>
                {iv.interviewer ? `con ${iv.interviewer} · ` : ""}{iv.duration_min} min
              </div>
            </div>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "12px", color: "#79746B" }}>
              {formatDateTime(iv.scheduled_at)}
            </div>
            <span style={{ fontSize: "11.5px", fontWeight: 700, borderRadius: "999px", padding: "4px 11px", background: iv.status === "done" ? "#DCEFE3" : "#F8E7C4", color: iv.status === "done" ? "#1B6B4F" : "#946312" }}>
              {iv.status === "done" ? "completada" : iv.status === "scheduled" ? "programada" : "cancelada"}
            </span>
            {iv.status === "scheduled" && (
              <button
                onClick={() => setFeedbackFor(iv)}
                style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: "12px", color: "#0E5C4A", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}
              >
                Feedback
              </button>
            )}
            {iv.interview_feedback?.map((fb) => (
              <div key={fb.id} style={{ width: "100%", background: "#F4F0E8", border: "1px solid #E7E1D4", borderRadius: "10px", padding: "10px 13px", marginTop: "4px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={13} style={{ color: i < fb.overall ? "#E0A23C" : "#C2B8A4", fill: i < fb.overall ? "#E0A23C" : "none" }} />
                  ))}
                  <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", color: "#79746B", marginLeft: "6px" }}>{fb.author_email}</span>
                </div>
                {fb.comments && <p style={{ fontSize: "12.5px", color: "#3A3833", marginTop: "5px" }}>{fb.comments}</p>}
              </div>
            ))}
          </div>
        ))}

        {/* Feedback dialog */}
        {feedbackFor && (
          <div
            onClick={() => setFeedbackFor(null)}
            style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(26,26,23,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ width: "100%", maxWidth: "480px", maxHeight: "88vh", overflowY: "auto", background: "#FCFAF6", border: "1.5px solid #1A1A17", borderRadius: "18px", boxShadow: "8px 8px 0 #1A1A17", padding: "26px" }}
            >
              <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "20px", letterSpacing: "-.5px", marginBottom: "18px" }}>
                Feedback de entrevista
              </div>

              {templates.length > 0 && (
                <div style={{ marginBottom: "14px" }}>
                  <div style={{ ...fieldLabel, marginBottom: "7px" }}>Plantilla de evaluación</div>
                  <select
                    value={templateId}
                    onChange={(e) => { setTemplateId(e.target.value); setRatings({}); }}
                    style={fieldInput}
                  >
                    <option value="">Sin plantilla</option>
                    {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}

              {activeTemplate?.questions.map((q) => (
                <div key={q.q} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "12px" }}>
                  <span style={{ fontSize: "13.5px", color: "#3A3833" }}>{q.q}</span>
                  <StarPicker value={ratings[q.q] ?? 0} onChange={(v) => setRatings((r) => ({ ...r, [q.q]: v }))} />
                </div>
              ))}

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "14px" }}>
                <span style={{ fontSize: "13.5px", fontWeight: 600, color: "#1A1A17" }}>Valoración global *</span>
                <StarPicker value={overall} onChange={setOverall} />
              </div>

              <div style={{ marginBottom: "18px" }}>
                <div style={{ ...fieldLabel, marginBottom: "7px" }}>Comentarios</div>
                <textarea
                  rows={3}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  style={{ ...fieldInput, resize: "none" }}
                />
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={submitFeedback}
                  disabled={!overall || saving}
                  style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13px", color: "#fff", background: overall ? "#0E5C4A" : "#C2B8A4", border: "2px solid #1A1A17", borderRadius: "11px", padding: "11px 20px", boxShadow: overall ? "3px 3px 0 #1A1A17" : "none", cursor: overall && !saving ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: "6px" }}
                >
                  {saving && <Loader2 size={13} className="animate-spin" />}
                  Guardar feedback
                </button>
                <button onClick={() => setFeedbackFor(null)} style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 600, fontSize: "13px", color: "#79746B", background: "transparent", border: "none", padding: "11px 14px", cursor: "pointer" }}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ── Sent confirmation ────────────────────────────────── */
  if (mode === "sent") {
    return (
      <div style={{ background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "16px", padding: "34px", textAlign: "center" }}>
        <div style={{ width: "54px", height: "54px", borderRadius: "16px", background: "#EAF7C4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M5 12l5 5 9-11" stroke="#46540F" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "22px", letterSpacing: "-.5px" }}>Entrevista enviada</div>
        <div style={{ fontSize: "14px", color: "#79746B", margin: "8px 0 18px" }}>El candidato y los participantes recibieron la invitación. Ya aparece en su agenda.</div>
        <button
          onClick={() => setMode("list")}
          style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13px", color: "#1A1A17", background: "#FCFAF6", border: "2px solid #1A1A17", borderRadius: "11px", padding: "10px 18px", boxShadow: "3px 3px 0 #1A1A17", cursor: "pointer" }}
        >
          Ver entrevistas
        </button>
      </div>
    );
  }

  /* ── Scheduler ─────────────────────────────────────── */
  return (
    <div style={{ background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "16px", padding: "22px" }}>
      {/* mode toggle */}
      <div style={{ display: "flex", gap: "4px", background: "#F4F0E8", border: "1px solid #E7E1D4", borderRadius: "11px", padding: "4px", width: "fit-content", marginBottom: "20px" }}>
        <button onClick={() => setSubMode("manual")} style={chipStyle(subMode === "manual")}>Agendar manualmente</button>
        <button onClick={() => setSubMode("avail")} style={chipStyle(subMode === "avail")}>Enviar disponibilidad</button>
      </div>

      {subMode === "manual" ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px" }}>
            {/* left column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* type */}
              <div>
                <div style={{ ...fieldLabel, marginBottom: "8px" }}>Tipo de entrevista</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
                  {IV_TYPES.map((t) => (
                    <button key={t} onClick={() => setIvType(t)} style={selChip(ivType === t)}>{t}</button>
                  ))}
                </div>
              </div>

              {/* date/time */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <div style={{ ...fieldLabel, marginBottom: "8px" }}>Fecha</div>
                  <input type="date" value={ivDate} onChange={(e) => setIvDate(e.target.value)} style={fieldInput} />
                </div>
                <div>
                  <div style={{ ...fieldLabel, marginBottom: "8px" }}>Hora</div>
                  <input type="time" value={ivTime} onChange={(e) => setIvTime(e.target.value)} style={fieldInput} />
                </div>
              </div>

              {/* duration */}
              <div>
                <div style={{ ...fieldLabel, marginBottom: "8px" }}>Duración</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
                  {IV_DURATIONS.map((d) => (
                    <button key={d} onClick={() => setIvDur(d)} style={selChip(ivDur === d)}>{d}</button>
                  ))}
                </div>
              </div>

              {/* interviewer */}
              {managers && managers.length > 0 && (
                <div>
                  <div style={{ ...fieldLabel, marginBottom: "8px" }}>Entrevistador/a</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
                    {managers.map((m) => (
                      <button key={m.id} onClick={() => setIvInterviewer(ivInterviewer === m.name ? "" : m.name)} style={selChip(ivInterviewer === m.name)}>{m.name}</button>
                    ))}
                  </div>
                </div>
              )}
              {(!managers || managers.length === 0) && (
                <div>
                  <div style={{ ...fieldLabel, marginBottom: "8px" }}>Entrevistador/a</div>
                  <input value={ivInterviewer} onChange={(e) => setIvInterviewer(e.target.value)} placeholder="Nombre" style={fieldInput} />
                </div>
              )}

              {/* participants */}
              {managers && managers.length > 0 && (
                <div>
                  <div style={{ ...fieldLabel, marginBottom: "8px" }}>Otros participantes</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
                    {managers.map((m) => {
                      const on = ivParticipants.includes(m.name);
                      return (
                        <button
                          key={m.id}
                          onClick={() => setIvParticipants((p) => on ? p.filter((x) => x !== m.name) : [...p, m.name])}
                          style={selChip(on)}
                        >
                          {m.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* candidate override */}
              <div style={{ borderTop: "1px solid #E7E1D4", paddingTop: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <div style={{ ...fieldLabel, marginBottom: "8px" }}>Candidato</div>
                  <input value={ivCandName} onChange={(e) => setIvCandName(e.target.value)} style={fieldInput} />
                </div>
                <div>
                  <div style={{ ...fieldLabel, marginBottom: "8px" }}>Email</div>
                  <input type="email" value={ivCandEmail} onChange={(e) => setIvCandEmail(e.target.value)} style={fieldInput} />
                </div>
              </div>
            </div>

            {/* right: email preview */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ ...fieldLabel }}>Vista previa del mensaje</div>
              <div style={{ background: "#F4F0E8", border: "1px solid #E7E1D4", borderRadius: "13px", overflow: "hidden" }}>
                <div style={{ padding: "13px 15px", borderBottom: "1px solid #E7E1D4", fontSize: "12.5px", lineHeight: 1.6 }}>
                  <span style={{ color: "#79746B" }}>Para:</span> <b>{ivCandName || "—"}</b> &lt;{ivCandEmail || "—"}&gt;<br />
                  <span style={{ color: "#79746B" }}>Asunto:</span> <b>Entrevista · {ivType}</b>
                </div>
                <div style={{ padding: "15px", fontSize: "13.5px", lineHeight: 1.6, color: "#3A3833" }}>
                  Hola {ivCandName || "…"},<br /><br />
                  Gracias por tu interés. Nos gustaría avanzar con una entrevista de <b>{ivType}</b>.<br /><br />
                  <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "12px", color: "#79746B" }}>
                    📅 {pvWhen} · {ivDur}<br />
                    👤 {ivInterviewer || "por confirmar"}<br />
                    {ivParticipants.length > 0 && <>👥 {ivParticipants.join(", ")}<br /></>}
                  </span><br />
                  Se incluirá un enlace de videollamada en la invitación de calendario.<br /><br />
                  Un saludo,<br />Equipo de Talento
                </div>
              </div>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", color: "#79746B" }}>
                Se enviará invitación de calendario + email al candidato y participantes.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "22px" }}>
            <button
              onClick={schedule}
              disabled={!ivDate || !ivTime || saving}
              style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13px", color: "#fff", background: ivDate && ivTime ? "#0E5C4A" : "#C2B8A4", border: "2px solid #1A1A17", borderRadius: "11px", padding: "11px 20px", boxShadow: ivDate && ivTime ? "3px 3px 0 #1A1A17" : "none", cursor: ivDate && ivTime ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: "6px" }}
            >
              {saving && <Loader2 size={13} className="animate-spin" />}
              Enviar invitación
            </button>
            <button onClick={() => setMode("list")} style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 600, fontSize: "13px", color: "#79746B", background: "transparent", border: "none", padding: "11px 14px", cursor: "pointer" }}>
              Cancelar
            </button>
          </div>
        </>
      ) : (
        /* availability mode */
        <>
          <p style={{ fontSize: "13.5px", color: "#79746B", marginBottom: "18px", maxWidth: "520px", lineHeight: 1.55 }}>
            El candidato recibe un enlace con los huecos del entrevistador y elige el que le va bien. La invitación se crea sola al confirmar.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {managers && managers.length > 0 && (
                <div>
                  <div style={{ ...fieldLabel, marginBottom: "8px" }}>Entrevistador/a</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
                    {managers.map((m) => (
                      <button key={m.id} onClick={() => setIvInterviewer(ivInterviewer === m.name ? "" : m.name)} style={selChip(ivInterviewer === m.name)}>{m.name}</button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <div style={{ ...fieldLabel, marginBottom: "8px" }}>Huecos disponibles</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
                  {IV_SLOTS.map((s) => {
                    const on = ivSlots.includes(s);
                    return (
                      <button
                        key={s}
                        onClick={() => setIvSlots((p) => on ? p.filter((x) => x !== s) : [...p, s])}
                        style={selChip(on)}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ ...fieldLabel }}>Se enviará al candidato</div>
              <div style={{ background: "#F4F0E8", border: "1px solid #E7E1D4", borderRadius: "13px", padding: "15px", fontSize: "13.5px", lineHeight: 1.6, color: "#3A3833" }}>
                Elige el hueco que prefieras para tu entrevista de <b>{ivType}</b>{ivInterviewer ? ` con ${ivInterviewer}` : ""}:<br /><br />
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "12px", color: "#0E5C4A", fontWeight: 700 }}>
                  {ivSlots.length > 0 ? ivSlots.join("\n") : "—"}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "22px" }}>
            <button
              onClick={sendAvailability}
              disabled={!ivSlots.length || saving}
              style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13px", color: "#fff", background: ivSlots.length ? "#0E5C4A" : "#C2B8A4", border: "2px solid #1A1A17", borderRadius: "11px", padding: "11px 20px", boxShadow: ivSlots.length ? "3px 3px 0 #1A1A17" : "none", cursor: ivSlots.length ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: "6px" }}
            >
              {saving && <Loader2 size={13} className="animate-spin" />}
              Enviar disponibilidad
            </button>
            <button onClick={() => setMode("list")} style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 600, fontSize: "13px", color: "#79746B", background: "transparent", border: "none", padding: "11px 14px", cursor: "pointer" }}>
              Cancelar
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: "flex", gap: "2px" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" onClick={() => onChange(i)} style={{ background: "none", border: "none", padding: "2px", cursor: "pointer" }}>
          <Star size={20} style={{ color: i <= value ? "#E0A23C" : "#C2B8A4", fill: i <= value ? "#E0A23C" : "none" }} />
        </button>
      ))}
    </div>
  );
}
