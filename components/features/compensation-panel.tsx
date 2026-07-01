"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { CompensationRecord } from "@/lib/types";

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

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Sub-components ─────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: T.mono, fontSize: "10px", letterSpacing: "1.5px", textTransform: "uppercase", color: T.soft, marginBottom: "10px" }}>
      {children}
    </div>
  );
}

function Pill({ color, bg, border, children }: { color: string; bg: string; border?: string; children: React.ReactNode }) {
  return (
    <span style={{
      fontFamily: T.mono, fontSize: "10px", letterSpacing: "1px",
      textTransform: "uppercase", color, background: bg,
      borderRadius: "6px", padding: "2px 8px", whiteSpace: "nowrap",
      border: border ? `1px solid ${border}` : undefined,
    }}>
      {children}
    </span>
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

const selectStyle: React.CSSProperties = { ...inputStyle, appearance: "none", cursor: "pointer" };

// ── Modal ─────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(26,26,23,.5)", zIndex: 100 }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        width: "520px", maxWidth: "calc(100vw - 32px)", maxHeight: "90vh",
        background: T.surface,
        border: "2px solid #1A1A17", boxShadow: "5px 5px 0 #1A1A17",
        borderRadius: "16px", zIndex: 101,
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.line}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
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

// ── Balance Cards ─────────────────────────────────────────────────
function BalanceCards({ records }: { records: (CompensationRecord & { employees?: { name: string; role_title: string | null } | null })[] }) {
  // Aggregate per employee
  const empMap: Record<string, { name: string; role: string | null; balance: number; worked: number; scheduled: number; compensated: number }> = {};
  for (const r of records) {
    const id = r.employee_id;
    if (!empMap[id]) {
      empMap[id] = {
        name: r.employees?.name ?? "—",
        role: r.employees?.role_title ?? null,
        balance: 0, worked: 0, scheduled: 0, compensated: 0,
      };
    }
    empMap[id].balance += r.balance_minutes;
    empMap[id].worked += r.worked_minutes;
    empMap[id].scheduled += r.scheduled_minutes;
    empMap[id].compensated += r.compensated_minutes;
  }

  const emps = Object.values(empMap);
  if (emps.length === 0) return null;

  return (
    <div style={{ marginBottom: "32px" }}>
      <SectionLabel>Resumen por empleado</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "14px" }}>
        {emps.map((emp) => {
          const net = emp.balance - emp.compensated;
          const positive = net >= 0;
          const neutral = net === 0;
          const bg = neutral ? T.bg : positive ? T.successBg : T.dangerBg;
          const balColor = neutral ? T.soft : positive ? T.successText : T.dangerText;

          return (
            <div
              key={emp.name}
              style={{
                background: T.surface,
                border: "2px solid #1A1A17",
                boxShadow: "3px 3px 0 #1A1A17",
                borderRadius: "12px",
                overflow: "hidden",
              }}
            >
              {/* Card header */}
              <div style={{ padding: "14px 16px", borderBottom: `1px solid ${T.line}`, display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "36px", height: "36px", borderRadius: "50%",
                  background: "linear-gradient(135deg,#8FE3D0,#4FBFA6)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: T.head, fontWeight: 900, fontSize: "13px", color: "#063D31",
                  flexShrink: 0,
                }}>
                  {emp.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "14px" }}>{emp.name}</div>
                  {emp.role && <div style={{ fontSize: "11px", color: T.soft }}>{emp.role}</div>}
                </div>
              </div>
              {/* Balance */}
              <div style={{ padding: "14px 16px", background: bg }}>
                <div style={{ fontFamily: T.mono, fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", color: balColor, marginBottom: "4px" }}>
                  {positive ? "Horas a favor" : neutral ? "Equilibrado" : "Horas pendientes"}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {positive && !neutral ? <TrendingUp size={18} color={balColor} /> : neutral ? <Minus size={18} color={balColor} /> : <TrendingDown size={18} color={balColor} />}
                  <span style={{ fontFamily: T.head, fontWeight: 900, fontSize: "24px", letterSpacing: "-1px", color: balColor }}>
                    {fmt(Math.abs(net))}
                  </span>
                </div>
              </div>
              {/* Stats */}
              <div style={{ padding: "12px 16px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                {[
                  ["Trabajadas", fmt(emp.worked)],
                  ["Programadas", fmt(emp.scheduled)],
                  ["Compensadas", fmt(emp.compensated)],
                ].map(([label, val]) => (
                  <div key={label}>
                    <div style={{ fontFamily: T.mono, fontSize: "9px", letterSpacing: "0.8px", textTransform: "uppercase", color: T.soft, marginBottom: "2px" }}>{label}</div>
                    <div style={{ fontFamily: T.mono, fontSize: "12px", fontWeight: 700, color: T.ink }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Records Table ─────────────────────────────────────────────────
function RecordsTable({ records }: { records: (CompensationRecord & { employees?: { name: string; role_title: string | null } | null })[] }) {
  const typeLabel: Record<string, string> = { time_off: "Tiempo libre", payment: "Pago" };
  const typeBg: Record<string, string> = { time_off: T.limeSoft, payment: T.warnBg };
  const typeText: Record<string, string> = { time_off: "#2D6E3E", payment: T.warnText };

  return (
    <div style={{ border: "2px solid #1A1A17", boxShadow: "3px 3px 0 #1A1A17", borderRadius: "12px", overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", fontFamily: T.body }}>
        <thead>
          <tr style={{ background: T.bg, borderBottom: `2px solid ${T.line}` }}>
            {["Empleado", "Período", "Programadas", "Trabajadas", "Balance", "Compensadas", "Tipo"].map((h) => (
              <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontFamily: T.mono, fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", color: T.soft, fontWeight: 500, whiteSpace: "nowrap" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ padding: "48px", textAlign: "center", color: T.soft, background: T.surface }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: T.bg, border: `2px solid ${T.line}`, margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontFamily: T.mono, fontSize: "18px" }}>¢</span>
                </div>
                <div style={{ fontFamily: T.mono, fontSize: "11px", letterSpacing: "1px", textTransform: "uppercase" }}>
                  Sin registros de compensación
                </div>
              </td>
            </tr>
          ) : records.map((r, i) => {
            const bal = r.balance_minutes;
            const balColor = bal > 0 ? T.successText : bal < 0 ? T.dangerText : T.soft;
            const balBg = bal > 0 ? T.successBg : bal < 0 ? T.dangerBg : T.bg;

            return (
              <tr key={r.id} style={{ background: i % 2 === 0 ? T.surface : T.bg, borderBottom: i < records.length - 1 ? `1px solid ${T.line}` : undefined }}>
                <td style={{ padding: "12px 14px" }}>
                  <div style={{ fontWeight: 600 }}>{r.employees?.name ?? "—"}</div>
                  {r.employees?.role_title && (
                    <div style={{ fontSize: "11px", color: T.soft }}>{r.employees.role_title}</div>
                  )}
                </td>
                <td style={{ padding: "12px 14px", fontSize: "12px" }}>
                  <div style={{ fontFamily: T.mono, fontSize: "11px" }}>{fmtDate(r.period_start)}</div>
                  <div style={{ fontFamily: T.mono, fontSize: "11px", color: T.soft }}>→ {fmtDate(r.period_end)}</div>
                </td>
                <td style={{ padding: "12px 14px", fontFamily: T.mono, fontSize: "12px" }}>{fmt(r.scheduled_minutes)}</td>
                <td style={{ padding: "12px 14px", fontFamily: T.mono, fontSize: "12px" }}>{fmt(r.worked_minutes)}</td>
                <td style={{ padding: "12px 14px" }}>
                  <span style={{ fontFamily: T.mono, fontSize: "12px", fontWeight: 700, color: balColor, background: balBg, borderRadius: "6px", padding: "3px 8px" }}>
                    {bal > 0 ? "+" : ""}{fmt(bal)}
                  </span>
                </td>
                <td style={{ padding: "12px 14px", fontFamily: T.mono, fontSize: "12px" }}>{fmt(r.compensated_minutes)}</td>
                <td style={{ padding: "12px 14px" }}>
                  <Pill color={typeText[r.compensation_type] ?? T.soft} bg={typeBg[r.compensation_type] ?? T.bg}>
                    {typeLabel[r.compensation_type] ?? r.compensation_type}
                  </Pill>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Create Record Form ─────────────────────────────────────────────
function CreateRecordForm({ employees, onClose }: {
  employees: { id: string; name: string }[];
  onClose: () => void;
}) {
  const router = useRouter();

  const [employeeId, setEmployeeId] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [scheduledH, setScheduledH] = useState("");
  const [workedH, setWorkedH] = useState("");
  const [compType, setCompType] = useState("time_off");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const scheduledMin = Math.round(parseFloat(scheduledH || "0") * 60);
  const workedMin = Math.round(parseFloat(workedH || "0") * 60);
  const balanceMin = workedMin - scheduledMin;
  const hasValues = scheduledH !== "" && workedH !== "";

  async function submit() {
    if (!employeeId) { setError("Selecciona un empleado"); return; }
    if (!periodStart || !periodEnd) { setError("Las fechas del período son obligatorias"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/compensation/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: employeeId,
          period_start: periodStart,
          period_end: periodEnd,
          scheduled_minutes: scheduledMin,
          worked_minutes: workedMin,
          balance_minutes: balanceMin,
          compensation_type: compType,
          comment: comment || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al crear registro");
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
      <Field label="Empleado">
        <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} style={selectStyle}>
          <option value="">Selecciona empleado…</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <Field label="Período inicio">
          <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Período fin">
          <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} style={inputStyle} />
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <Field label="Horas programadas">
          <input type="number" min="0" step="0.5" placeholder="40" value={scheduledH} onChange={(e) => setScheduledH(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Horas trabajadas">
          <input type="number" min="0" step="0.5" placeholder="42" value={workedH} onChange={(e) => setWorkedH(e.target.value)} style={inputStyle} />
        </Field>
      </div>

      {/* Balance preview */}
      {hasValues && (
        <div style={{
          padding: "14px 16px", borderRadius: "10px", marginBottom: "16px",
          background: balanceMin >= 0 ? T.successBg : T.dangerBg,
          border: `1.5px solid ${balanceMin >= 0 ? "#B3D9C3" : "#E8B9B2"}`,
          display: "flex", alignItems: "center", gap: "12px",
        }}>
          {balanceMin >= 0 ? <TrendingUp size={18} color={T.successText} /> : <TrendingDown size={18} color={T.dangerText} />}
          <div>
            <div style={{ fontFamily: T.mono, fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", color: balanceMin >= 0 ? T.successText : T.dangerText, marginBottom: "2px" }}>
              Balance calculado
            </div>
            <div style={{ fontFamily: T.head, fontWeight: 900, fontSize: "22px", letterSpacing: "-0.5px", color: balanceMin >= 0 ? T.successText : T.dangerText }}>
              {balanceMin > 0 ? "+" : ""}{fmt(balanceMin)}
            </div>
          </div>
        </div>
      )}

      <Field label="Tipo de compensación">
        <select value={compType} onChange={(e) => setCompType(e.target.value)} style={selectStyle}>
          <option value="time_off">Tiempo libre</option>
          <option value="payment">Pago</option>
        </select>
      </Field>

      <Field label="Comentario (opcional)">
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Notas sobre este período…"
          rows={3}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </Field>

      {error && (
        <div style={{ padding: "10px 12px", background: T.dangerBg, color: T.dangerText, borderRadius: "8px", fontSize: "13px", marginBottom: "16px", border: "1px solid #E8B9B2" }}>
          {error}
        </div>
      )}

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
          Crear período
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
export function CompensationPanel({
  records,
  employees,
}: {
  records: (CompensationRecord & { employees?: { name: string; role_title: string | null } | null })[];
  employees: { id: string; name: string }[];
}) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div>
      {/* Top action */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "24px" }}>
        <button
          onClick={() => setModalOpen(true)}
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
          Nuevo período
        </button>
      </div>

      {/* Balance cards */}
      <BalanceCards records={records} />

      {/* Records table */}
      <div style={{ marginBottom: "32px" }}>
        <SectionLabel>Registros</SectionLabel>
        <RecordsTable records={records} />
      </div>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo período de compensación">
        <CreateRecordForm employees={employees} onClose={() => setModalOpen(false)} />
      </Modal>
    </div>
  );
}
