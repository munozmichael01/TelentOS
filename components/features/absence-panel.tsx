"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, notifyError } from "@/lib/api-client";
import type { AbsenceRequest, AbsenceType, Employee, AbsenceStatus } from "@/lib/types";
import { EmployeeMultiSelect } from "@/components/features/employee-multi-select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { DateRangeField } from "@/components/ui/date-range-field";

/* ─── Style helpers ─────────────────────────────────────────────────── */

const FL = {
  fontFamily: "'Space Mono', monospace",
  fontSize: "10.5px",
  textTransform: "uppercase" as const,
  letterSpacing: ".6px",
  color: "#79746B",
};

const BTN_PRIMARY = {
  fontFamily: "'Archivo', sans-serif",
  fontWeight: 800,
  fontSize: "13px",
  color: "#fff",
  background: "#0E5C4A",
  border: "2px solid #1A1A17",
  boxShadow: "3px 3px 0 #1A1A17",
  borderRadius: "11px",
  padding: "10px 20px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "6px",
} as const;

const BTN_GHOST = {
  fontFamily: "'Hanken Grotesk', sans-serif",
  fontWeight: 600,
  fontSize: "13px",
  color: "#79746B",
  background: "transparent",
  border: "none",
  padding: "10px 14px",
  cursor: "pointer",
} as const;

const BTN_DANGER = {
  ...BTN_PRIMARY,
  background: "#BD4332",
  boxShadow: "2px 2px 0 #1A1A17",
  padding: "7px 14px",
  fontSize: "12px",
} as const;

const BTN_SUCCESS = {
  ...BTN_PRIMARY,
  background: "#1B6B4F",
  boxShadow: "2px 2px 0 #1A1A17",
  padding: "7px 14px",
  fontSize: "12px",
} as const;

const BTN_OUTLINE = {
  fontFamily: "'Archivo', sans-serif",
  fontWeight: 700,
  fontSize: "12px",
  color: "#79746B",
  background: "#FCFAF6",
  border: "1.5px solid #E7E1D4",
  borderRadius: "9px",
  padding: "7px 14px",
  cursor: "pointer",
} as const;

/* ─── Status badge ──────────────────────────────────────────────────── */

function StatusBadge({ status }: { status: AbsenceStatus }) {
  const styles: Record<AbsenceStatus, { bg: string; color: string; label: string }> = {
    pending:   { bg: "#F8E7C4", color: "#946312", label: "Pendiente" },
    approved:  { bg: "#DCEFE3", color: "#1B6B4F", label: "Aprobada" },
    rejected:  { bg: "#F6D9D2", color: "#BD4332", label: "Rechazada" },
    cancelled: { bg: "#F0EDE6", color: "#79746B", label: "Cancelada" },
  };
  const s = styles[status];
  return (
    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "10.5px", fontWeight: 700, background: s.bg, color: s.color, borderRadius: "999px", padding: "4px 11px", whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

/* ─── Employee avatar ───────────────────────────────────────────────── */

function Avatar({ name }: { name: string }) {
  const initials = name.split(" ").slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
  return (
    <div style={{ width: "40px", height: "40px", borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg,#8FE3D0,#4FBFA6)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: "14px", color: "#063D31" }}>
      {initials}
    </div>
  );
}

/* ─── Type badge ────────────────────────────────────────────────────── */

function TypeBadge({ type }: { type?: Pick<AbsenceType, "name" | "color" | "icon"> | null }) {
  if (!type) return <span style={{ fontSize: "12px", color: "#79746B" }}>—</span>;
  const hex = type.color ?? "#79746B";
  const bgAlpha = hex + "22";
  return (
    <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "12px", fontWeight: 700, background: bgAlpha, color: hex, border: `1px solid ${hex}44`, borderRadius: "999px", padding: "4px 11px", whiteSpace: "nowrap" }}>
      {type.icon ? `${type.icon} ` : ""}{type.name}
    </span>
  );
}

/* ─── Date range ────────────────────────────────────────────────────── */

function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function DateRange({ req }: { req: AbsenceRequest }) {
  const same = req.start_date === req.end_date;
  const days = req.working_days_count;
  return (
    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "11.5px", color: "#79746B", whiteSpace: "nowrap" }}>
      {same ? fmtDate(req.start_date) : `${fmtDate(req.start_date)} → ${fmtDate(req.end_date)}`}
      {" "}
      <span style={{ color: "#1A1A17", fontWeight: 700 }}>({days} {days === 1 ? "día" : "días"})</span>
    </span>
  );
}

/* ─── Period selector ───────────────────────────────────────────────── */

function PeriodSelect({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <div style={FL}>{label}</div>
      <div style={{ display: "flex", gap: "6px" }}>
        {["full", "morning", "afternoon"].map((p) => {
          const labels: Record<string, string> = { full: "Completo", morning: "Mañana", afternoon: "Tarde" };
          const on = value === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              style={{
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontWeight: on ? 700 : 500,
                fontSize: "12.5px",
                color: on ? "#0E5C4A" : "#54504A",
                background: on ? "#DCEFE4" : "#F4F0E8",
                border: `1.5px solid ${on ? "#A8D9BC" : "#E7E1D4"}`,
                borderRadius: "8px",
                padding: "6px 12px",
                cursor: "pointer",
              }}
            >
              {labels[p]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Create modal ──────────────────────────────────────────────────── */

function CreateModal({
  employees,
  absenceTypes,
  onClose,
}: {
  employees: { id: string; name: string }[];
  absenceTypes: AbsenceType[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState("");
  const [typeId, setTypeId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [startPeriod, setStartPeriod] = useState("full");
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [endPeriod, setEndPeriod] = useState("full");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [calculatedDays, setCalculatedDays] = useState<number | null>(null);
  const [calculating, setCalculating] = useState(false);

  const selectedType = absenceTypes.find((t) => t.id === typeId);

  const calculateDays = useCallback(async () => {
    if (!startDate || !endDate) return;
    setCalculating(true);
    try {
      const res = await fetch("/api/absence-requests/calculate-days", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: employeeId || undefined,
          start_date: startDate, start_period: startPeriod,
          end_date: endDate, end_period: endPeriod,
        }),
      });
      const data = await res.json();
      setCalculatedDays(data.working_days_count ?? null);
    } catch {
      setCalculatedDays(null);
    } finally {
      setCalculating(false);
    }
  }, [employeeId, startDate, startPeriod, endDate, endPeriod]);

  useEffect(() => {
    calculateDays();
  }, [calculateDays]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!employeeId || !typeId || !startDate || !endDate) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/absence-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: employeeId,
          absence_type_id: typeId,
          start_date: startDate,
          start_period: startPeriod,
          end_date: endDate,
          end_period: endPeriod,
          comment: comment || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al crear");
      router.refresh();
      onClose();
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(26,26,23,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: "520px", maxHeight: "90vh", overflowY: "auto", background: "#FCFAF6", border: "1.5px solid #1A1A17", borderRadius: "18px", boxShadow: "6px 6px 0 #1A1A17", padding: "28px" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "22px" }}>
          <h2 style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: "22px", letterSpacing: "-.5px", margin: 0 }}>
            Nueva ausencia
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#79746B", padding: "4px" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
          </button>
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* Employee */}
          <div>
            <div style={{ ...FL, marginBottom: "7px" }}>Empleado *</div>
            <NativeSelect value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required>
              <option value="">Seleccionar empleado…</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </NativeSelect>
          </div>

          {/* Type */}
          <div>
            <div style={{ ...FL, marginBottom: "7px" }}>Tipo de ausencia *</div>
            <NativeSelect value={typeId} onChange={(e) => setTypeId(e.target.value)} required>
              <option value="">Seleccionar tipo…</option>
              {absenceTypes.map((t) => (
                <option key={t.id} value={t.id}>{t.icon ? `${t.icon} ` : ""}{t.name}</option>
              ))}
            </NativeSelect>
            {selectedType && (
              <div style={{ marginTop: "7px", display: "flex", gap: "8px", alignItems: "center" }}>
                <TypeBadge type={selectedType} />
                {selectedType.requires_approval && (
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: "#946312", background: "#F8E7C4", borderRadius: "999px", padding: "3px 9px" }}>Requiere aprobación</span>
                )}
              </div>
            )}
          </div>

          {/* Date range */}
          <div>
            <div style={{ ...FL, marginBottom: "7px" }}>Fechas *</div>
            <DateRangeField from={startDate} to={endDate} onFromChange={setStartDate} onToChange={setEndDate} />
          </div>

          {/* Periods */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div>
              <div style={{ ...FL, marginBottom: "7px" }}>Período inicio</div>
              <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                {["full", "morning", "afternoon"].map((p) => {
                  const labels: Record<string, string> = { full: "Completo", morning: "Mañana", afternoon: "Tarde" };
                  const on = startPeriod === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setStartPeriod(p)}
                      style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: on ? 700 : 500, fontSize: "11.5px", color: on ? "#0E5C4A" : "#54504A", background: on ? "#DCEFE4" : "#F4F0E8", border: `1.5px solid ${on ? "#A8D9BC" : "#E7E1D4"}`, borderRadius: "8px", padding: "5px 10px", cursor: "pointer" }}
                    >
                      {labels[p]}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <div style={{ ...FL, marginBottom: "7px" }}>Período fin</div>
              <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                {["full", "morning", "afternoon"].map((p) => {
                  const labels: Record<string, string> = { full: "Completo", morning: "Mañana", afternoon: "Tarde" };
                  const on = endPeriod === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setEndPeriod(p)}
                      style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: on ? 700 : 500, fontSize: "11.5px", color: on ? "#0E5C4A" : "#54504A", background: on ? "#DCEFE4" : "#F4F0E8", border: `1.5px solid ${on ? "#A8D9BC" : "#E7E1D4"}`, borderRadius: "8px", padding: "5px 10px", cursor: "pointer" }}
                    >
                      {labels[p]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Working days (auto-calculated) */}
          {(calculating || calculatedDays !== null) && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", background: "#F4F0E8", borderRadius: "10px", border: "1.5px solid #E7E1D4" }}>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "10.5px", color: "#79746B", textTransform: "uppercase", letterSpacing: ".5px" }}>
                Días laborables
              </span>
              {calculating ? (
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "12px", color: "#79746B" }}>calculando…</span>
              ) : (
                <span style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: "20px", color: "#0E5C4A", letterSpacing: "-0.5px" }}>
                  {calculatedDays} {calculatedDays === 1 ? "día" : "días"}
                </span>
              )}
            </div>
          )}

          {/* Comment */}
          <div>
            <div style={{ ...FL, marginBottom: "7px" }}>Comentario</div>
            <Textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Motivo o información adicional…"
            />
          </div>

          {error && (
            <div style={{ background: "#F6D9D2", border: "1px solid #F0A89E", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", color: "#BD4332" }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: "10px", paddingTop: "4px" }}>
            <button type="submit" disabled={saving || !employeeId || !typeId} style={{ ...BTN_PRIMARY, opacity: saving || !employeeId || !typeId ? .6 : 1 }}>
              {saving ? "Guardando…" : "Crear solicitud"}
            </button>
            <button type="button" onClick={onClose} style={BTN_GHOST}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Reject modal ──────────────────────────────────────────────────── */

function RejectModal({ requestId, onClose }: { requestId: string; onClose: () => void }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch(`/api/absence-requests/${requestId}/reject`, {
        method: "POST",
        json: { rejection_reason: reason },
      });
      router.refresh();
      onClose();
    } catch (err) {
      notifyError("No se pudo rechazar la solicitud", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(26,26,23,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "420px", background: "#FCFAF6", border: "1.5px solid #1A1A17", borderRadius: "18px", boxShadow: "6px 6px 0 #1A1A17", padding: "26px" }}>
        <h2 style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: "20px", letterSpacing: "-.5px", margin: "0 0 16px" }}>
          Rechazar solicitud
        </h2>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <div style={{ ...FL, marginBottom: "7px" }}>Motivo (opcional)</div>
            <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explica el motivo del rechazo…" />
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button type="submit" disabled={saving} style={{ ...BTN_DANGER, padding: "10px 20px", fontSize: "13px", boxShadow: "3px 3px 0 #1A1A17" }}>
              {saving ? "Rechazando…" : "Confirmar rechazo"}
            </button>
            <button type="button" onClick={onClose} style={BTN_GHOST}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Filter tab ────────────────────────────────────────────────────── */

function FilterTab({ label, active, count, onClick }: { label: string; active: boolean; count?: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: active ? "'Archivo', sans-serif" : "'Hanken Grotesk', sans-serif",
        fontWeight: active ? 800 : 500,
        fontSize: "13.5px",
        color: active ? "#fff" : "#79746B",
        background: active ? "#1A1A17" : "transparent",
        border: "none",
        borderRadius: "9px",
        padding: "8px 16px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "7px",
        whiteSpace: "nowrap" as const,
      }}
    >
      {label}
      {count !== undefined && (
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "10.5px", fontWeight: 700, background: active ? "rgba(255,255,255,.2)" : "#E7E1D4", color: active ? "#fff" : "#79746B", borderRadius: "999px", padding: "2px 7px" }}>
          {count}
        </span>
      )}
    </button>
  );
}

/* ─── Request row ────────────────────────────────────────────────────── */

function RequestRow({
  req,
  onApprove,
  onReject,
  onCancel,
  loading,
}: {
  req: AbsenceRequest;
  onApprove: () => void;
  onReject: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const emp = req.employees as Employee | undefined;
  const type = req.absence_types as Pick<AbsenceType, "name" | "color" | "icon"> | undefined;

  return (
    <div
      style={{
        background: "#FCFAF6",
        border: "1px solid #E7E1D4",
        borderRadius: "14px",
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        gap: "16px",
        flexWrap: "wrap",
        transition: "box-shadow .15s ease",
      }}
      className="card-hover"
    >
      {/* Employee info */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: "1 1 200px", minWidth: 0 }}>
        <Avatar name={emp?.name ?? "?"} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: "14.5px", letterSpacing: "-.3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {emp?.name ?? "—"}
          </div>
          <div style={{ fontSize: "12px", color: "#79746B", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {emp?.role_title ?? emp?.department ?? ""}
          </div>
        </div>
      </div>

      {/* Type badge */}
      <div style={{ flex: "0 0 auto" }}>
        <TypeBadge type={type} />
      </div>

      {/* Date range */}
      <div style={{ flex: "1 1 160px" }}>
        <DateRange req={req} />
      </div>

      {/* Status */}
      <div>
        <StatusBadge status={req.status} />
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "8px", flex: "0 0 auto" }}>
        {req.status === "pending" && (
          <>
            <button onClick={onApprove} disabled={loading} style={{ ...BTN_SUCCESS, opacity: loading ? .6 : 1 }}>
              ✓ Aprobar
            </button>
            <button onClick={onReject} disabled={loading} style={{ ...BTN_DANGER, opacity: loading ? .6 : 1 }}>
              ✕ Rechazar
            </button>
          </>
        )}
        {req.status === "approved" && (
          <button onClick={onCancel} disabled={loading} style={{ ...BTN_OUTLINE, opacity: loading ? .6 : 1 }}>
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Empty state ────────────────────────────────────────────────────── */

function EmptyState({ filter }: { filter: string }) {
  const msgs: Record<string, string> = {
    all: "No hay solicitudes de ausencia.",
    pending: "No hay solicitudes pendientes.",
    approved: "No hay ausencias aprobadas.",
    rejected: "No hay solicitudes rechazadas.",
  };
  return (
    <div style={{ textAlign: "center", padding: "60px 24px", background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "16px" }}>
      <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: "#F4F0E8", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="4" width="18" height="18" rx="2" stroke="#79746B" strokeWidth="2"/>
          <path d="M16 2v4M8 2v4M3 10h18" stroke="#79746B" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>
      <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: "17px", color: "#1A1A17" }}>{msgs[filter] ?? "Sin resultados"}</div>
      <div style={{ fontSize: "13.5px", color: "#79746B", marginTop: "6px" }}>Las solicitudes aparecerán aquí cuando se creen.</div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────── */

export type AbsencePanelStats = {
  pending: number;
  approvedThisMonth: number;
  totalThisYear: number;
  onLeaveToday: number;
};

export function AbsencePanel({
  requests,
  employees,
  absenceTypes,
  stats,
}: {
  requests: AbsenceRequest[];
  employees: { id: string; name: string }[];
  absenceTypes: AbsenceType[];
  stats: AbsencePanelStats;
}) {
  const router = useRouter();

  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [showCreate, setShowCreate] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const [empFilter, setEmpFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const hasAdvancedFilter = empFilter.length > 0 || !!typeFilter || !!dateFrom || !!dateTo;

  const filtered = useMemo(() => {
    let result = requests;
    if (filter !== "all") result = result.filter((r) => r.status === filter);
    if (empFilter.length > 0) result = result.filter((r) => empFilter.includes(r.employee_id));
    if (typeFilter) result = result.filter((r) => r.absence_type_id === typeFilter);
    if (dateFrom) result = result.filter((r) => r.end_date >= dateFrom);
    if (dateTo) result = result.filter((r) => r.start_date <= dateTo);
    return result;
  }, [requests, filter, empFilter, typeFilter, dateFrom, dateTo]);

  const counts = useMemo(() => ({
    all: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  }), [requests]);

  async function handleApprove(id: string) {
    setLoadingId(id);
    try {
      await apiFetch(`/api/absence-requests/${id}/approve`, { method: "POST" });
      router.refresh();
    } catch (e) {
      notifyError("No se pudo aprobar la solicitud", e);
    } finally {
      setLoadingId(null);
    }
  }

  async function handleCancel(id: string) {
    setLoadingId(id);
    try {
      await apiFetch(`/api/absence-requests/${id}/cancel`, { method: "POST" });
      router.refresh();
    } catch (e) {
      notifyError("No se pudo cancelar la solicitud", e);
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <>
      {/* ─── Stats ─────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px", marginBottom: "24px" }}>
        {[
          { label: "Pendientes", value: stats.pending, hint: stats.pending > 0 ? "por revisar" : undefined, hintColor: "#946312" },
          { label: "Aprobadas este mes", value: stats.approvedThisMonth, hint: undefined, hintColor: "#1B6B4F" },
          { label: "Total este año", value: stats.totalThisYear, hint: undefined, hintColor: "#2B5E8A" },
          { label: "De baja hoy", value: stats.onLeaveToday, hint: stats.onLeaveToday > 0 ? "en ausencia" : undefined, hintColor: "#79746B" },
        ].map(({ label, value, hint, hintColor }) => (
          <div
            key={label}
            style={{ background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "14px", padding: "16px 18px" }}
          >
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "10.5px", color: "#79746B", textTransform: "uppercase", letterSpacing: ".5px" }}>{label}</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", marginTop: "6px" }}>
              <span style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: "32px", letterSpacing: "-1px", lineHeight: 1 }}>{value}</span>
              {hint && <span style={{ fontSize: "11.5px", fontWeight: 700, color: hintColor, paddingBottom: "4px" }}>{hint}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* ─── Header: filter tabs + new button ─────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "2px", background: "#F4F0E8", border: "1px solid #E7E1D4", borderRadius: "11px", padding: "4px" }}>
          <FilterTab label="Todas" active={filter === "all"} count={counts.all} onClick={() => setFilter("all")} />
          <FilterTab label="Pendientes" active={filter === "pending"} count={counts.pending} onClick={() => setFilter("pending")} />
          <FilterTab label="Aprobadas" active={filter === "approved"} count={counts.approved} onClick={() => setFilter("approved")} />
          <FilterTab label="Rechazadas" active={filter === "rejected"} count={counts.rejected} onClick={() => setFilter("rejected")} />
        </div>

        <button
          onClick={() => setShowCreate(true)}
          style={BTN_PRIMARY}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
          Nueva ausencia
        </button>
      </div>

      {/* ─── Advanced filters ──────────────────────────────────────── */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap", alignItems: "flex-end" }}>
        <EmployeeMultiSelect employees={employees} value={empFilter} onChange={setEmpFilter} />
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: "140px" }}>
          <div style={{ ...FL, marginBottom: "2px" }}>Tipo</div>
          <NativeSelect value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">Todos</option>
            {absenceTypes.map((t) => <option key={t.id} value={t.id}>{t.icon ? `${t.icon} ` : ""}{t.name}</option>)}
          </NativeSelect>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <div style={{ ...FL, marginBottom: "2px" }}>Rango</div>
          <DateRangeField from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
        </div>
        {hasAdvancedFilter && (
          <button
            onClick={() => { setEmpFilter([]); setTypeFilter(""); setDateFrom(""); setDateTo(""); }}
            style={{ ...BTN_GHOST, border: `1.5px solid #E7E1D4`, borderRadius: "9px", padding: "8px 14px", fontSize: "12px", whiteSpace: "nowrap" }}
          >
            Limpiar
          </button>
        )}
      </div>

      {/* ─── Request list ──────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {filtered.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          filtered.map((req) => (
            <RequestRow
              key={req.id}
              req={req}
              loading={loadingId === req.id}
              onApprove={() => handleApprove(req.id)}
              onReject={() => setRejectId(req.id)}
              onCancel={() => handleCancel(req.id)}
            />
          ))
        )}
      </div>

      {/* ─── Modals ────────────────────────────────────────────────── */}
      {showCreate && (
        <CreateModal
          employees={employees}
          absenceTypes={absenceTypes}
          onClose={() => setShowCreate(false)}
        />
      )}
      {rejectId && (
        <RejectModal
          requestId={rejectId}
          onClose={() => setRejectId(null)}
        />
      )}
    </>
  );
}
