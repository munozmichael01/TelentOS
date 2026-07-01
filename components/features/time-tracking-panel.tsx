"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Square, Trash2, Play, Clock, ChevronDown, X } from "lucide-react";
import type { TimeEntry, TimerState, Employee } from "@/lib/types";

// ── Design tokens ─────────────────────────────────────────────────
const T = {
  bg: "#F4F0E8",
  surface: "#FCFAF6",
  ink: "#1A1A17",
  soft: "#79746B",
  line: "#E7E1D4",
  brand: "#0E5C4A",
  accent: "#F1543F",
  lime: "#C6F24E",
  limeSoft: "#EAF7C4",
  shadow: { border: "2px solid #1A1A17", boxShadow: "3px 3px 0 #1A1A17" },
  successBg: "#DCEFE3", successText: "#1B6B4F",
  warnBg: "#F8E7C4",   warnText: "#946312",
  dangerBg: "#F6D9D2", dangerText: "#BD4332",
  mono: "'Space Mono', monospace",
  head: "'Archivo', sans-serif",
  body: "'Hanken Grotesk', sans-serif",
};

// ── Helpers ────────────────────────────────────────────────────────
function fmt(min: number) {
  const sign = min < 0 ? "-" : "";
  const abs = Math.abs(min);
  return `${sign}${Math.floor(abs / 60)}h${abs % 60 > 0 ? ` ${abs % 60}m` : ""}`;
}

function fmtTime(iso: string) {
  // "HH:MM:SS" or full ISO — take the HH:MM part
  const t = iso.includes("T") ? new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : iso.slice(0, 5);
  return t;
}

function fmtStartedAt(iso: string) {
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function calcDuration(entry: TimeEntry) {
  if (entry.duration_minutes != null) return fmt(entry.duration_minutes);
  if (!entry.end_time) return "—";
  const start = new Date(entry.start_time as string);
  const end = new Date(entry.end_time as string);
  const diff = Math.round((end.getTime() - start.getTime()) / 60000);
  return fmt(diff > 0 ? diff : 0);
}

// ── Sub-components ─────────────────────────────────────────────────

function Pill({ color, bg, children }: { color: string; bg: string; children: React.ReactNode }) {
  return (
    <span style={{
      fontFamily: T.mono, fontSize: "10px", letterSpacing: "1px",
      textTransform: "uppercase", color, background: bg,
      borderRadius: "6px", padding: "2px 8px", whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: T.mono, fontSize: "10px", letterSpacing: "1.5px", textTransform: "uppercase", color: T.soft, marginBottom: "10px" }}>
      {children}
    </div>
  );
}

// Slide-over drawer
function Drawer({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  // Prevent body scroll when open
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(26,26,23,.45)", zIndex: 100 }}
      />
      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: "420px", maxWidth: "100vw",
        background: T.surface, borderLeft: `1px solid ${T.line}`,
        boxShadow: "-8px 0 32px rgba(26,26,23,.12)", zIndex: 101,
        display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.line}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: T.head, fontWeight: 900, fontSize: "20px", letterSpacing: "-0.5px" }}>{title}</span>
          <button
            onClick={onClose}
            style={{ width: "32px", height: "32px", borderRadius: "8px", border: `1px solid ${T.line}`, background: T.bg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: T.soft }}
          >
            <X size={14} />
          </button>
        </div>
        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          {children}
        </div>
      </div>
    </>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: T.mono, fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", color: T.soft, marginBottom: "6px" }}>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: `1.5px solid ${T.line}`,
  borderRadius: "8px", background: T.bg, fontSize: "14px",
  fontFamily: T.body, color: T.ink, outline: "none", boxSizing: "border-box",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle, appearance: "none", cursor: "pointer",
};

// ── Live Timer Display ─────────────────────────────────────────────
function ElapsedTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState("");

  const tick = useCallback(() => {
    const diff = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    setElapsed(`${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
  }, [startedAt]);

  useEffect(() => {
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tick]);

  return (
    <span style={{ fontFamily: T.mono, fontSize: "13px", color: T.successText, background: T.successBg, borderRadius: "6px", padding: "3px 8px" }}>
      {elapsed}
    </span>
  );
}

// ── Active Timers Section ──────────────────────────────────────────
function ActiveTimers({ timers }: { timers: (TimerState & { employees?: { id: string; name: string; role_title: string | null } | null })[] }) {
  const router = useRouter();
  const [stopping, setStopping] = useState<string | null>(null);

  async function stop(employeeId: string) {
    setStopping(employeeId);
    try {
      await fetch("/api/timer/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_id: employeeId }),
      });
      router.refresh();
    } finally {
      setStopping(null);
    }
  }

  return (
    <div style={{ marginBottom: "32px" }}>
      <SectionLabel>Hoy en tiempo real</SectionLabel>
      <div style={{
        border: `2px solid #1A1A17`,
        boxShadow: "3px 3px 0 #1A1A17",
        borderRadius: "12px",
        overflow: "hidden",
      }}>
        {/* Status bar */}
        <div style={{
          background: timers.length > 0 ? T.successBg : T.bg,
          borderBottom: timers.length > 0 ? `1px solid #B3D9C3` : `1px solid ${T.line}`,
          padding: "12px 18px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}>
          <div style={{
            width: "8px", height: "8px", borderRadius: "50%",
            background: timers.length > 0 ? T.successText : T.soft,
            boxShadow: timers.length > 0 ? `0 0 0 3px ${T.successBg}` : undefined,
            animation: timers.length > 0 ? "pulse 2s infinite" : undefined,
          }} />
          <span style={{ fontFamily: T.mono, fontSize: "11px", letterSpacing: "1px", textTransform: "uppercase", color: timers.length > 0 ? T.successText : T.soft }}>
            {timers.length > 0 ? `${timers.length} empleado${timers.length !== 1 ? "s" : ""} fichado${timers.length !== 1 ? "s" : ""} ahora` : "Ningún empleado activo"}
          </span>
        </div>

        {timers.length > 0 && (
          <div>
            {timers.map((timer, i) => (
              <div
                key={timer.id}
                style={{
                  display: "flex", alignItems: "center", gap: "14px",
                  padding: "14px 18px",
                  borderBottom: i < timers.length - 1 ? `1px solid ${T.line}` : undefined,
                  background: T.surface,
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: "36px", height: "36px", borderRadius: "50%",
                  background: "linear-gradient(135deg,#8FE3D0,#4FBFA6)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: T.head, fontWeight: 900, fontSize: "13px", color: "#063D31",
                  flexShrink: 0,
                }}>
                  {timer.employees?.name?.charAt(0)?.toUpperCase() ?? "?"}
                </div>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "2px" }}>
                    {timer.employees?.name ?? "—"}
                  </div>
                  {timer.employees?.role_title && (
                    <div style={{ fontSize: "12px", color: T.soft }}>{timer.employees.role_title}</div>
                  )}
                </div>
                {/* Working since */}
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "11px", color: T.soft, marginBottom: "4px" }}>
                    Desde {fmtStartedAt(timer.started_at)}
                  </div>
                  <ElapsedTimer startedAt={timer.started_at} />
                </div>
                {/* Stop button */}
                <button
                  onClick={() => stop(timer.employee_id)}
                  disabled={stopping === timer.employee_id}
                  style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    padding: "8px 14px", borderRadius: "8px",
                    border: "2px solid #1A1A17", boxShadow: "2px 2px 0 #1A1A17",
                    background: T.dangerBg, color: T.dangerText,
                    fontFamily: T.mono, fontSize: "11px", letterSpacing: "0.5px",
                    cursor: stopping === timer.employee_id ? "not-allowed" : "pointer",
                    opacity: stopping === timer.employee_id ? 0.6 : 1,
                    transition: "transform 80ms",
                  }}
                >
                  {stopping === timer.employee_id ? <Loader2 size={12} className="animate-spin" /> : <Square size={12} />}
                  Parar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
    </div>
  );
}

// ── Entries Table (self-fetching, with filters) ────────────────────
function fmtShortDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
}

function EntriesTable({ initialEntries, employees }: {
  initialEntries: TimeEntry[];
  employees: { id: string; name: string }[];
}) {
  const today = new Date().toISOString().slice(0, 10);
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [empFilter, setEmpFilter] = useState("");
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [fetched, setFetched] = useState<TimeEntry[] | null>(null);
  const [loading, setLoading] = useState(false);

  const hasFilter = !!empFilter || dateFrom !== today || dateTo !== today;

  useEffect(() => {
    if (hasFilter) {
      load();
    } else {
      setFetched(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empFilter, dateFrom, dateTo]);

  async function load() {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (empFilter) p.set("employee_id", empFilter);
      p.set("from", dateFrom);
      p.set("to", dateTo);
      const res = await fetch(`/api/time-entries?${p}`);
      const json = await res.json();
      setFetched(json.entries ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function del(id: string) {
    setDeleting(id);
    try {
      await fetch(`/api/time-entries/${id}`, { method: "DELETE" });
      router.refresh();
      if (hasFilter) setFetched((prev) => prev ? prev.filter((e) => e.id !== id) : null);
    } finally {
      setDeleting(null);
    }
  }

  const entries = fetched ?? initialEntries;
  const typeLabel: Record<string, string> = { work: "Trabajo", break: "Descanso" };
  const typeBg: Record<string, string> = { work: T.limeSoft, break: "#F0EEE9" };
  const typeText: Record<string, string> = { work: "#2D6E3E", break: T.soft };
  const sourceLabel: Record<string, string> = { manual: "Manual", timer: "Timer", terminal: "Terminal" };

  return (
    <div style={{ marginBottom: "32px" }}>
      <SectionLabel>Entradas</SectionLabel>

      {/* Filter bar */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "12px", flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: "160px" }}>
          <Label>Empleado</Label>
          <select value={empFilter} onChange={(e) => setEmpFilter(e.target.value)} style={selectStyle}>
            <option value="">Todos</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <Label>Desde</Label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <Label>Hasta</Label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={inputStyle} />
        </div>
        {hasFilter && (
          <button
            onClick={() => { setEmpFilter(""); setDateFrom(today); setDateTo(today); }}
            style={{
              padding: "9px 14px", borderRadius: "8px",
              border: `1.5px solid ${T.line}`, background: T.bg,
              fontFamily: T.mono, fontSize: "10px", letterSpacing: "0.5px",
              color: T.soft, cursor: "pointer", whiteSpace: "nowrap",
            }}
          >
            Limpiar filtros
          </button>
        )}
        {loading && <Loader2 size={14} className="animate-spin" style={{ color: T.soft, alignSelf: "center" }} />}
      </div>

      <div style={{ border: `2px solid #1A1A17`, boxShadow: "3px 3px 0 #1A1A17", borderRadius: "12px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", fontFamily: T.body }}>
          <thead>
            <tr style={{ background: T.bg, borderBottom: `2px solid ${T.line}` }}>
              {["Empleado", "Fecha", "Tipo", "Inicio", "Fin", "Duración", "Fuente", ""].map((h) => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontFamily: T.mono, fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", color: T.soft, fontWeight: 500, whiteSpace: "nowrap" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: "40px", textAlign: "center", color: T.soft, background: T.surface }}>
                  <Clock size={28} style={{ margin: "0 auto 10px", display: "block", opacity: 0.4 }} />
                  <div style={{ fontFamily: T.mono, fontSize: "11px", letterSpacing: "1px", textTransform: "uppercase" }}>
                    Sin entradas
                  </div>
                </td>
              </tr>
            ) : entries.map((e, i) => (
              <tr
                key={e.id}
                style={{
                  background: i % 2 === 0 ? T.surface : T.bg,
                  borderBottom: i < entries.length - 1 ? `1px solid ${T.line}` : undefined,
                }}
              >
                <td style={{ padding: "12px 14px", fontWeight: 600 }}>
                  <div>{e.employees?.name ?? "—"}</div>
                  {e.employees?.role_title && (
                    <div style={{ fontSize: "11px", color: T.soft, fontWeight: 400 }}>{e.employees.role_title}</div>
                  )}
                </td>
                <td style={{ padding: "12px 14px", fontFamily: T.mono, fontSize: "12px", whiteSpace: "nowrap" }}>
                  {fmtShortDate(e.date)}
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <Pill color={typeText[e.entry_type] ?? T.soft} bg={typeBg[e.entry_type] ?? T.bg}>
                    {typeLabel[e.entry_type] ?? e.entry_type}
                  </Pill>
                </td>
                <td style={{ padding: "12px 14px", fontFamily: T.mono, fontSize: "12px" }}>
                  {fmtTime(e.start_time)}
                </td>
                <td style={{ padding: "12px 14px", fontFamily: T.mono, fontSize: "12px" }}>
                  {e.end_time ? fmtTime(e.end_time) : <span style={{ color: T.soft }}>Activo</span>}
                </td>
                <td style={{ padding: "12px 14px", fontFamily: T.mono, fontSize: "12px", fontWeight: 700 }}>
                  {calcDuration(e)}
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <Pill color={T.soft} bg={T.bg}>{sourceLabel[e.source] ?? e.source}</Pill>
                </td>
                <td style={{ padding: "12px 14px", textAlign: "right" }}>
                  <button
                    onClick={() => del(e.id)}
                    disabled={deleting === e.id}
                    style={{
                      width: "30px", height: "30px", borderRadius: "7px",
                      border: `1.5px solid ${T.line}`, background: T.bg,
                      color: T.accent, cursor: "pointer",
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      opacity: deleting === e.id ? 0.5 : 1,
                    }}
                    title="Eliminar entrada"
                  >
                    {deleting === e.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Weekly Summary ─────────────────────────────────────────────────
function WeeklySummary({ entries, employees }: {
  entries: TimeEntry[];
  employees: { id: string; name: string }[];
}) {
  // Build Mon-Sun for current week
  const today = new Date();
  const dow = today.getDay(); // 0=Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dow + 6) % 7));

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split("T")[0];
  });

  const dayLabels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  // Aggregate minutes per employee per day (work entries only)
  const empMap: Record<string, Record<string, number>> = {};
  for (const e of entries) {
    if (e.entry_type !== "work") continue;
    if (!empMap[e.employee_id]) empMap[e.employee_id] = {};
    const min = e.duration_minutes ?? 0;
    empMap[e.employee_id][e.date] = (empMap[e.employee_id][e.date] ?? 0) + min;
  }

  const empIds = Object.keys(empMap);
  if (empIds.length === 0) return null;

  const empById = Object.fromEntries(employees.map((e) => [e.id, e]));

  return (
    <div>
      <SectionLabel>Resumen semanal</SectionLabel>
      <div style={{ border: `2px solid #1A1A17`, boxShadow: "3px 3px 0 #1A1A17", borderRadius: "12px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", fontFamily: T.body }}>
          <thead>
            <tr style={{ background: T.bg, borderBottom: `2px solid ${T.line}` }}>
              <th style={{ padding: "10px 14px", textAlign: "left", fontFamily: T.mono, fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", color: T.soft, fontWeight: 500 }}>Empleado</th>
              {dayLabels.map((d, i) => (
                <th key={d} style={{ padding: "10px 10px", textAlign: "center", fontFamily: T.mono, fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", color: days[i] === today.toISOString().split("T")[0] ? T.brand : T.soft, fontWeight: days[i] === today.toISOString().split("T")[0] ? 700 : 500 }}>
                  {d}
                </th>
              ))}
              <th style={{ padding: "10px 14px", textAlign: "right", fontFamily: T.mono, fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", color: T.ink, fontWeight: 700 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {empIds.map((empId, i) => {
              const dayMins = empMap[empId];
              const total = Object.values(dayMins).reduce((a, b) => a + b, 0);
              return (
                <tr key={empId} style={{ background: i % 2 === 0 ? T.surface : T.bg, borderBottom: i < empIds.length - 1 ? `1px solid ${T.line}` : undefined }}>
                  <td style={{ padding: "11px 14px", fontWeight: 600 }}>{empById[empId]?.name ?? empId}</td>
                  {days.map((day) => {
                    const min = dayMins[day] ?? 0;
                    const isToday = day === today.toISOString().split("T")[0];
                    return (
                      <td key={day} style={{ padding: "11px 10px", textAlign: "center", fontFamily: T.mono, fontSize: "11px", color: min > 0 ? T.ink : T.line, background: isToday && min > 0 ? T.limeSoft : undefined }}>
                        {min > 0 ? fmt(min) : "·"}
                      </td>
                    );
                  })}
                  <td style={{ padding: "11px 14px", textAlign: "right", fontFamily: T.mono, fontSize: "12px", fontWeight: 700, color: T.brand }}>
                    {fmt(total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Create Entry Form (inside drawer) ─────────────────────────────
function CreateEntryForm({ employees, onClose }: {
  employees: { id: string; name: string }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [mode, setMode] = useState<"entry" | "timer">("entry");
  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState(today);
  const [entryType, setEntryType] = useState("work");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!employeeId) { setError("Selecciona un empleado"); return; }
    setSaving(true);
    setError("");
    try {
      if (mode === "timer") {
        const res = await fetch("/api/timer/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employee_id: employeeId, entry_type: entryType }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Error al iniciar timer");
      } else {
        if (!startTime) { setError("La hora de inicio es obligatoria"); setSaving(false); return; }
        const res = await fetch("/api/time-entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employee_id: employeeId,
            date, entry_type: entryType,
            start_time: startTime,
            end_time: endTime || null,
            comment: comment || null,
            source: "manual",
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Error al crear entrada");
      }
      router.refresh();
      onClose();
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Mode toggle */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "24px", padding: "4px", background: T.bg, borderRadius: "10px", border: `1.5px solid ${T.line}` }}>
        {([["entry", "Entrada manual"], ["timer", "Fichar entrada"]] as const).map(([m, label]) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              flex: 1, padding: "8px 12px", borderRadius: "7px", border: "none", cursor: "pointer",
              fontFamily: T.mono, fontSize: "11px", letterSpacing: "0.5px",
              background: mode === m ? T.brand : "transparent",
              color: mode === m ? "#fff" : T.soft,
              fontWeight: mode === m ? 700 : 400,
              transition: "all 120ms",
            }}
          >
            {mode === m ? (m === "timer" ? <Play size={11} style={{ display: "inline", marginRight: "5px" }} /> : null) : null}
            {label}
          </button>
        ))}
      </div>

      <Field label="Empleado">
        <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} style={selectStyle}>
          <option value="">Selecciona empleado…</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </Field>

      {mode === "entry" && (
        <Field label="Fecha">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
        </Field>
      )}

      <Field label="Tipo">
        <select value={entryType} onChange={(e) => setEntryType(e.target.value)} style={selectStyle}>
          <option value="work">Trabajo</option>
          <option value="break">Descanso</option>
        </select>
      </Field>

      {mode === "entry" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <Field label="Hora inicio">
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Hora fin (opcional)">
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={inputStyle} />
            </Field>
          </div>

          <Field label="Comentario (opcional)">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Proyecto, tarea…"
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </Field>
        </>
      )}

      {error && (
        <div style={{ padding: "10px 12px", background: T.dangerBg, color: T.dangerText, borderRadius: "8px", fontSize: "13px", marginBottom: "16px", border: `1px solid #E8B9B2` }}>
          {error}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: "10px" }}>
        <button
          onClick={submit}
          disabled={saving || !employeeId}
          style={{
            flex: 1, padding: "12px 20px",
            border: "2px solid #1A1A17", boxShadow: "3px 3px 0 #1A1A17",
            borderRadius: "10px", background: T.brand, color: "#fff",
            fontFamily: T.mono, fontSize: "12px", letterSpacing: "0.5px",
            cursor: saving || !employeeId ? "not-allowed" : "pointer",
            opacity: saving || !employeeId ? 0.6 : 1,
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
          }}
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {mode === "timer" ? "Iniciar timer" : "Crear entrada"}
        </button>
        <button
          onClick={onClose}
          style={{
            padding: "12px 20px", borderRadius: "10px",
            border: `1.5px solid ${T.line}`, background: T.bg,
            color: T.soft, fontFamily: T.mono, fontSize: "12px",
            cursor: "pointer",
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────
export function TimeTrackingPanel({
  activeTimers,
  todayEntries,
  employees,
  allEntries,
}: {
  activeTimers: (TimerState & { employees?: { id: string; name: string; role_title: string | null } | null })[];
  todayEntries: TimeEntry[];
  employees: { id: string; name: string }[];
  allEntries: TimeEntry[];
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div>
      {/* Top action row */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "24px" }}>
        <button
          onClick={() => setDrawerOpen(true)}
          style={{
            display: "flex", alignItems: "center", gap: "7px",
            padding: "10px 18px", borderRadius: "10px",
            border: "2px solid #1A1A17", boxShadow: "3px 3px 0 #1A1A17",
            background: T.brand, color: "#fff",
            fontFamily: T.mono, fontSize: "12px", letterSpacing: "0.5px",
            cursor: "pointer",
          }}
        >
          <Plus size={14} />
          Nueva entrada
        </button>
      </div>

      {/* Active timers */}
      <ActiveTimers timers={activeTimers} />

      {/* Entries with filters */}
      <EntriesTable initialEntries={todayEntries} employees={employees} />

      {/* Weekly summary */}
      <WeeklySummary entries={allEntries} employees={employees} />

      {/* Create drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Nueva entrada de tiempo">
        <CreateEntryForm employees={employees} onClose={() => setDrawerOpen(false)} />
      </Drawer>
    </div>
  );
}
