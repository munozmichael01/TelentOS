"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

const fieldInput: React.CSSProperties = {
  width: "100%",
  fontFamily: "inherit",
  fontSize: "14px",
  padding: "10px 12px",
  border: "1.5px solid #E7E1D4",
  borderRadius: "10px",
  background: "#F4F0E8",
  color: "#1A1A17",
  outline: "none",
  boxSizing: "border-box",
};

const fieldLabel: React.CSSProperties = {
  display: "block",
  fontSize: "12.5px",
  fontWeight: 700,
  marginBottom: "6px",
  color: "#3A3833",
};

/* ── Phone prefixes ────────────────────────────────────────────────────── */
const PREFIXES = [
  { code: "+34", flag: "🇪🇸", label: "ES" },
  { code: "+52", flag: "🇲🇽", label: "MX" },
  { code: "+54", flag: "🇦🇷", label: "AR" },
  { code: "+57", flag: "🇨🇴", label: "CO" },
  { code: "+56", flag: "🇨🇱", label: "CL" },
  { code: "+51", flag: "🇵🇪", label: "PE" },
  { code: "+58", flag: "🇻🇪", label: "VE" },
  { code: "+593", flag: "🇪🇨", label: "EC" },
  { code: "+1",  flag: "🇺🇸", label: "US" },
  { code: "+44", flag: "🇬🇧", label: "GB" },
  { code: "+33", flag: "🇫🇷", label: "FR" },
  { code: "+49", flag: "🇩🇪", label: "DE" },
  { code: "+39", flag: "🇮🇹", label: "IT" },
  { code: "+351", flag: "🇵🇹", label: "PT" },
  { code: "+55", flag: "🇧🇷", label: "BR" },
];

/* ── Location autocomplete (Photon / OpenStreetMap) ─────────────────────── */
type PhotonFeature = {
  properties: { name: string; city?: string; state?: string; country?: string; countrycode?: string; type?: string };
};

function formatLocation(p: PhotonFeature["properties"]): string {
  const parts: string[] = [];
  const city = p.type === "city" ? p.name : (p.city ?? p.name);
  if (city) parts.push(city);
  if (p.state && p.state !== city) parts.push(p.state);
  if (p.country) parts.push(p.country);
  return parts.join(", ");
}

function LocationAutocomplete({
  value, onChange, required, hasError,
}: {
  value: string; onChange: (v: string) => void; required?: boolean; hasError?: boolean;
}) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setSuggestions([]); return; }
    setLoading(true);
    try {
      const res = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&layer=city&lang=default`,
        { signal: AbortSignal.timeout(3000) }
      );
      const json = await res.json();
      const results: string[] = (json.features as PhotonFeature[])
        .map((f) => formatLocation(f.properties))
        .filter((s, i, arr) => s && arr.indexOf(s) === i)
        .slice(0, 5);
      setSuggestions(results);
      setOpen(results.length > 0);
    } catch { /* network or timeout — fail silently */ }
    finally { setLoading(false); }
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setQuery(v);
    onChange(v);
    setSuggestions([]);
    setOpen(false);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => search(v), 320);
  }

  function pick(s: string) {
    setQuery(s);
    onChange(s);
    setSuggestions([]);
    setOpen(false);
  }

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <input
          name="location"
          required={required}
          value={query}
          onChange={handleChange}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder="Madrid, Spain"
          autoComplete="off"
          style={{
            ...fieldInput,
            border: `1.5px solid ${hasError ? "#F1543F" : "#E7E1D4"}`,
            background: hasError ? "#FDE8E5" : "#F4F0E8",
            paddingRight: "34px",
          }}
        />
        {loading && (
          <div style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)" }}>
            <Loader2 size={13} style={{ animation: "spin 1s linear infinite", color: "#79746B" }} />
          </div>
        )}
      </div>
      {open && suggestions.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 100,
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
                background: "none", border: "none", borderBottom: i < suggestions.length - 1 ? "1px solid #E7E1D4" : "none",
                fontSize: "13.5px", color: "#1A1A17", cursor: "pointer", fontFamily: "inherit",
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

/* ── Main form ──────────────────────────────────────────────────────────── */

export function ApplyForm({ jobId }: { jobId: string }) {
  const params = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [cvName, setCvName] = useState("");
  const [cvError, setCvError] = useState(false);
  const [prefix, setPrefix] = useState("+34");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!cvName) { setCvError(true); return; }
    setCvError(false);
    setSubmitting(true);
    setError("");
    try {
      const fd = new FormData(e.currentTarget);
      fd.set("phone", `${prefix} ${phone}`.trim());
      fd.set("location", location);
      fd.append("job_id", jobId);
      for (const key of ["utm_source", "utm_medium", "utm_campaign"]) {
        const v = params.get(key);
        if (v) fd.append(key, v);
      }
      const res = await fetch("/api/careers/apply", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al enviar la candidatura");
      setDone(true);
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div style={{ background: "#FCFAF6", border: "1.5px solid #1A1A17", borderRadius: "18px", padding: "48px 30px", textAlign: "center", boxShadow: "6px 6px 0 #1A1A17" }}>
        <div style={{ width: "58px", height: "58px", margin: "0 auto 16px", borderRadius: "50%", background: "#EAF7C4", border: "1.5px solid #1A1A17", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="#0E5C4A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "24px", letterSpacing: "-.6px" }}>
          ¡Candidatura enviada!
        </div>
        <p style={{ fontSize: "14px", color: "#79746B", margin: "9px auto 0", maxWidth: "380px", lineHeight: 1.5 }}>
          Revisaremos tu perfil y te contactaremos pronto. Recibirás una copia en tu email.
        </p>
        <div style={{ marginTop: "14px", display: "inline-flex", alignItems: "center", gap: "7px", fontFamily: "'Space Mono',monospace", fontSize: "11px", color: "#79746B", background: "#F4F0E8", border: "1px solid #E7E1D4", borderRadius: "999px", padding: "5px 13px" }}>
          <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#0E5C4A", flexShrink: 0 }} />
          origen registrado · career_site
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} style={{ background: "#FCFAF6", border: "1.5px solid #E7E1D4", borderRadius: "18px", padding: "28px 30px 30px" }}>
      <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "20px", letterSpacing: "-.4px" }}>
        Aplicar a esta oferta
      </div>
      <div style={{ fontSize: "13px", color: "#79746B", marginTop: "4px" }}>
        Los campos marcados con * son obligatorios.
      </div>

      <div className="career-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginTop: "22px" }}>
        <div>
          <label style={fieldLabel}>Nombre completo *</label>
          <input name="name" required style={fieldInput} />
        </div>
        <div>
          <label style={fieldLabel}>Email *</label>
          <input name="email" type="email" required style={fieldInput} />
        </div>

        {/* Phone with prefix */}
        <div>
          <label style={fieldLabel}>Teléfono *</label>
          <div style={{ display: "flex", gap: "6px" }}>
            <select
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              style={{ ...fieldInput, width: "auto", minWidth: "80px", paddingRight: "6px", flexShrink: 0, cursor: "pointer" }}
            >
              {PREFIXES.map((p) => (
                <option key={p.code} value={p.code}>{p.flag} {p.code}</option>
              ))}
            </select>
            <input
              name="_phone_number"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="612 345 678"
              style={{ ...fieldInput, flex: 1 }}
            />
          </div>
        </div>

        {/* Location with autocomplete */}
        <div>
          <label style={fieldLabel}>Ubicación *</label>
          <LocationAutocomplete
            value={location}
            onChange={setLocation}
            required
            hasError={false}
          />
        </div>
      </div>

      {/* CV */}
      <div style={{ marginTop: "15px" }}>
        <label style={fieldLabel}>
          CV * <span style={{ fontWeight: 400, color: "#79746B" }}>(PDF, DOC · máx. 8 MB)</span>
        </label>
        <div style={{
          display: "flex", alignItems: "center", gap: "9px", fontSize: "13px",
          color: cvName ? "#1A1A17" : "#79746B",
          padding: "9px 12px",
          border: `1.5px ${cvError ? "solid #F1543F" : cvName ? "solid #0E5C4A" : "dashed #E7E1D4"}`,
          borderRadius: "10px",
          background: cvError ? "#FDE8E5" : cvName ? "#EAF7C4" : "#F4F0E8",
          cursor: "pointer", position: "relative", transition: "all .15s ease",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 16V4M7 9l5-5 5 5M5 20h14" stroke={cvError ? "#F1543F" : cvName ? "#0E5C4A" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
            {cvName || "Subir CV"}
          </span>
          <input
            name="cv"
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => { setCvName(e.target.files?.[0]?.name ?? ""); setCvError(false); }}
            style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }}
          />
        </div>
        {cvError && <p style={{ fontSize: "12px", color: "#F1543F", marginTop: "5px" }}>El CV es obligatorio.</p>}
      </div>

      {error && <p style={{ fontSize: "13px", color: "#BD4332", marginTop: "10px" }}>{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        style={{
          marginTop: "22px",
          fontFamily: "'Archivo',sans-serif",
          fontWeight: 800,
          fontSize: "14px",
          color: "#fff",
          background: "#0E5C4A",
          border: "2px solid #1A1A17",
          borderRadius: "12px",
          padding: "12px 24px",
          boxShadow: "3px 3px 0 #1A1A17",
          cursor: submitting ? "not-allowed" : "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          opacity: submitting ? 0.7 : 1,
        }}
      >
        {submitting && <Loader2 size={14} className="animate-spin" />}
        Enviar candidatura
      </button>
    </form>
  );
}
