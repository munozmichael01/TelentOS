"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight, X } from "lucide-react";
import type { CompensationRecord } from "@/lib/types";
import { apiFetch, ApiError } from "@/lib/api-client";
import { EmployeeMultiSelect } from "@/components/features/employee-multi-select";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { DateRangeField } from "@/components/ui/date-range-field";
import { HairlineTable, HairlineRow } from "@/components/hairline-table";

// ── Design tokens ──────────────────────────────────────────────────
const T = {
  bg: "#F4F0E8", surface: "#FCFAF6", ink: "#1A1A17", soft: "#79746B",
  line: "#E7E1D4", brand: "#0E5C4A", accent: "#F1543F",
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
function monthLabel(year: number, month: number) {
  const s = new Date(year, month, 1).toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function monthBounds(year: number, month: number) {
  return {
    from: new Date(year, month, 1).toISOString().slice(0, 10),
    to: new Date(year, month + 1, 0).toISOString().slice(0, 10),
  };
}
function prevYM(y: number, m: number): [number, number] {
  return m === 0 ? [y - 1, 11] : [y, m - 1];
}
function nextYM(y: number, m: number): [number, number] {
  return m === 11 ? [y + 1, 0] : [y, m + 1];
}

// ── Sub-components ─────────────────────────────────────────────────
function SL({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: T.mono, fontSize: "10px", letterSpacing: "1.5px", textTransform: "uppercase", color: T.soft, marginBottom: "10px" }}>{children}</div>;
}
function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: T.mono, fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", color: T.soft, marginBottom: "6px" }}>{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: "16px" }}><Label>{label}</Label>{children}</div>;
}

// ── Period Selector ────────────────────────────────────────────────
function PeriodSelector({
  year, month, customMode, customFrom, customTo,
  onPrev, onNext, onCurrentMonth, onPrevMonth,
  onCustomMode, onCustomFrom, onCustomTo,
}: {
  year: number; month: number;
  customMode: boolean; customFrom: string; customTo: string;
  onPrev: () => void; onNext: () => void;
  onCurrentMonth: () => void; onPrevMonth: () => void;
  onCustomMode: () => void; onCustomFrom: (v: string) => void; onCustomTo: (v: string) => void;
}) {
  const now = new Date();
  const isCurrentMonth = !customMode && year === now.getFullYear() && month === now.getMonth();
  const [pY, pM] = prevYM(now.getFullYear(), now.getMonth());
  const isPrevMonth = !customMode && year === pY && month === pM;

  const btnStyle = (active: boolean): React.CSSProperties => ({
    fontFamily: T.mono, fontSize: "11px", letterSpacing: "0.5px",
    padding: "7px 14px", borderRadius: "8px", cursor: "pointer",
    border: active ? "2px solid #1A1A17" : `1.5px solid ${T.line}`,
    background: active ? T.ink : T.bg,
    color: active ? "#fff" : T.soft,
    whiteSpace: "nowrap" as const,
  });

  return (
    <div style={{ marginBottom: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        {/* Month navigation */}
        {!customMode && (
          <div style={{ display: "flex", alignItems: "center", gap: "0", border: `2px solid #1A1A17`, boxShadow: "3px 3px 0 #1A1A17", borderRadius: "10px", overflow: "hidden" }}>
            <button onClick={onPrev} style={{ padding: "8px 12px", border: "none", background: T.surface, cursor: "pointer", color: T.soft, display: "flex", alignItems: "center" }}>
              <ChevronLeft size={14} />
            </button>
            <div style={{ padding: "8px 20px", fontFamily: T.head, fontWeight: 800, fontSize: "15px", letterSpacing: "-0.3px", background: T.surface, minWidth: "200px", textAlign: "center" }}>
              {monthLabel(year, month)}
            </div>
            <button onClick={onNext} style={{ padding: "8px 12px", border: "none", background: T.surface, cursor: "pointer", color: T.soft, display: "flex", alignItems: "center" }}>
              <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* Quick buttons */}
        <button onClick={onCurrentMonth} style={btnStyle(isCurrentMonth)}>Mes actual</button>
        <button onClick={onPrevMonth} style={btnStyle(isPrevMonth)}>Mes anterior</button>
        <button onClick={onCustomMode} style={btnStyle(customMode)}>Personalizado</button>

        {/* Custom date inputs */}
        {customMode && (
          <DateRangeField from={customFrom} to={customTo} onFromChange={onCustomFrom} onToChange={onCustomTo} />
        )}
      </div>
    </div>
  );
}

// ── Confirm Record Modal ───────────────────────────────────────────
function ConfirmModal({
  employee,
  workedMinutes,
  periodFrom,
  periodTo,
  onClose,
  onSaved,
}: {
  employee: { id: string; name: string };
  workedMinutes: number;
  periodFrom: string;
  periodTo: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [scheduledH, setScheduledH] = useState("");
  const [compType, setCompType] = useState("time_off");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const scheduledMin = Math.round(parseFloat(scheduledH || "0") * 60);
  const balanceMin = workedMinutes - scheduledMin;

  async function save() {
    setSaving(true);
    setError("");
    try {
      await apiFetch("/api/compensation/records", {
        method: "POST",
        json: {
          employee_id: employee.id,
          period_start: periodFrom,
          period_end: periodTo,
          scheduled_minutes: scheduledMin,
          worked_minutes: workedMinutes,
          compensation_type: compType,
          comment: comment || null,
        },
      });
      onSaved();
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setError("Ya existe un registro para este empleado en este período");
      } else {
        setError(e instanceof Error ? e.message : "Error al guardar");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(26,26,23,.5)", zIndex: 100 }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        width: "440px", maxWidth: "calc(100vw - 32px)",
        background: T.surface, border: "2px solid #1A1A17", boxShadow: "5px 5px 0 #1A1A17",
        borderRadius: "16px", zIndex: 101, padding: "24px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <div>
            <div style={{ fontFamily: T.head, fontWeight: 900, fontSize: "18px", letterSpacing: "-0.4px" }}>
              Confirmar compensación
            </div>
            <div style={{ fontSize: "13px", color: T.soft, marginTop: "2px" }}>{employee.name}</div>
          </div>
          <button onClick={onClose} style={{ width: "30px", height: "30px", borderRadius: "7px", border: `1px solid ${T.line}`, background: T.bg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: T.soft }}>
            <X size={13} />
          </button>
        </div>

        {/* Worked hours (read-only) */}
        <div style={{ padding: "12px 14px", background: T.bg, borderRadius: "10px", border: `1.5px solid ${T.line}`, marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: T.mono, fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", color: T.soft }}>Horas trabajadas (calculado)</span>
          <span style={{ fontFamily: T.head, fontWeight: 900, fontSize: "18px", color: T.brand }}>{fmt(workedMinutes)}</span>
        </div>

        <Field label="Horas programadas">
          <Input
            type="number" min="0" step="0.5" placeholder="Ej. 160"
            value={scheduledH} onChange={(e) => setScheduledH(e.target.value)}
          />
        </Field>

        {/* Balance preview */}
        {scheduledH !== "" && (
          <div style={{
            padding: "12px 14px", borderRadius: "10px", marginBottom: "16px",
            background: balanceMin >= 0 ? T.successBg : T.dangerBg,
            border: `1.5px solid ${balanceMin >= 0 ? "#B3D9C3" : "#E8B9B2"}`,
            display: "flex", alignItems: "center", gap: "10px",
          }}>
            {balanceMin >= 0 ? <TrendingUp size={16} color={T.successText} /> : <TrendingDown size={16} color={T.dangerText} />}
            <div>
              <div style={{ fontFamily: T.mono, fontSize: "9px", letterSpacing: "1px", textTransform: "uppercase", color: balanceMin >= 0 ? T.successText : T.dangerText }}>Balance</div>
              <div style={{ fontFamily: T.head, fontWeight: 900, fontSize: "18px", color: balanceMin >= 0 ? T.successText : T.dangerText }}>
                {balanceMin > 0 ? "+" : ""}{fmt(balanceMin)}
              </div>
            </div>
          </div>
        )}

        <Field label="Tipo">
          <NativeSelect value={compType} onChange={(e) => setCompType(e.target.value)}>
            <option value="time_off">Tiempo libre</option>
            <option value="payment">Pago</option>
          </NativeSelect>
        </Field>

        <Field label="Comentario (opcional)">
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)}
            placeholder="Notas…" rows={2} />
        </Field>

        {error && (
          <div style={{ padding: "9px 12px", background: T.dangerBg, color: T.dangerText, borderRadius: "8px", fontSize: "13px", marginBottom: "14px", border: "1px solid #E8B9B2" }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={save}
            disabled={saving || scheduledH === ""}
            style={{
              flex: 1, padding: "11px 20px",
              border: "2px solid #1A1A17", boxShadow: "3px 3px 0 #1A1A17",
              borderRadius: "10px", background: T.brand, color: "#fff",
              fontFamily: T.mono, fontSize: "12px", letterSpacing: "0.5px",
              cursor: saving || scheduledH === "" ? "not-allowed" : "pointer",
              opacity: saving || scheduledH === "" ? 0.6 : 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            }}
          >
            {saving && <Loader2 size={13} className="animate-spin" />}
            Guardar registro
          </button>
          <button onClick={onClose} style={{ padding: "11px 18px", borderRadius: "10px", border: `1.5px solid ${T.line}`, background: T.bg, color: T.soft, fontFamily: T.mono, fontSize: "12px", cursor: "pointer" }}>
            Cancelar
          </button>
        </div>
      </div>
    </>
  );
}

// ── Saved Records Table ────────────────────────────────────────────
const NOVEDAD_LABEL: Record<string, string> = { pending: "Pendiente", included: "En corrida", paid: "Pagado" };
const NOVEDAD_BG:    Record<string, string> = { pending: T.warnBg,    included: T.successBg,  paid: T.successBg };
const NOVEDAD_CLR:   Record<string, string> = { pending: T.warnText,  included: T.successText, paid: T.successText };

function RecordsTable({ records }: { records: (CompensationRecord & { employees?: { name: string; role_title: string | null } | null })[] }) {
  const typeLabel: Record<string, string> = { time_off: "Tiempo libre", payment: "Pago" };
  const typeBg: Record<string, string>   = { time_off: T.limeSoft, payment: T.warnBg };
  const typeClr: Record<string, string>  = { time_off: "#2D6E3E", payment: T.warnText };

  if (records.length === 0) return null;

  return (
    <div>
      <SL>Registros confirmados</SL>
      <HairlineTable
        cols="1.8fr 1.4fr 1fr 1fr 1fr 0.9fr 0.9fr"
        headers={["Empleado", "Período", "Programadas", "Trabajadas", "Balance", "Tipo", "Novedad"]}
        align={["left", "left", "right", "right", "right", "left", "left"]}
      >
        {records.map((r) => {
          const bal = r.balance_minutes;
          const balClr = bal > 0 ? T.successText : bal < 0 ? T.dangerText : T.soft;
          const balBg  = bal > 0 ? T.successBg   : bal < 0 ? T.dangerBg   : T.bg;
          return (
            <HairlineRow key={r.id} align={["left", "left", "right", "right", "right", "left", "left"]}>
              <div>
                <div style={{ fontWeight: 600 }}>{r.employees?.name ?? "—"}</div>
                {r.employees?.role_title && <div style={{ fontSize: "11px", color: T.soft }}>{r.employees.role_title}</div>}
              </div>
              <div>
                <div style={{ fontFamily: T.mono, fontSize: "11px" }}>{fmtDate(r.period_start)}</div>
                <div style={{ fontFamily: T.mono, fontSize: "11px", color: T.soft }}>→ {fmtDate(r.period_end)}</div>
              </div>
              <span style={{ fontFamily: T.mono, fontSize: "12px" }}>{fmt(r.scheduled_minutes)}</span>
              <span style={{ fontFamily: T.mono, fontSize: "12px" }}>{fmt(r.worked_minutes)}</span>
              <span style={{ fontFamily: T.mono, fontSize: "12px", fontWeight: 700, color: balClr, background: balBg, borderRadius: "6px", padding: "3px 8px" }}>
                {bal > 0 ? "+" : ""}{fmt(bal)}
              </span>
              <span style={{ fontFamily: T.mono, fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", color: typeClr[r.compensation_type] ?? T.soft, background: typeBg[r.compensation_type] ?? T.bg, borderRadius: "6px", padding: "2px 8px" }}>
                {typeLabel[r.compensation_type] ?? r.compensation_type}
              </span>
              {r.novedad_status ? (
                <span style={{ fontFamily: T.mono, fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", color: NOVEDAD_CLR[r.novedad_status] ?? T.soft, background: NOVEDAD_BG[r.novedad_status] ?? T.bg, borderRadius: "6px", padding: "2px 8px" }}>
                  {NOVEDAD_LABEL[r.novedad_status] ?? r.novedad_status}
                </span>
              ) : (
                <span style={{ color: T.soft, fontSize: "12px" }}>—</span>
              )}
            </HairlineRow>
          );
        })}
      </HairlineTable>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────
export function CompensationPanel({
  employees,
}: {
  employees: { id: string; name: string }[];
}) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [customMode, setCustomMode] = useState(false);
  const [customFrom, setCustomFrom] = useState(monthBounds(now.getFullYear(), now.getMonth()).from);
  const [customTo, setCustomTo] = useState(monthBounds(now.getFullYear(), now.getMonth()).to);
  const [empFilter, setEmpFilter] = useState<string[]>([]);

  const { from: monthFrom, to: monthTo } = monthBounds(year, month);
  const periodFrom = customMode ? customFrom : monthFrom;
  const periodTo   = customMode ? customTo   : monthTo;

  // Data
  type EntryRow = { employee_id: string; entry_type: string; duration_minutes: number | null };
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [records, setRecords] = useState<(CompensationRecord & { employees?: { name: string; role_title: string | null } | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmEmp, setConfirmEmp] = useState<{ id: string; name: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [eRes, rRes] = await Promise.all([
        fetch(`/api/time-entries?from=${periodFrom}&to=${periodTo}`),
        fetch(`/api/compensation/records?from=${periodFrom}&to=${periodTo}`),
      ]);
      const eData = await eRes.json();
      const rData = await rRes.json();
      setEntries(eData.entries ?? []);
      setRecords(rData.records ?? []);
    } finally {
      setLoading(false);
    }
  }, [periodFrom, periodTo]);

  useEffect(() => { load(); }, [load]);

  // Aggregate worked minutes per employee
  const workedMap: Record<string, number> = {};
  for (const e of entries) {
    if (e.entry_type !== "work") continue;
    workedMap[e.employee_id] = (workedMap[e.employee_id] ?? 0) + (e.duration_minutes ?? 0);
  }

  // Build summary for all employees
  const savedEmpIds = new Set(records.map((r) => r.employee_id));
  const summaries = employees.map((emp) => ({
    ...emp,
    worked: workedMap[emp.id] ?? 0,
    confirmed: savedEmpIds.has(emp.id),
  }));

  // Navigation handlers
  function goPrev() {
    const [y, m] = prevYM(year, month);
    setYear(y); setMonth(m); setCustomMode(false);
  }
  function goNext() {
    const [y, m] = nextYM(year, month);
    setYear(y); setMonth(m); setCustomMode(false);
  }
  function goCurrentMonth() {
    setYear(now.getFullYear()); setMonth(now.getMonth()); setCustomMode(false);
  }
  function goPrevMonth() {
    const [y, m] = prevYM(now.getFullYear(), now.getMonth());
    setYear(y); setMonth(m); setCustomMode(false);
  }

  const withHours = summaries.filter((s) => s.worked > 0).length;
  const withoutHours = summaries.filter((s) => s.worked === 0);
  const pendingCount = summaries.filter((s) => s.worked > 0 && !s.confirmed).length;

  const visibleSummaries = empFilter.length > 0
    ? summaries.filter((s) => empFilter.includes(s.id))
    : summaries;

  return (
    <div>
      {/* Period selector */}
      <PeriodSelector
        year={year} month={month}
        customMode={customMode} customFrom={customFrom} customTo={customTo}
        onPrev={goPrev} onNext={goNext}
        onCurrentMonth={goCurrentMonth} onPrevMonth={goPrevMonth}
        onCustomMode={() => { setCustomMode(true); setCustomFrom(periodFrom); setCustomTo(periodTo); }}
        onCustomFrom={(v) => setCustomFrom(v)}
        onCustomTo={(v) => setCustomTo(v)}
      />

      {loading ? (
        <div style={{ padding: "60px", textAlign: "center", color: T.soft, display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
          <Loader2 size={24} className="animate-spin" />
          <span style={{ fontFamily: T.mono, fontSize: "11px", letterSpacing: "1px", textTransform: "uppercase" }}>Cargando datos…</span>
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px", marginBottom: "28px" }}>
            {[
              { label: "Con horas registradas", value: String(withHours), color: T.brand },
              { label: "Sin horas este período", value: String(withoutHours.length), color: withoutHours.length > 0 ? T.warnText : T.soft },
              { label: "Pendientes de confirmar", value: String(pendingCount), color: pendingCount > 0 ? T.warnText : T.soft },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: "12px", padding: "16px 18px" }}>
                <div style={{ fontFamily: T.mono, fontSize: "10px", color: T.soft, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: "6px" }}>{label}</div>
                <div style={{ fontFamily: T.head, fontWeight: 900, fontSize: "28px", letterSpacing: "-1px", color }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Sin horas callout */}
          {withoutHours.length > 0 && empFilter.length === 0 && (
            <div style={{ marginBottom: "24px", padding: "16px 20px", background: T.warnBg, border: "2px solid #1A1A17", boxShadow: "3px 3px 0 #1A1A17", borderRadius: "12px" }}>
              <div style={{ fontFamily: T.mono, fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", color: T.warnText, marginBottom: "10px" }}>
                Sin horas registradas este período
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {withoutHours.map((s) => (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "8px", background: "#FCFAF6", border: `1.5px solid ${T.line}`, borderRadius: "999px", padding: "5px 12px 5px 8px" }}>
                    <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "linear-gradient(135deg,#D0D0C8,#B0ADA6)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.head, fontWeight: 900, fontSize: "10px", color: "#fff", flexShrink: 0 }}>
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontFamily: T.body, fontSize: "13px", fontWeight: 600, color: T.soft }}>{s.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Per-employee breakdown */}
          <div style={{ marginBottom: "32px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", gap: "12px", flexWrap: "wrap" }}>
              <SL>Horas del período</SL>
              <EmployeeMultiSelect employees={employees} value={empFilter} onChange={setEmpFilter} label="Filtrar empleados" />
            </div>
            {visibleSummaries.length === 0 ? (
              <EmptyState
                icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="2"/><path d="M3.5 20a5.5 5.5 0 0111 0M16 6.5a3 3 0 010 6M17.5 20a5.5 5.5 0 00-2-4.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>}
                title="Sin empleados activos"
                description="Los resúmenes de compensación aparecerán aquí cuando haya empleados activos con horas registradas."
              />
            ) : (
              <HairlineTable
                cols="2fr 1.2fr 1.2fr 1fr"
                headers={["Empleado", "Horas trabajadas", "Estado", ""]}
                align={["left", "right", "left", "right"]}
              >
                {visibleSummaries.map((s) => (
                  <HairlineRow key={s.id} align={["left", "right", "left", "right"]}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg,#8FE3D0,#4FBFA6)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.head, fontWeight: 900, fontSize: "12px", color: "#063D31", flexShrink: 0 }}>
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 600 }}>{s.name}</span>
                    </div>
                    <span style={{ fontFamily: T.mono, fontSize: "13px", fontWeight: 700, color: s.worked > 0 ? T.ink : T.soft }}>
                      {s.worked > 0 ? fmt(s.worked) : "—"}
                    </span>
                    <span>
                      {s.confirmed ? (
                        <span style={{ fontFamily: T.mono, fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", color: T.successText, background: T.successBg, borderRadius: "6px", padding: "3px 9px" }}>
                          Confirmado
                        </span>
                      ) : s.worked > 0 ? (
                        <span style={{ fontFamily: T.mono, fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", color: T.warnText, background: T.warnBg, borderRadius: "6px", padding: "3px 9px" }}>
                          Pendiente
                        </span>
                      ) : (
                        <span style={{ fontFamily: T.mono, fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", color: T.soft, background: T.bg, borderRadius: "6px", padding: "3px 9px" }}>
                          Sin horas
                        </span>
                      )}
                    </span>
                    <span>
                      {!s.confirmed && s.worked > 0 && (
                        <button
                          onClick={() => setConfirmEmp({ id: s.id, name: s.name })}
                          style={{
                            padding: "7px 14px", borderRadius: "8px",
                            border: "2px solid #1A1A17", boxShadow: "2px 2px 0 #1A1A17",
                            background: T.brand, color: "#fff",
                            fontFamily: T.mono, fontSize: "11px", letterSpacing: "0.5px",
                            cursor: "pointer",
                          }}
                        >
                          Confirmar
                        </button>
                      )}
                    </span>
                  </HairlineRow>
                ))}
              </HairlineTable>
            )}
          </div>

          {/* Saved records */}
          <RecordsTable records={records} />
        </>
      )}

      {/* Confirm modal */}
      {confirmEmp && (
        <ConfirmModal
          employee={confirmEmp}
          workedMinutes={workedMap[confirmEmp.id] ?? 0}
          periodFrom={periodFrom}
          periodTo={periodTo}
          onClose={() => setConfirmEmp(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
