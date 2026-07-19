"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

type City = { name: string; admin1: string | null; country: string };

/**
 * Autocomplete de ciudad sobre la lista canónica (GeoNames) vía /api/board/cities.
 * Reutilizable en TODOS los campos de ubicación del producto (perfil, builder, apply…).
 * `country` acota la búsqueda al mercado (por defecto VE; el consumidor pasa el de su locale).
 * Devuelve el nombre de ciudad y, si el consumidor lo quiere, el país (ISO-2) para guardar.
 */
export function CityAutocomplete({
  value, onChange, country = "VE", placeholder, inputStyle, disabled,
}: {
  value: string;
  onChange: (city: string, meta?: { admin1: string | null; country: string }) => void;
  country?: string;
  placeholder?: string;
  inputStyle?: CSSProperties;
  disabled?: boolean;
}) {
  const [sug, setSug] = useState<City[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function query(q: string) {
    onChange(q); // el input es controlado por el consumidor
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) { setSug([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      const r = await fetch(`/api/board/cities?country=${encodeURIComponent(country)}&q=${encodeURIComponent(q)}`)
        .then((x) => (x.ok ? x.json() : null)).catch(() => null);
      setSug((r?.cities as City[]) ?? []);
      setOpen(true);
    }, 180);
  }

  const base: CSSProperties = {
    width: "100%", fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 15, color: "var(--ink,#1A1A17)",
    background: "var(--surface,#FCFAF6)", border: "1.5px solid var(--line,#E7E1D4)", borderRadius: 11,
    padding: "12px 13px", outline: "none", boxSizing: "border-box",
  };

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <input
        value={value} disabled={disabled}
        onChange={(e) => query(e.target.value)}
        onFocus={() => { if (sug.length) setOpen(true); }}
        placeholder={placeholder ?? "Ciudad"}
        style={{ ...base, ...inputStyle }}
      />
      {open && sug.length > 0 && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 40, background: "var(--surface,#FCFAF6)", border: "1.5px solid var(--line,#E7E1D4)", borderRadius: 11, boxShadow: "0 12px 28px -12px rgba(0,0,0,.25)", overflow: "hidden", maxHeight: 240, overflowY: "auto" }}>
          {sug.map((c) => (
            <button
              key={`${c.name}-${c.admin1}-${c.country}`}
              onClick={() => { onChange(c.name, { admin1: c.admin1, country: c.country }); setSug([]); setOpen(false); }}
              style={{ display: "flex", alignItems: "baseline", gap: 8, width: "100%", textAlign: "left", background: "none", border: "none", borderBottom: "1px solid var(--line,#E7E1D4)", padding: "10px 13px", cursor: "pointer" }}
            >
              <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, fontWeight: 600, color: "var(--ink,#1A1A17)" }}>{c.name}</span>
              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 10.5, color: "var(--soft,#79746B)" }}>{[c.admin1, c.country].filter(Boolean).join(" · ")}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
