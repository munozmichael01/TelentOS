import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { createClient } from "@/lib/supabase/server";
import type { AbsenceRequest, CompanyHoliday, Employee } from "@/lib/types";
import Link from "next/link";
import { CalendarWithFilter } from "@/components/features/calendar-with-filter";

/* ─── Style helpers ──────────────────────────────────────────────────── */

const FL = {
  fontFamily: "'Space Mono', monospace",
  fontSize: "10.5px",
  textTransform: "uppercase" as const,
  letterSpacing: ".6px",
  color: "#79746B",
};

/* ─── Weekday helpers ────────────────────────────────────────────────── */

const WEEKDAYS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS_ES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/* ─── Week bar (a row of days showing one employee's absences) ──────── */

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

/* ─── Parse month from query param ──────────────────────────────────── */

function parseMonth(param: string | undefined): { year: number; month: number } {
  if (param && /^\d{4}-\d{2}$/.test(param)) {
    const [y, m] = param.split("-").map(Number);
    if (y >= 2020 && y <= 2100 && m >= 1 && m <= 12) {
      return { year: y, month: m - 1 };
    }
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

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

  // Build holiday set for quick lookup
  const holidayDates = new Set<string>();
  for (const h of holidays) {
    // Support repeats_annually
    if (h.repeats_annually) {
      const hDate = new Date(h.date + "T12:00:00");
      const adjusted = toDateStr(year, month, hDate.getUTCDate());
      // Only add if same month-day
      const hMonth = hDate.getUTCMonth();
      const hDay = hDate.getUTCDate();
      if (hMonth === month) {
        holidayDates.add(toDateStr(year, month, hDay));
      }
    } else {
      if (h.date.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`)) {
        holidayDates.add(h.date.slice(0, 10));
      }
    }
  }

  // Build absence map: employeeId -> dayStr -> DayAbsence
  const absenceMap: Record<string, Record<string, DayAbsence>> = {};
  for (const abs of absences) {
    const empId = abs.employee_id;
    if (!absenceMap[empId]) absenceMap[empId] = {};

    const start = abs.start_date;
    const end = abs.end_date;
    const type = abs.absence_types as { name: string; color: string; icon: string } | undefined;
    const color = type?.color ?? "#79746B";

    // Walk each day in range within this month
    for (let d = 1; d <= daysCount; d++) {
      const ds = toDateStr(year, month, d);
      if (ds >= start && ds <= end) {
        absenceMap[empId][ds] = {
          color,
          icon: type?.icon ?? "",
          name: type?.name ?? "Ausencia",
          status: abs.status,
          startPeriod: abs.start_period,
          endPeriod: abs.end_period,
          isStart: ds === start,
          isEnd: ds === end,
        };
      }
    }
  }

  // Unique absence types for legend
  const legendTypes: { name: string; color: string; icon: string }[] = [];
  const seenNames = new Set<string>();
  for (const abs of absences) {
    const t = abs.absence_types as { name: string; color: string; icon: string } | undefined;
    if (t && !seenNames.has(t.name)) {
      legendTypes.push(t);
      seenNames.add(t.name);
    }
  }

  const COL_W = 32;
  const EMPLOYEE_COL_W = 180;

  return (
    <div style={{ overflowX: "auto", background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "16px" }}>
      <div style={{ minWidth: `${EMPLOYEE_COL_W + daysCount * COL_W + 40}px` }}>
        {/* Header row: employee col + day numbers */}
        <div style={{ display: "flex", alignItems: "stretch", borderBottom: "2px solid #E7E1D4", background: "#F4F0E8", borderRadius: "16px 16px 0 0", overflow: "hidden" }}>
          {/* Employee col header */}
          <div style={{ width: `${EMPLOYEE_COL_W}px`, flexShrink: 0, padding: "12px 16px", borderRight: "1px solid #E7E1D4", display: "flex", alignItems: "center" }}>
            <span style={{ ...FL }}>Empleado</span>
          </div>
          {/* Day headers */}
          <div style={{ display: "flex", flex: 1 }}>
            {days.map((d) => {
              const ds = toDateStr(year, month, d);
              const dow = new Date(ds + "T12:00:00").getDay();
              const isWeekend = dow === 0 || dow === 6;
              const isToday = ds === today;
              const isHoliday = holidayDates.has(ds);
              return (
                <div
                  key={d}
                  style={{
                    width: `${COL_W}px`,
                    flexShrink: 0,
                    padding: "8px 0 6px",
                    textAlign: "center",
                    borderRight: "1px solid #E7E1D4",
                    background: isToday ? "#0E5C4A" : isHoliday ? "#F6D9D2" : isWeekend ? "#ECEAE4" : "transparent",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "2px",
                  }}
                >
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

        {/* Employee rows */}
        {employees.length === 0 && (
          <div style={{ padding: "40px 24px", textAlign: "center", color: "#79746B", fontSize: "14px" }}>
            No hay empleados activos.
          </div>
        )}
        {employees.map((emp, rowIdx) => {
          const empAbsences = absenceMap[emp.id] ?? {};
          const empInitials = emp.name.split(" ").slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
          const isLastRow = rowIdx === employees.length - 1;

          return (
            <div
              key={emp.id}
              style={{
                display: "flex",
                alignItems: "stretch",
                borderBottom: isLastRow ? "none" : "1px solid #E7E1D4",
                minHeight: "44px",
              }}
            >
              {/* Employee name */}
              <div style={{ width: `${EMPLOYEE_COL_W}px`, flexShrink: 0, borderRight: "1px solid #E7E1D4", padding: "8px 12px 8px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg,#8FE3D0,#4FBFA6)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: "11px", color: "#063D31" }}>
                  {empInitials}
                </div>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#1A1A17", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {emp.name}
                </span>
              </div>

              {/* Day cells */}
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
                    <div
                      key={d}
                      title={absence ? `${absence.name}${absence.status === "pending" ? " (pendiente)" : ""}` : undefined}
                      style={{
                        width: `${COL_W}px`,
                        flexShrink: 0,
                        borderRight: "1px solid #E7E1D4",
                        background: cellBg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        position: "relative",
                        padding: "4px 2px",
                      }}
                    >
                      {absence && (() => {
                        const hex = absence.color;
                        const isPending = absence.status === "pending";
                        const barStyle: React.CSSProperties = {
                          position: "absolute",
                          top: "7px",
                          bottom: "7px",
                          background: isPending ? `${hex}88` : hex,
                          borderRadius: absence.isStart && absence.isEnd ? "6px" : absence.isStart ? "6px 0 0 6px" : absence.isEnd ? "0 6px 6px 0" : "0",
                          border: isPending ? `1.5px dashed ${hex}` : "none",
                          boxShadow: isPending ? "none" : `inset 0 1px 0 rgba(255,255,255,.3)`,
                        };

                        // Half-day handling
                        if (absence.isStart && absence.startPeriod === "afternoon") {
                          return (
                            <div style={{ ...barStyle, left: "50%", right: 0, borderRadius: absence.isEnd && absence.endPeriod !== "morning" ? "0 6px 6px 0" : "0" }} />
                          );
                        }
                        if (absence.isEnd && absence.endPeriod === "morning") {
                          return (
                            <div style={{ ...barStyle, left: 0, right: "50%", borderRadius: absence.isStart && absence.startPeriod !== "afternoon" ? "6px 0 0 6px" : "0" }} />
                          );
                        }

                        const left = absence.isStart ? "3px" : "0";
                        const right = absence.isEnd ? "3px" : "0";

                        return (
                          <div style={{
                            ...barStyle,
                            left,
                            right,
                            borderRadius: absence.isStart && absence.isEnd ? "6px" : absence.isStart ? "6px 0 0 6px" : absence.isEnd ? "0 6px 6px 0" : "0",
                          }} />
                        );
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

/* ─── Month navigation header ────────────────────────────────────────── */

function MonthNav({ year, month }: { year: number; month: number }) {
  const prev = new Date(year, month - 1, 1);
  const next = new Date(year, month + 1, 1);
  const prevParam = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
  const nextParam = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;

  const navBtn = {
    fontFamily: "'Archivo', sans-serif",
    fontWeight: 800,
    fontSize: "13px",
    color: "#1A1A17",
    background: "#FCFAF6",
    border: "2px solid #1A1A17",
    boxShadow: "3px 3px 0 #1A1A17",
    borderRadius: "10px",
    padding: "8px 16px",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    cursor: "pointer",
  } as const;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px", flexWrap: "wrap" }}>
      <Link href={`?month=${prevParam}`} style={navBtn}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Anterior
      </Link>
      <h2 style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: "22px", letterSpacing: "-.5px", margin: 0, color: "#1A1A17" }}>
        {MONTHS_ES[month]} {year}
      </h2>
      <Link href={`?month=${nextParam}`} style={navBtn}>
        Siguiente
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </Link>
    </div>
  );
}

/* ─── Legend ─────────────────────────────────────────────────────────── */

function Legend({ items }: { items: { name: string; color: string; icon: string }[] }) {
  if (items.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "18px" }}>
      {items.map((item) => (
        <div key={item.name} style={{ display: "flex", alignItems: "center", gap: "7px", background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "999px", padding: "5px 12px" }}>
          <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: item.color, flexShrink: 0 }} />
          <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "12.5px", fontWeight: 600, color: "#1A1A17" }}>
            {item.icon ? `${item.icon} ` : ""}{item.name}
          </span>
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", gap: "7px", background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "999px", padding: "5px 12px" }}>
        <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: "#ECEAE4", flexShrink: 0 }} />
        <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "12.5px", fontWeight: 600, color: "#79746B" }}>Fin de semana</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "7px", background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "999px", padding: "5px 12px" }}>
        <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: "#F6D9D2", border: "1px solid #F0A89E", flexShrink: 0 }} />
        <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "12.5px", fontWeight: 600, color: "#BD4332" }}>Festivo</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "7px", background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "999px", padding: "5px 12px" }}>
        <div style={{ width: "12px", height: "4px", borderRadius: "2px", background: "rgba(100,160,100,.5)", border: "1.5px dashed #1B6B4F", flexShrink: 0 }} />
        <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "12.5px", fontWeight: 600, color: "#79746B" }}>Pendiente</span>
      </div>
    </div>
  );
}


/* ─── Page ───────────────────────────────────────────────────────────── */

export default async function TimeOffCalendarPage({
  searchParams,
}: {
  searchParams: { month?: string };
}) {
  const supabase = createClient();

  const { year, month } = parseMonth(searchParams.month);

  // Date range: current month
  const from = toDateStr(year, month, 1);
  const to = toDateStr(year, month, getDaysInMonth(year, month));

  // Fetch company
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (!company) {
    return (
      <div>
        <PageHeader title="Calendario de ausencias" eyebrow="Ausencias" />
        <p style={{ color: "#79746B", fontSize: "14px" }}>No se encontró una empresa configurada.</p>
      </div>
    );
  }

  const [
    { data: absences },
    { data: employees },
    { data: holidays },
  ] = await Promise.all([
    supabase
      .from("absence_requests")
      .select("*, employees!employee_id(name), absence_types(name, color, icon)")
      .eq("company_id", company.id)
      .in("status", ["pending", "approved"])
      .lte("start_date", to)
      .gte("end_date", from)
      .order("start_date"),
    supabase
      .from("employees")
      .select("id, name")
      .eq("status", "active")
      .order("name"),
    supabase
      .from("company_holidays")
      .select("*")
      .eq("company_id", company.id),
  ]);

  const allAbsences = (absences ?? []) as unknown as AbsenceRequest[];
  const allEmployees = employees ?? [];
  const allHolidays = (holidays ?? []) as unknown as CompanyHoliday[];

  // Summary stats for this month
  const totalAbsences = allAbsences.length;
  const pendingAbsences = allAbsences.filter((a) => a.status === "pending").length;
  const approvedAbsences = allAbsences.filter((a) => a.status === "approved").length;

  // Unique absence types for legend
  const legendTypes: { name: string; color: string; icon: string }[] = [];
  const seenNames = new Set<string>();
  for (const abs of allAbsences) {
    const t = abs.absence_types as { name: string; color: string; icon: string } | undefined;
    if (t && !seenNames.has(t.name)) {
      legendTypes.push(t);
      seenNames.add(t.name);
    }
  }

  return (
    <div>
      <PageHeader title="Calendario de ausencias" eyebrow="Ausencias">
        <Link
          href="/app/timeoff"
          style={{
            fontFamily: "'Archivo', sans-serif",
            fontWeight: 700,
            fontSize: "13px",
            color: "#1A1A17",
            background: "#FCFAF6",
            border: "2px solid #1A1A17",
            boxShadow: "3px 3px 0 #1A1A17",
            borderRadius: "11px",
            padding: "9px 18px",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "7px",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Lista de solicitudes
        </Link>
      </PageHeader>

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px", marginBottom: "24px" }}>
        <StatCard label="Total este mes" value={totalAbsences} />
        <StatCard label="Aprobadas" value={approvedAbsences} />
        <StatCard label="Pendientes" value={pendingAbsences} />
      </div>

      {/* Month navigation */}
      <MonthNav year={year} month={month} />

      {/* Calendar grid */}
      {allEmployees.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 24px", background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "16px" }}>
          <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: "17px", color: "#1A1A17" }}>No hay empleados activos</div>
          <div style={{ fontSize: "13.5px", color: "#79746B", marginTop: "6px" }}>
            Añade empleados activos para ver el calendario.
          </div>
        </div>
      ) : (
        <CalendarWithFilter
          year={year}
          month={month}
          allEmployees={allEmployees}
          absences={allAbsences}
          holidays={allHolidays}
        />
      )}

      {/* Legend */}
      <Legend items={legendTypes} />

      {/* Holiday list */}
      {allHolidays.length > 0 && (
        <div style={{ marginTop: "24px" }}>
          <div style={{ ...FL, marginBottom: "10px" }}>Festivos del mes</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {allHolidays
              .filter((h) => {
                const hDate = h.date.slice(0, 10);
                if (h.repeats_annually) {
                  const m = parseInt(h.date.slice(5, 7)) - 1;
                  return m === month;
                }
                return hDate >= from && hDate <= to;
              })
              .map((h) => (
                <div key={h.id} style={{ background: "#F6D9D2", border: "1px solid #F0A89E", borderRadius: "999px", padding: "6px 14px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "11px", color: "#BD4332", fontWeight: 700 }}>
                    {new Date(h.date + "T12:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                  </span>
                  <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "12.5px", fontWeight: 600, color: "#1A1A17" }}>
                    {h.name}
                    {h.is_half_day && <span style={{ color: "#BD4332" }}> (medio día)</span>}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
