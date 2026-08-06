"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { AbsenceType } from "@/lib/types";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { DateRangeField } from "@/components/ui/date-range-field";

/**
 * Formulario de solicitud de ausencia, compartido por el admin de RR.HH. y el portal.
 *
 * Sin `employees` se comporta como autoservicio: no manda `employee_id` y el servidor resuelve
 * quién eres. Con `employees`, RR.HH. elige por quién da de alta la ausencia.
 *
 * El selector de tramo (mañana / tarde / día completo) estaba escrito tres veces en el panel del
 * admin; aquí es un solo componente.
 */

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

export function PeriodPicker({
  value, onChange, label,
}: { value: string; onChange: (v: string) => void; label: string }) {
  const t = useTranslations("Timeoff");
  const labels: Record<string, string> = {
    full: t("timeoff.periods.full"),
    morning: t("timeoff.periods.morning"),
    afternoon: t("timeoff.periods.afternoon"),
  };
  return (
    <div>
      <div style={{ ...FL, marginBottom: "7px" }}>{label}</div>
      <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
        {["full", "morning", "afternoon"].map((p) => {
          const on = value === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              style={{
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontWeight: on ? 700 : 500,
                fontSize: "11.5px",
                color: on ? "#0E5C4A" : "#54504A",
                background: on ? "#DCEFE4" : "#F4F0E8",
                border: `1.5px solid ${on ? "#A8D9BC" : "#E7E1D4"}`,
                borderRadius: "8px",
                padding: "5px 10px",
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

export function AbsenceRequestForm({
  absenceTypes,
  employees,
  onDone,
  onCancel,
}: {
  absenceTypes: Pick<AbsenceType, "id" | "name" | "icon" | "color" | "requires_approval" | "requires_document">[];
  /** Presente solo en el admin: sin él, la solicitud es para uno mismo. */
  employees?: { id: string; name: string }[];
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const t = useTranslations("Timeoff");
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [employeeId, setEmployeeId] = useState("");
  const [typeId, setTypeId] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [startPeriod, setStartPeriod] = useState("full");
  const [endDate, setEndDate] = useState(today);
  const [endPeriod, setEndPeriod] = useState("full");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [calculatedDays, setCalculatedDays] = useState<number | null>(null);
  const [calculating, setCalculating] = useState(false);

  const selfService = !employees;
  const selectedType = absenceTypes.find((typeObj) => typeObj.id === typeId);

  const calculateDays = useCallback(async () => {
    if (!startDate || !endDate || endDate < startDate) return;
    setCalculating(true);
    try {
      const res = await fetch("/api/absence-requests/calculate-days", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: selfService ? undefined : employeeId || undefined,
          start_date: startDate, start_period: startPeriod,
          end_date: endDate, end_period: endPeriod,
        }),
      });
      const data = await res.json();
      setCalculatedDays(res.ok ? data.working_days_count ?? null : null);
    } catch {
      setCalculatedDays(null);
    } finally {
      setCalculating(false);
    }
  }, [selfService, employeeId, startDate, startPeriod, endDate, endPeriod]);

  useEffect(() => { calculateDays(); }, [calculateDays]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!typeId || !startDate || !endDate || (!selfService && !employeeId)) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/absence-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: selfService ? undefined : employeeId,
          absence_type_id: typeId,
          start_date: startDate,
          start_period: startPeriod,
          end_date: endDate,
          end_period: endPeriod,
          comment: comment || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("timeoff.createModal.errorMsg"));
      router.refresh();
      onDone?.();
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setSaving(false);
    }
  }

  const incomplete = !typeId || (!selfService && !employeeId);

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      {employees && (
        <div>
          <div style={{ ...FL, marginBottom: "7px" }}>{t("timeoff.createModal.employee")}</div>
          <NativeSelect value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required>
            <option value="">{t("timeoff.createModal.employeePlaceholder")}</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </NativeSelect>
        </div>
      )}

      <div>
        <div style={{ ...FL, marginBottom: "7px" }}>{t("timeoff.createModal.type")}</div>
        <NativeSelect value={typeId} onChange={(e) => setTypeId(e.target.value)} required>
          <option value="">{t("timeoff.createModal.typePlaceholder")}</option>
          {absenceTypes.map((typeObj) => (
            <option key={typeObj.id} value={typeObj.id}>{typeObj.icon ? `${typeObj.icon} ` : ""}{typeObj.name}</option>
          ))}
        </NativeSelect>
        {selectedType?.requires_approval && (
          <div style={{ marginTop: "7px" }}>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: "#946312", background: "#F8E7C4", borderRadius: "999px", padding: "3px 9px" }}>
              {t("timeoff.createModal.requiresApproval")}
            </span>
          </div>
        )}
      </div>

      <div>
        <div style={{ ...FL, marginBottom: "7px" }}>{t("timeoff.createModal.dates")}</div>
        <DateRangeField from={startDate} to={endDate} onFromChange={setStartDate} onToChange={setEndDate} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
        <PeriodPicker value={startPeriod} onChange={setStartPeriod} label={t("timeoff.createModal.startPeriod")} />
        <PeriodPicker value={endPeriod} onChange={setEndPeriod} label={t("timeoff.createModal.endPeriod")} />
      </div>

      {(calculating || calculatedDays !== null) && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", background: "#F4F0E8", borderRadius: "10px", border: "1.5px solid #E7E1D4" }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "10.5px", color: "#79746B", textTransform: "uppercase", letterSpacing: ".5px" }}>
            {t("timeoff.createModal.workingDays")}
          </span>
          {calculating ? (
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "12px", color: "#79746B" }}>{t("timeoff.createModal.calculating")}</span>
          ) : (
            <span style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: "20px", color: "#0E5C4A", letterSpacing: "-0.5px" }}>
              {calculatedDays} {calculatedDays === 1 ? t("timeoff.duration.day") : t("timeoff.duration.days")}
            </span>
          )}
        </div>
      )}

      <div>
        <div style={{ ...FL, marginBottom: "7px" }}>{t("timeoff.createModal.comment")}</div>
        <Textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t("timeoff.createModal.commentPlaceholder")} />
      </div>

      {error && (
        <div style={{ background: "#F6D9D2", border: "1px solid #F0A89E", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", color: "#BD4332" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: "10px", paddingTop: "4px" }}>
        <button type="submit" disabled={saving || incomplete} style={{ ...BTN_PRIMARY, opacity: saving || incomplete ? .6 : 1 }}>
          {saving ? t("timeoff.createModal.saving") : t("timeoff.createModal.saveBtn")}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} style={BTN_GHOST}>{t("timeoff.createModal.cancelBtn")}</button>
        )}
      </div>
    </form>
  );
}
