"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import type { Campaign } from "@/lib/types";
import type { ChannelPlan } from "@/agents/agent-channel-optimizer";

const CHANNEL_DOTS: Record<string, string> = {
  infojobs: "#3B7FC4",
  linkedin: "#2867B2",
  indeed: "#2164F3",
  "career site": "#0E5C4A",
  glassdoor: "#0CAA41",
  default: "#9C9588",
};

function channelDot(name: string) {
  const key = (name ?? "").toLowerCase();
  return Object.entries(CHANNEL_DOTS).find(([k]) => key.includes(k))?.[1] ?? CHANNEL_DOTS.default;
}

function cpaColor(cpa: number) {
  if (cpa <= 30) return "#1B6B4F";
  if (cpa <= 80) return "#946312";
  return "#BD4332";
}

export function ChannelPlanner({ jobId, campaigns }: { jobId: string; campaigns: Campaign[] }) {
  const router = useRouter();
  const [objective, setObjective] = useState<"volume" | "quality" | "cpa">("volume");
  const [budget, setBudget] = useState("500");
  const [plan, setPlan] = useState<ChannelPlan | null>(null);
  const [planMode, setPlanMode] = useState<"ok" | "fallback" | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [activating, setActivating] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState("");

  async function optimize() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/agents/channel-optimizer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, objective, budget: Number(budget) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error del agente");
      setPlan(data.output);
      setPlanMode(data.status);
      setSelected(new Set(data.output.recommendations.map((r: { channel_id: string }) => r.channel_id)));
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setLoading(false);
    }
  }

  async function activate() {
    if (!plan) return;
    setActivating(true);
    setError("");
    try {
      const selections = plan.recommendations
        .filter((r) => selected.has(r.channel_id))
        .map((r) => ({ channel_id: r.channel_id, budget: r.budget, priority: r.priority, copy: r.copy }));
      const res = await fetch(`/api/jobs/${jobId}/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selections, objective }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al activar canales");
      setPlan(null);
      router.refresh();
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setActivating(false);
    }
  }

  async function simulate() {
    setSimulating(true);
    await fetch("/api/campaigns/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId }),
    });
    setSimulating(false);
    router.refresh();
  }

  const objectiveLabel: Record<string, string> = {
    volume: "Volumen",
    quality: "Calidad",
    cpa: "Mín. CPA",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* ── optimizer form ── */}
      <div style={{ background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "16px", padding: "22px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <span style={{ width: "28px", height: "28px", borderRadius: "8px", background: "#DCEFE4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M4 19V9M10 19V5M16 19v-7M20 19V11" stroke="#0E5C4A" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </span>
          <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "15px" }}>Distribución de canales</span>
        </div>

        <p style={{ fontSize: "13.5px", lineHeight: 1.55, color: "#79746B", margin: "0 0 16px" }}>
          Define objetivo y presupuesto; el agente recomienda canales, reparto y copy según la performance histórica.
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: "12px" }}>
          {/* Objetivo */}
          <div>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", textTransform: "uppercase", letterSpacing: ".5px", color: "#79746B", marginBottom: "7px" }}>
              Objetivo
            </div>
            <select
              value={objective}
              onChange={(e) => setObjective(e.target.value as typeof objective)}
              style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: "13.5px", fontWeight: 600, color: "#1A1A17", background: "#F4F0E8", border: "1.5px solid #E7E1D4", borderRadius: "11px", padding: "9px 12px", outline: "none", cursor: "pointer" }}
            >
              <option value="volume">Volumen de candidatos</option>
              <option value="quality">Calidad de candidatos</option>
              <option value="cpa">Minimizar coste por aplicación</option>
            </select>
          </div>

          {/* Presupuesto */}
          <div>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", textTransform: "uppercase", letterSpacing: ".5px", color: "#79746B", marginBottom: "7px" }}>
              Presupuesto (€)
            </div>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: "13.5px", fontWeight: 600, width: "110px", color: "#1A1A17", background: "#F4F0E8", border: "1.5px solid #E7E1D4", borderRadius: "11px", padding: "9px 12px", outline: "none" }}
            />
          </div>

          <button
            onClick={optimize}
            disabled={loading}
            style={{
              fontFamily: "'Archivo',sans-serif",
              fontWeight: 800,
              fontSize: "13px",
              color: "#fff",
              background: "#0E5C4A",
              border: "2px solid #1A1A17",
              borderRadius: "11px",
              padding: "10px 18px",
              boxShadow: "3px 3px 0 #1A1A17",
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading && <Loader2 size={13} className="animate-spin" />}
            Optimizar
          </button>
        </div>

        {error && <p style={{ fontSize: "13px", color: "#BD4332", marginTop: "12px" }}>{error}</p>}
      </div>

      {/* ── agent recommendation panel ── */}
      {plan && (
        <div style={{ position: "relative", overflow: "hidden", background: "#1A1A17", color: "#F4F0E8", borderRadius: "16px", padding: "18px 20px" }}>
          {/* header */}
          <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "10px" }}>
            <span style={{ width: "26px", height: "26px", borderRadius: "8px", background: "rgba(198,242,78,.16)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M4 19V9M10 19V5M16 19v-7M20 19V11" stroke="#C6F24E" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </span>
            <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "14px" }}>Agente de canales</span>
            {planMode === "fallback" && (
              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: "#E0A23C", background: "rgba(224,162,60,.12)", border: "1px solid rgba(224,162,60,.3)", borderRadius: "999px", padding: "3px 10px" }}>
                heurístico
              </span>
            )}
            <span style={{ marginLeft: "auto", fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: "#C6F24E", background: "rgba(198,242,78,.12)", border: "1px solid rgba(198,242,78,.3)", borderRadius: "999px", padding: "3px 10px", whiteSpace: "nowrap" }}>
              {objectiveLabel[objective]} · {formatMoney(Number(budget))}
            </span>
          </div>

          {/* rationale */}
          <p style={{ fontSize: "14px", lineHeight: 1.55, color: "#CFCAC0", margin: "0 0 12px" }}>
            {plan.rationale}
          </p>

          {/* per-channel checkboxes */}
          <div style={{ display: "flex", flexDirection: "column", gap: "7px", marginBottom: "14px" }}>
            {plan.recommendations.map((r) => {
              const on = selected.has(r.channel_id);
              return (
                <label
                  key={r.channel_id}
                  style={{ display: "flex", alignItems: "flex-start", gap: "10px", background: on ? "rgba(198,242,78,.06)" : "#26241F", border: `1px solid ${on ? "rgba(198,242,78,.3)" : "#38352E"}`, borderRadius: "11px", padding: "11px 13px", cursor: "pointer" }}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={(e) => {
                      const next = new Set(selected);
                      e.target.checked ? next.add(r.channel_id) : next.delete(r.channel_id);
                      setSelected(next);
                    }}
                    style={{ marginTop: "2px", accentColor: "#C6F24E", flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#F4F0E8" }}>{r.channel_name}</span>
                      <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: "#C6F24E", background: "rgba(198,242,78,.10)", border: "1px solid rgba(198,242,78,.25)", borderRadius: "999px", padding: "2px 8px" }}>
                        prioridad {r.priority}
                      </span>
                      <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: "#8C877E" }}>
                        {formatMoney(r.budget)} · ~{r.expected_applications} aplic. · CPA {formatMoney(r.expected_cpa)}
                      </span>
                    </div>
                    <p style={{ fontSize: "12.5px", color: "#8C877E", margin: "0 0 5px" }}>{r.reason}</p>
                    <p style={{ fontSize: "12px", fontStyle: "italic", color: "#CFCAC0", background: "#1A1A17", borderRadius: "7px", padding: "5px 9px", margin: 0 }}>
                      &ldquo;{r.copy}&rdquo;
                    </p>
                  </div>
                </label>
              );
            })}
          </div>

          {/* actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={activate}
              disabled={activating || selected.size === 0}
              style={{
                fontFamily: "'Archivo',sans-serif",
                fontWeight: 800,
                fontSize: "12px",
                color: "#1A1A17",
                background: selected.size > 0 ? "#C6F24E" : "#38352E",
                border: "none",
                borderRadius: "9px",
                padding: "8px 14px",
                cursor: activating || selected.size === 0 ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                opacity: selected.size === 0 ? 0.6 : 1,
              }}
            >
              {activating && <Loader2 size={13} className="animate-spin" />}
              Aplicar recomendación{selected.size > 0 ? ` (${selected.size})` : ""}
            </button>
            <span style={{ marginLeft: "auto", fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: "#8C877E" }}>Tú decides</span>
          </div>
        </div>
      )}

      {/* ── campaigns table ── */}
      <div style={{ background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "16px", overflow: "hidden" }}>
        {/* table header */}
        <div style={{ display: "flex", alignItems: "center", padding: "11px 18px", borderBottom: "1px solid #E7E1D4", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0", flex: 1 }}>
            <span style={{ flex: 1.4, fontFamily: "'Space Mono',monospace", fontSize: "10.5px", textTransform: "uppercase", letterSpacing: "1px", color: "#79746B" }}>Canal</span>
            <span style={{ flex: 1, textAlign: "right", fontFamily: "'Space Mono',monospace", fontSize: "10.5px", textTransform: "uppercase", letterSpacing: "1px", color: "#79746B" }}>Views</span>
            <span style={{ flex: 1, textAlign: "right", fontFamily: "'Space Mono',monospace", fontSize: "10.5px", textTransform: "uppercase", letterSpacing: "1px", color: "#79746B" }}>Aplicaciones</span>
            <span style={{ flex: 1, textAlign: "right", fontFamily: "'Space Mono',monospace", fontSize: "10.5px", textTransform: "uppercase", letterSpacing: "1px", color: "#79746B" }}>CPA</span>
          </div>
          {campaigns.length > 0 && (
            <button
              onClick={simulate}
              disabled={simulating}
              style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: "12px", color: "#0E5C4A", background: "#DCEFE4", border: "none", borderRadius: "8px", padding: "5px 11px", cursor: simulating ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "5px", marginLeft: "12px" }}
            >
              {simulating && <Loader2 size={11} className="animate-spin" />}
              Simular 1 día
            </button>
          )}
        </div>

        {campaigns.length === 0 ? (
          <p style={{ textAlign: "center", fontSize: "13px", color: "#79746B", padding: "32px 18px" }}>
            Sin campañas activas. Usa el agente para generar un plan de distribución.
          </p>
        ) : (
          campaigns.map((c) => {
            const name = c.channels?.name ?? "—";
            const dot = channelDot(name);
            const cpa = c.applications > 0 ? Number(c.spend) / c.applications : null;
            return (
              <div
                key={c.id}
                style={{ display: "flex", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid #E7E1D4" }}
              >
                <span style={{ flex: 1.4, display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: dot, flexShrink: 0 }} />
                  <span style={{ fontSize: "13.5px", fontWeight: 700 }}>{name}</span>
                  {c.status === "active" && (
                    <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", color: "#1B6B4F", background: "#DCEFE3", border: "1px solid #A8D9BC", borderRadius: "999px", padding: "2px 7px" }}>
                      activa
                    </span>
                  )}
                </span>
                <span style={{ flex: 1, textAlign: "right", fontSize: "13px", color: "#79746B" }}>
                  {c.views.toLocaleString("es-ES")}
                </span>
                <span style={{ flex: 1, textAlign: "right", fontSize: "13px", fontWeight: 700 }}>
                  {c.applications}
                </span>
                <span style={{ flex: 1, textAlign: "right", fontFamily: "'Space Mono',monospace", fontSize: "12.5px", fontWeight: 700, color: cpa != null ? cpaColor(cpa) : "#9C9588" }}>
                  {cpa != null ? formatMoney(cpa) : "—"}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
