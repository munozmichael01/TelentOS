"use client";

import React, { useState, useRef, useEffect } from "react";
import { CalendarIcon, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS_ES = [
  "enero","febrero","marzo","abril","mayo","junio",
  "julio","agosto","septiembre","octubre","noviembre","diciembre",
];
const MONTHS_SHORT = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const WEEKDAYS = ["L","M","X","J","V","S","D"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function toStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatShort(v?: string): string {
  if (!v) return "";
  const [, m, d] = v.split("-").map(Number);
  return `${d} ${MONTHS_SHORT[m - 1]}`;
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T12:00:00");
  const db = new Date(b + "T12:00:00");
  return Math.round(Math.abs((db.getTime() - da.getTime()) / 86400000)) + 1;
}

function CalendarRange({
  year, month, from, to, phase, hoverDate,
  onSelect, onNav, onHover,
}: {
  year: number; month: number;
  from?: string; to?: string; phase: "from" | "to"; hoverDate?: string;
  onSelect: (d: string) => void; onNav: (y: number, m: number) => void;
  onHover: (d?: string) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const daysInMonth = getDaysInMonth(year, month);
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;

  const cells: (number | null)[] = Array(firstDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const rangeEnd = phase === "to" && from ? (hoverDate && hoverDate >= from ? hoverDate : to) : to;

  return (
    <div
      style={{
        background: "#FCFAF6", border: "1.5px solid #1A1A17", borderRadius: 14,
        boxShadow: "0 24px 50px -28px rgba(26,26,23,.4)", width: 264, padding: 14,
        position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 200,
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {/* Phase hint */}
      <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: "#79746B", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8 }}>
        {phase === "from" ? "Selecciona inicio" : "Selecciona fin"}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <button
          type="button"
          onClick={() => { const d = new Date(year, month - 1, 1); onNav(d.getFullYear(), d.getMonth()); }}
          style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #E7E1D4", borderRadius: 8, background: "none", cursor: "pointer" }}
        >
          <ChevronLeft size={12} color="#79746B" />
        </button>
        <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 14, color: "#1A1A17" }}>
          {MONTHS_ES[month]} {year}
        </span>
        <button
          type="button"
          onClick={() => { const d = new Date(year, month + 1, 1); onNav(d.getFullYear(), d.getMonth()); }}
          style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #E7E1D4", borderRadius: 8, background: "none", cursor: "pointer" }}
        >
          <ChevronRight size={12} color="#79746B" />
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginBottom: 4 }}>
        {WEEKDAYS.map((w) => (
          <div key={w} style={{ textAlign: "center", fontFamily: "'Space Mono',monospace", fontSize: 9.5, color: "#79746B", padding: "2px 0" }}>
            {w}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} style={{ height: 31 }} />;
          const ds = toStr(year, month, d);
          const col = i % 7; // 0=Mon, 6=Sun

          const isFrom = ds === from;
          const isTo = ds === rangeEnd;
          const isEndpoint = isFrom || isTo;
          const inRange = from && rangeEnd && ds > (from < rangeEnd ? from : rangeEnd) && ds < (from < rangeEnd ? rangeEnd : from);
          const isToday = ds === today;

          let bg = "transparent";
          let color = "#1A1A17";
          let fontWeight: number = 500;
          let boxShadow = "none";
          let borderRadius = "8px";

          if (isEndpoint) {
            bg = "#0E5C4A"; color = "#fff"; fontWeight = 800;
          } else if (inRange) {
            bg = "#DCEFE4"; color = "#2C5247";
            const isWeekStart = col === 0;
            const isWeekEnd = col === 6;
            borderRadius = isWeekStart ? "8px 0 0 8px" : isWeekEnd ? "0 8px 8px 0" : "0";
          }
          if (isToday && !isEndpoint && !inRange) {
            boxShadow = "inset 0 0 0 1.5px #0E5C4A"; color = "#0E5C4A"; fontWeight = 700;
          }

          return (
            <div
              key={i}
              onClick={() => onSelect(ds)}
              onMouseEnter={() => onHover(ds)}
              onMouseLeave={() => onHover(undefined)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                height: 31, fontSize: 12.5, fontFamily: "'Hanken Grotesk',sans-serif",
                fontWeight, borderRadius, background: bg, color, boxShadow, cursor: "pointer",
              }}
            >
              {d}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface DateRangeFieldProps {
  from?: string;
  to?: string;
  onFromChange?: (v: string) => void;
  onToChange?: (v: string) => void;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function DateRangeField({ from, to, onFromChange, onToChange, disabled, className, style }: DateRangeFieldProps) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [phase, setPhase] = useState<"from" | "to">("from");
  const [hoverDate, setHoverDate] = useState<string | undefined>();
  const today = new Date();
  const [viewYear, setViewYear] = useState(from ? parseInt(from.slice(0, 4)) : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(from ? parseInt(from.slice(5, 7)) - 1 : today.getMonth());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setPhase("from");
    setHoverDate(undefined);
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setPhase("from");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSelect = (ds: string) => {
    if (phase === "from") {
      onFromChange?.(ds);
      onToChange?.("");
      setPhase("to");
    } else {
      if (!from || ds >= from) {
        onToChange?.(ds);
        setOpen(false);
        setPhase("from");
      } else {
        // Second click is before from — reset from to this date
        onFromChange?.(ds);
        onToChange?.("");
        setPhase("to");
      }
    }
  };

  const count = from && to ? daysBetween(from, to) : 0;
  const borderColor = focused || open ? "#0E5C4A" : "#E7E1D4";
  const boxShadow = focused || open ? "0 0 0 3px #DCEFE4" : "none";

  const label = from && to
    ? `${formatShort(from)} → ${formatShort(to)}`
    : from
    ? `${formatShort(from)} → …`
    : "Seleccionar rango";

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-block", width: "100%", ...style }} className={cn(className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 8,
          background: "#F4F0E8", border: `1.5px solid ${borderColor}`, borderRadius: 11,
          padding: "10px 13px", cursor: disabled ? "not-allowed" : "pointer",
          outline: "none", boxShadow, transition: "border-color .12s, box-shadow .12s",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <CalendarIcon size={14} color="#79746B" style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, textAlign: "left", fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13.5, color: from || to ? "#1A1A17" : "#79746B" }}>
          {label}
        </span>
        {count > 0 && (
          <span style={{
            fontFamily: "'Space Mono',monospace", fontSize: 10.5, color: "#0E5C4A",
            background: "#DCEFE4", borderRadius: 99, padding: "2px 8px", flexShrink: 0,
          }}>
            {count} {count === 1 ? "día" : "días"}
          </span>
        )}
        <ChevronDown size={13} color="#79746B" style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform .12s" }} />
      </button>

      {open && (
        <CalendarRange
          year={viewYear}
          month={viewMonth}
          from={from}
          to={to}
          phase={phase}
          hoverDate={hoverDate}
          onSelect={handleSelect}
          onNav={(y, m) => { setViewYear(y); setViewMonth(m); }}
          onHover={setHoverDate}
        />
      )}
    </div>
  );
}
