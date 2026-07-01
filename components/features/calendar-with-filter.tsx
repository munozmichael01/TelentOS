"use client";

import { useState } from "react";
import type { AbsenceRequest, CompanyHoliday } from "@/lib/types";
import { EmployeeMultiSelect } from "@/components/features/employee-multi-select";

/* ─── Style helpers ──────────────────────────────────────────────────── */

const FL = {
  fontFamily: "'Space Mono', monospace",
  fontSize: "10.5px",
  textTransform: "uppercase" as const,
  letterSpacing: ".6px",
  color: "#79746B",
};

const WEEKDAYS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

type DayAbsence = {
  color: string;
  icon: string;
  name: string;
  status: string;
  startPeriod: string;
  endPeriod: string;
  isStart: boolean;
  isEnd: boolean;
};

/* ─── Calendar grid ─────────────────────────────────────────────────── */

function CalendarGrid({
  year,
  month,
  employees,
  absences,
  holidays,
}: {
  year: number;
  month: number;
  employees: { id: string; name: string }[];
  absences: AbsenceRequest[];
  holidays: CompanyHoliday[];
}) {
  const today = new Date().toISOString().slice(0, 10);
  const daysCount = getDaysInMonth(year, month);
  const days = Array.from({ length: daysCount }, (_, i) => i + 1);

  const holidayDates = new Set<string>();
  for (const h of holidays) {
    if (h.repeats_annually) {
      const hDate = new Date(h.date + "T12:00:00");
      const hMonth = hDate.getUTCMonth();
      const hDay = hDate.getUTCDate();
      if (hMonth === month) holidayDates.add(toDateStr(year, month, hDay));
    } else {
      if (h.date.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`)) {
        holidayDates.add(h.date.slice(0, 10));
      }
    }
  }

  const absenceMap: Record<string, Record<string, DayAbsence>> = {};
  for (const abs of absences) {
    const empId = abs.employee_id;
    if (!absenceMap[empId]) absenceMap[empId] = {};
    const start = abs.start_date;
    const end = abs.end_date;
    const type = abs.absence_types as { name: string; color: string; icon: string } | undefined;
    const color = type?.color ?? "#79746B";
    for (let d = 1; d <= daysCount; d++) {
      const ds = toDateStr(year, month, d);
      if (ds >= start && ds <= end) {
        absenceMap[empId][ds] = {
          color, icon: type?.icon ?? "", name: type?.name ?? "Ausencia",
          status: abs.status, startPeriod: abs.start_period, endPeriod: abs.end_period,
          isStart: ds === start, isEnd: ds === end,
        };
      }
    }
  }

  const COL_W = 32;
  const EMPLOYEE_COL_W = 180;

  return (
    <div style={{ overflowX: "auto", background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "16px" }}>
      <div style={{ minWidth: `${EMPLOYEE_COL_W + daysCount * COL_W + 40}px` }}>
        <div style={{ display: "flex", alignItems: "stretch", borderBottom: "2px solid #E7E1D4", background: "#F4F0E8", borderRadius: "16px 16px 0 0", overflow: "hidden" }}>
          <div style={{ width: `${EMPLOYEE_COL_W}px`, flexShrink: 0, padding: "12px 16px", borderRight: "1px solid #E7E1D4", display: "flex", alignItems: "center" }}>
            <span style={{ ...FL }}>Empleado</span>
          </div>
          <div style={{ display: "flex", flex: 1 }}>
            {days.map((d) => {
              const ds = toDateStr(year, month, d);
              const dow = new Date(ds + "T12:00:00").getDay();
              const isWeekend = dow === 0 || dow === 6;
              const isToday = ds === today;
              const isHoliday = holidayDates.has(ds);
              return (
                <div key={d} style={{ width: `${COL_W}px`, flexShrink: 0, padding: "8px 0 6px", textAlign: "center", borderRight: "1px solid #E7E1D4", background: isToday ? "#0E5C4A" : isHoliday ? "#F6D9D2" : isWeekend ? "#ECEAE4" : "transparent", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "9px", color: isToday ? "#C6F24E" : isHoliday ? "#BD4332" : "#79746B" }}>
                    {WEEKDAYS_ES[dow]}
                  </span>
                  <span style={{ fontFamily: "'Archivo', sans-serif", fontWeight: isToday ? 900 : 700, fontSize: "13px", color: isToday ? "#fff" : isHoliday ? "#BD4332" : isWeekend ? "#79746B" : "#1A1A17" }}>
                    {d}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {employees.length === 0 && (
          <div style={{ padding: "40px 24px", textAlign: "center", color: "#79746B", fontSize: "14px" }}>
            No hay empleados que mostrar.
          </div>
        )}
        {employees.map((emp, rowIdx) => {
          const empAbsences = absenceMap[emp.id] ?? {};
          const empInitials = emp.name.split(" ").slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
          const isLastRow = rowIdx === employees.length - 1;
          return (
            <div key={emp.id} style={{ display: "flex", alignItems: "stretch", borderBottom: isLastRow ? "none" : "1px solid #E7E1D4", minHeight: "44px" }}>
              <div style={{ width: `${EMPLOYEE_COL_W}px`, flexShrink: 0, borderRight: "1px solid #E7E1D4", padding: "8px 12px 8px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg,#8FE3D0,#4FBFA6)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: "11px", color: "#063D31" }}>
                  {empInitials}
                </div>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#1A1A17", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {emp.name}
                </span>
              </div>
              <div style={{ display: "flex", flex: 1 }}>
                {days.map((d) => {
                  const ds = toDateStr(year, month, d);
                  const dow = new Date(ds + "T12:00:00").getDay();
                  const isWeekend = dow === 0 || dow === 6;
                  const isHoliday = holidayDates.has(ds);
                  const absence = empAbsences[ds];
                  let cellBg = "transparent";
                  if (isHoliday) cellBg = "#FDF0ED";
                  else if (isWeekend) cellBg = "#F7F4EE";
                  return (
                    <div key={d} title={absence ? `${absence.name}${absence.status === "pending" ? " (pendiente)" : ""}` : undefined} style={{ width: `${COL_W}px`, flexShrink: 0, borderRight: "1px solid #E7E1D4", background: cellBg, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", padding: "4px 2px" }}>
                      {absence && (() => {
                        const hex = absence.color;
                        const isPending = absence.status === "pending";
                        const barStyle: React.CSSProperties = { position: "absolute", top: "7px", bottom: "7px", background: isPending ? `${hex}88` : hex, borderRadius: absence.isStart && absence.isEnd ? "6px" : absence.isStart ? "6px 0 0 6px" : absence.isEnd ? "0 6px 6px 0" : "0", border: isPending ? `1.5px dashed ${hex}` : "none", boxShadow: isPending ? "none" : `inset 0 1px 0 rgba(255,255,255,.3)` };
                        if (absence.isStart && absence.startPeriod === "afternoon") {
                          return <div style={{ ...barStyle, left: "50%", right: 0, borderRadius: absence.isEnd && absence.endPeriod !== "morning" ? "0 6px 6px 0" : "0" }} />;
                        }
                        if (absence.isEnd && absence.endPeriod === "morning") {
                          return <div style={{ ...barStyle, left: 0, right: "50%", borderRadius: absence.isStart && absence.startPeriod !== "afternoon" ? "6px 0 0 6px" : "0" }} />;
                        }
                        return <div style={{ ...barStyle, left: absence.isStart ? "3px" : "0", right: absence.isEnd ? "3px" : "0", borderRadius: absence.isStart && absence.isEnd ? "6px" : absence.isStart ? "6px 0 0 6px" : absence.isEnd ? "0 6px 6px 0" : "0" }} />;
                      })()}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main export ────────────────────────────────────────────────────── */

export function CalendarWithFilter({
  year,
  month,
  allEmployees,
  absences,
  holidays,
}: {
  year: number;
  month: number;
  allEmployees: { id: string; name: string }[];
  absences: AbsenceRequest[];
  holidays: CompanyHoliday[];
}) {
  const [empFilter, setEmpFilter] = useState<string[]>([]);

  const visibleEmployees = empFilter.length > 0
    ? allEmployees.filter((e) => empFilter.includes(e.id))
    : allEmployees;

  return (
    <>
      {/* Employee filter */}
      <div style={{ marginBottom: "16px" }}>
        <EmployeeMultiSelect
          employees={allEmployees}
          value={empFilter}
          onChange={setEmpFilter}
          label="Filtrar empleados"
        />
      </div>

      <CalendarGrid
        year={year}
        month={month}
        employees={visibleEmployees}
        absences={absences}
        holidays={holidays}
      />
    </>
  );
}
