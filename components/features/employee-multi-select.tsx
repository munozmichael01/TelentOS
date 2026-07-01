"use client";

import { useState, useEffect, useRef } from "react";

const T = {
  bg: "#F4F0E8", surface: "#FCFAF6", ink: "#1A1A17", soft: "#79746B",
  line: "#E7E1D4", brand: "#0E5C4A", limeSoft: "#EAF7C4",
  mono: "'Space Mono', monospace",
  head: "'Archivo', sans-serif",
  body: "'Hanken Grotesk', sans-serif",
};

export function EmployeeMultiSelect({
  employees,
  value,
  onChange,
  label = "Empleado",
}: {
  employees: { id: string; name: string }[];
  value: string[];
  onChange: (ids: string[]) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const filtered = employees.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  const displayLabel =
    value.length === 0 ? "Todos" : `${value.length} seleccionado${value.length > 1 ? "s" : ""}`;

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  return (
    <div ref={ref} style={{ position: "relative", display: "flex", flexDirection: "column", gap: "4px", minWidth: "180px" }}>
      <div style={{ fontFamily: T.mono, fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", color: T.soft }}>
        {label}
      </div>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: "8px",
          padding: "9px 12px",
          background: T.bg,
          border: open ? "2px solid #1A1A17" : `1.5px solid ${T.line}`,
          boxShadow: open ? "3px 3px 0 #1A1A17" : "none",
          borderRadius: "8px", cursor: "pointer",
          fontFamily: T.body, fontSize: "13.5px", color: value.length > 0 ? T.ink : T.soft,
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ flex: 1, textAlign: "left" }}>{displayLabel}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path d="M6 9l6 6 6-6" stroke={T.soft} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, marginTop: "4px",
          minWidth: "220px", background: T.surface,
          border: "2px solid #1A1A17", boxShadow: "4px 4px 0 #1A1A17",
          borderRadius: "12px", zIndex: 50, overflow: "hidden",
        }}>
          {/* Search */}
          <div style={{ padding: "10px 12px", borderBottom: `1px solid ${T.line}` }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar…"
              autoFocus
              style={{
                width: "100%", padding: "7px 10px", fontSize: "13px",
                fontFamily: T.body, color: T.ink, background: T.bg,
                border: `1.5px solid ${T.line}`, borderRadius: "7px",
                outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          {/* Quick actions */}
          <div style={{ display: "flex", padding: "6px 14px", borderBottom: `1px solid ${T.line}`, gap: "12px" }}>
            <button
              onClick={() => onChange([])}
              style={{ fontFamily: T.mono, fontSize: "10px", letterSpacing: "0.5px", color: T.brand, background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              Todos
            </button>
            <button
              onClick={() => onChange(employees.map((e) => e.id))}
              style={{ fontFamily: T.mono, fontSize: "10px", letterSpacing: "0.5px", color: T.soft, background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              Ninguno
            </button>
          </div>

          {/* Employee list */}
          <div style={{ maxHeight: "220px", overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "16px 14px", fontFamily: T.body, fontSize: "13px", color: T.soft, textAlign: "center" }}>
                Sin resultados
              </div>
            ) : (
              filtered.map((emp) => {
                const checked = value.length === 0 ? false : value.includes(emp.id);
                return (
                  <label
                    key={emp.id}
                    style={{
                      display: "flex", alignItems: "center", gap: "10px",
                      padding: "8px 14px", cursor: "pointer",
                      background: checked ? T.limeSoft : "transparent",
                      borderBottom: `1px solid ${T.line}`,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(emp.id)}
                      style={{ width: "14px", height: "14px", accentColor: T.brand, flexShrink: 0, cursor: "pointer" }}
                    />
                    <span style={{ fontFamily: T.body, fontSize: "13.5px", color: T.ink }}>
                      {emp.name}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
