"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";
import type { PayRun } from "@/lib/types";

const T = {
  ink: "#1A1A17", soft: "#79746B", line: "#E7E1D4",
  surface: "#FCFAF6", bg: "#F4F0E8",
  brand: "#0E5C4A", accent: "#F1543F", amberSoft: "#F8E7C4", amber: "#946312",
};

const MONTH_NAMES_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

function periodLabel(periodMonth: string): string {
  const [year, monthNum] = periodMonth.split("-");
  return `${MONTH_NAMES_ES[parseInt(monthNum, 10) - 1]} ${year}`;
}

export function NewRunDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [periodMonth, setPeriodMonth] = useState("");
  const [entityName, setEntityName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setPeriodMonth("");
    setEntityName("");
    setCurrency("USD");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!periodMonth || !entityName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<{ run: PayRun }>("/api/payroll/runs", {
        method: "POST",
        json: {
          period_month: periodMonth,
          period_label: periodLabel(periodMonth),
          entity_name: entityName.trim(),
          run_type: "monthly",
          currency,
        },
      });
      setOpen(false);
      reset();
      router.push(`/payroll/runs/${result.run.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("Ya existe una corrida para este período y entidad.");
      } else {
        setError(err instanceof Error ? err.message : "Error al crear la corrida");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => { reset(); setOpen(true); }}
        style={{
          fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13px",
          color: "#fff", background: T.brand,
          border: `2px solid ${T.ink}`, borderRadius: "11px",
          padding: "9px 18px", boxShadow: `3px 3px 0 ${T.ink}`,
          cursor: "pointer",
        }}
      >
        Nueva corrida
      </button>

      {open && (
        <div
          onClick={() => { if (!loading) { setOpen(false); reset(); } }}
          style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(26,26,23,.42)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: "440px", background: T.surface, border: `1.5px solid ${T.ink}`, borderRadius: "16px", boxShadow: `10px 10px 0 rgba(26,26,23,.2)` }}
          >
            <div style={{ padding: "22px 24px 18px", borderBottom: `1px solid ${T.line}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "17px", letterSpacing: "-.4px" }}>Nueva corrida de nómina</span>
              <button
                onClick={() => { setOpen(false); reset(); }}
                disabled={loading}
                style={{ width: "28px", height: "28px", borderRadius: "8px", border: `1px solid ${T.line}`, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke={T.soft} strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: T.soft }}>Período</span>
                <input
                  type="month"
                  value={periodMonth}
                  onChange={(e) => setPeriodMonth(e.target.value)}
                  required
                  disabled={loading}
                  style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: "14px", color: T.ink, background: T.bg, border: `1.5px solid ${T.line}`, borderRadius: "10px", padding: "10px 13px", outline: "none", width: "100%", boxSizing: "border-box" }}
                />
                {periodMonth && (
                  <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "11px", color: T.soft }}>{periodLabel(periodMonth)}</span>
                )}
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: T.soft }}>Entidad legal</span>
                <input
                  type="text"
                  value={entityName}
                  onChange={(e) => setEntityName(e.target.value)}
                  placeholder="Nombre de la empresa"
                  required
                  disabled={loading}
                  style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: "14px", color: T.ink, background: T.bg, border: `1.5px solid ${T.line}`, borderRadius: "10px", padding: "10px 13px", outline: "none", width: "100%", boxSizing: "border-box" }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: T.soft }}>Moneda</span>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  disabled={loading}
                  style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: "14px", color: T.ink, background: T.bg, border: `1.5px solid ${T.line}`, borderRadius: "10px", padding: "10px 13px", outline: "none", width: "100%", boxSizing: "border-box" }}
                >
                  <option value="USD">USD — Dólar americano</option>
                  <option value="VES">VES — Bolívar soberano</option>
                  <option value="BRL">BRL — Real brasileño</option>
                  <option value="EUR">EUR — Euro</option>
                </select>
              </label>

              {error && (
                <div style={{ background: T.amberSoft, border: "1px solid #EBD9A8", borderRadius: "10px", padding: "11px 14px", fontSize: "13px", color: T.amber }}>
                  {error}
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", paddingTop: "4px" }}>
                <button
                  type="button"
                  onClick={() => { setOpen(false); reset(); }}
                  disabled={loading}
                  style={{ flex: 1, fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 600, fontSize: "13px", color: T.soft, background: "transparent", border: `1.5px solid ${T.line}`, borderRadius: "11px", padding: "11px", cursor: loading ? "not-allowed" : "pointer" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !periodMonth || !entityName.trim()}
                  style={{
                    flex: 2, fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13px",
                    color: "#fff",
                    background: loading || !periodMonth || !entityName.trim() ? "#B7C9A8" : T.brand,
                    border: `2px solid ${loading || !periodMonth || !entityName.trim() ? "#A9BD97" : T.ink}`,
                    borderRadius: "11px", padding: "11px",
                    boxShadow: loading || !periodMonth || !entityName.trim() ? "none" : `3px 3px 0 ${T.ink}`,
                    cursor: loading || !periodMonth || !entityName.trim() ? "not-allowed" : "pointer",
                  }}
                >
                  {loading ? "Creando…" : "Crear corrida"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
