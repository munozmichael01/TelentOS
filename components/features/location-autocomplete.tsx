"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type PhotonFeature = {
  properties: { name: string; city?: string; state?: string; country?: string; type?: string };
};

function formatLocation(p: PhotonFeature["properties"]): string {
  const parts: string[] = [];
  const city = p.type === "city" ? p.name : (p.city ?? p.name);
  if (city) parts.push(city);
  if (p.state && p.state !== city) parts.push(p.state);
  if (p.country) parts.push(p.country);
  return parts.join(", ");
}

/** Unstyled wrapper — pass inputStyle + dropdownStyle for your design system */
export function LocationAutocomplete({
  value,
  onChange,
  placeholder = "Madrid, Spain",
  inputStyle,
  required,
  name = "location",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputStyle?: React.CSSProperties;
  required?: boolean;
  name?: string;
}) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external value resets (e.g. form clear)
  useEffect(() => { setQuery(value); }, [value]);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setSuggestions([]); return; }
    setLoading(true);
    try {
      const res = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&layer=city&lang=default`,
        { signal: AbortSignal.timeout(4000) }
      );
      const json = await res.json();
      const results: string[] = (json.features as PhotonFeature[])
        .map((f) => formatLocation(f.properties))
        .filter((s, i, arr) => s && arr.indexOf(s) === i)
        .slice(0, 5);
      setSuggestions(results);
      setOpen(results.length > 0);
    } catch { /* network / timeout */ }
    finally { setLoading(false); }
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setQuery(v);
    onChange(v);
    setSuggestions([]);
    setOpen(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(v), 320);
  }

  function pick(s: string) {
    setQuery(s);
    onChange(s);
    setSuggestions([]);
    setOpen(false);
  }

  useEffect(() => {
    function onMousedown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onMousedown);
    return () => document.removeEventListener("mousedown", onMousedown);
  }, []);

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      <div style={{ position: "relative" }}>
        <input
          name={name}
          required={required}
          value={query}
          onChange={handleChange}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          style={inputStyle}
        />
        {loading && (
          <div style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 1s linear infinite", color: "#79746B" }}>
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeDasharray="28" strokeDashoffset="14"/>
            </svg>
          </div>
        )}
      </div>
      {open && suggestions.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 200,
          background: "#FCFAF6", border: "1.5px solid #1A1A17", borderRadius: "10px",
          boxShadow: "3px 3px 0 #1A1A17", overflow: "hidden",
        }}>
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={() => pick(s)}
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                width: "100%", textAlign: "left", padding: "9px 13px",
                background: "none", border: "none",
                borderBottom: i < suggestions.length - 1 ? "1px solid #E7E1D4" : "none",
                fontSize: "13.5px", color: "#1A1A17", cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, color: "#79746B" }}>
                <path d="M12 21s7-5.6 7-11a7 7 0 10-14 0c0 5.4 7 11 7 11Z" stroke="currentColor" strokeWidth="2"/>
                <circle cx="12" cy="10" r="2" stroke="currentColor" strokeWidth="2"/>
              </svg>
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
