"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Copy, Check, ExternalLink, Play, Pause } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import type { Campaign, Channel } from "@/lib/types";
import type { ChannelPlan } from "@/agents/agent-channel-optimizer";

/* ── Types ─────────────────────────────────────────────────────────────────── */

type DistData = {
  company_slug: string;
  career_site: { job_views: number; applications: number };
  utm_channels: { source: string; applications: number }[];
  channels: (Channel & { utm_source: string | null })[];
};

/* ── Colors ─────────────────────────────────────────────────────────────────── */

const CHANNEL_COLOR: Record<string, string> = {
  infojobs:  "#3B7FC4",
  linkedin:  "#2867B2",
  indeed:    "#2164F3",
  career_site: "#0E5C4A",
  glassdoor: "#0CAA41",
  google:    "#EA4335",
  meta:      "#1877F2",
  turijobs:  "#E85A1B",
  default:   "#9C9588",
};

function channelColor(name: string) {
  const key = (name ?? "").toLowerCase().replace(/\s+/g, "_");
  return (
    CHANNEL_COLOR[key] ??
    Object.entries(CHANNEL_COLOR).find(([k]) => key.includes(k))?.[1] ??
    CHANNEL_COLOR.default
  );
}

function cpaColor(cpa: number) {
  if (cpa <= 20) return "#1B6B4F";
  if (cpa <= 50) return "#946312";
  return "#BD4332";
}

const mono: React.CSSProperties = { fontFamily: "'Space Mono',monospace" };
const ink = "#1A1A17", soft = "#79746B", line = "#E7E1D4", surface = "#FCFAF6";

/* ── Small helpers ──────────────────────────────────────────────────────────── */

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ ...mono, fontSize: "10.5px", textTransform: "uppercase" as const, letterSpacing: "1px", color: soft, marginBottom: "10px" }}>
      {children}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text).catch(() => null);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  return (
    <button
      onClick={copy}
      title="Copiar URL con tracking"
      style={{ display: "inline-flex", alignItems: "center", gap: "5px", ...mono, fontSize: "11px", color: copied ? "#1B6B4F" : soft, background: copied ? "#DCEFE4" : "#F4F0E8", border: `1px solid ${copied ? "#A8D9BC" : line}`, borderRadius: "8px", padding: "5px 9px", cursor: "pointer" }}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? "Copiado" : "Copiar URL"}
    </button>
  );
}

function convRate(views: number, apps: number) {
  if (!views) return "—";
  return `${((apps / views) * 100).toFixed(1)}%`;
}

/* ── Main component ─────────────────────────────────────────────────────────── */

export function ChannelPlanner({ jobId, campaigns: initialCampaigns }: { jobId: string; campaigns: Campaign[] }) {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [dist, setDist] = useState<DistData | null>(null);
  const [distLoading, setDistLoading] = useState(true);
  const [showOptimizer, setShowOptimizer] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState("");

  // Optimizer state
  const [objective, setObjective] = useState<"volume" | "quality" | "cpa">("volume");
  const [budget, setBudget] = useState("500");
  const [plan, setPlan] = useState<ChannelPlan | null>(null);
  const [planMode, setPlanMode] = useState<"ok" | "fallback" | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [optimizing, setOptimizing] = useState(false);
  const [activating, setActivating] = useState(false);

  const fetchDist = useCallback(async () => {
    setDistLoading(true);
    try {
      const r = await fetch(`/api/jobs/${jobId}/distribution`);
      if (r.ok) setDist(await r.json());
    } finally {
      setDistLoading(false);
    }
  }, [jobId]);

  useEffect(() => { fetchDist(); }, [fetchDist]);

  // Build tracked URL for a channel
  function trackedUrl(utmSource: string) {
    if (!dist?.company_slug) return "";
    const base = typeof window !== "undefined" ? window.location.origin : "";
    return `${base}/careers/${dist.company_slug}/jobs/${jobId}?utm_source=${utmSource}&utm_medium=${utmSource === "career_site" ? "organic" : "job_board"}&utm_campaign=${jobId.slice(0, 8)}`;
  }

  // Real applications per campaign (from UTM data, fallback to campaign.applications)
  function realApps(campaign: Campaign): number {
    if (!dist) return campaign.applications;
    const utmSrc = dist.channels.find((ch) => ch.id === campaign.channel_id)?.utm_source;
    if (!utmSrc) return campaign.applications;
    return dist.utm_channels.find((u) => u.source === utmSrc)?.applications ?? campaign.applications;
  }

  async function toggleCampaign(id: string, current: string) {
    setToggling(id);
    const next = current === "active" ? "paused" : "active";
    try {
      const r = await fetch(`/api/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (r.ok) {
        setCampaigns((prev) => prev.map((c) => c.id === id ? { ...c, status: next as Campaign["status"] } : c));
      }
    } finally {
      setToggling(null);
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

  async function optimize() {
    setOptimizing(true);
    setError("");
    try {
      const r = await fetch("/api/agents/channel-optimizer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, objective, budget: Number(budget) }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Error del agente");
      setPlan(data.output);
      setPlanMode(data.status);
      setSelected(new Set(data.output.recommendations.map((r: { channel_id: string }) => r.channel_id)));
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setOptimizing(false);
    }
  }

  async function activatePlan() {
    if (!plan) return;
    setActivating(true);
    setError("");
    try {
      const selections = plan.recommendations
        .filter((r) => selected.has(r.channel_id))
        .map((r) => ({ channel_id: r.channel_id, budget: r.budget, priority: r.priority, copy: r.copy }));
      const r = await fetch(`/api/jobs/${jobId}/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selections, objective }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Error al activar canales");
      setPlan(null);
      await fetchDist();
      router.refresh();
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setActivating(false);
    }
  }

  const objectiveLabel: Record<string, string> = { volume: "Volumen", quality: "Calidad", cpa: "Mín. CPA" };

  /* ── UTM sources that don't have an active campaign (organic/free) ── */
  const campaignUtmSources = new Set(
    campaigns.map((c) => dist?.channels.find((ch) => ch.id === c.channel_id)?.utm_source).filter(Boolean)
  );
  const organicSources = (dist?.utm_channels ?? []).filter(
    (u) => !campaignUtmSources.has(u.source) && u.source !== "career_site"
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

      {/* ══ Career Site ══════════════════════════════════════════════════════ */}
      <div style={{ background: surface, border: `1.5px solid ${ink}`, borderRadius: "16px", padding: "18px 20px", boxShadow: "4px 4px 0 #1A1A17" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
          <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#0E5C4A", flexShrink: 0 }} />
          <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "15px", flex: 1 }}>Career Site</span>
          <span style={{ ...mono, fontSize: "10px", color: "#1B6B4F", background: "#DCEFE3", border: "1px solid #A8D9BC", borderRadius: "999px", padding: "3px 9px" }}>
            siempre activo · €0
          </span>
        </div>

        {distLoading ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", ...mono, fontSize: "12px", color: soft }}>
            <Loader2 size={13} className="animate-spin" /> Cargando datos…
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", alignItems: "center" }}>
            <div>
              <div style={{ ...mono, fontSize: "10px", color: soft, marginBottom: "3px" }}>VISITAS A OFERTA</div>
              <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "22px" }}>
                {(dist?.career_site.job_views ?? 0).toLocaleString("es-ES")}
              </div>
            </div>
            <div>
              <div style={{ ...mono, fontSize: "10px", color: soft, marginBottom: "3px" }}>CANDIDATURAS</div>
              <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "22px" }}>
                {dist?.career_site.applications ?? 0}
              </div>
            </div>
            <div>
              <div style={{ ...mono, fontSize: "10px", color: soft, marginBottom: "3px" }}>CONVERSIÓN</div>
              <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "22px" }}>
                {convRate(dist?.career_site.job_views ?? 0, dist?.career_site.applications ?? 0)}
              </div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: "8px", alignItems: "center" }}>
              <CopyButton text={trackedUrl("career_site")} />
              {dist?.company_slug && (
                <a
                  href={`/careers/${dist.company_slug}/jobs/${jobId}`}
                  target="_blank"
                  rel="noopener"
                  style={{ display: "inline-flex", alignItems: "center", gap: "5px", ...mono, fontSize: "11px", color: soft, background: "#F4F0E8", border: `1px solid ${line}`, borderRadius: "8px", padding: "5px 9px", textDecoration: "none" }}
                >
                  <ExternalLink size={11} /> Ver oferta
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ══ Paid campaigns ═══════════════════════════════════════════════════ */}
      {campaigns.length > 0 && (
        <div style={{ background: surface, border: `1px solid ${line}`, borderRadius: "16px", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 18px", borderBottom: `1px solid ${line}` }}>
            <SectionHeading>Distribución pagada</SectionHeading>
            <button
              onClick={simulate}
              disabled={simulating}
              style={{ ...mono, fontSize: "11px", color: "#0E5C4A", background: "#DCEFE4", border: "none", borderRadius: "8px", padding: "5px 10px", cursor: simulating ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "5px" }}
            >
              {simulating && <Loader2 size={11} className="animate-spin" />}
              Simular 1 día
            </button>
          </div>

          {campaigns.map((c) => {
            const name = c.channels?.name ?? "—";
            const color = channelColor(name);
            const apps = realApps(c);
            const cpa = apps > 0 ? Number(c.spend) / apps : null;
            const utmSrc = dist?.channels.find((ch) => ch.id === c.channel_id)?.utm_source ?? name.toLowerCase();
            const isToggling = toggling === c.id;

            return (
              <div key={c.id} style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "10px", padding: "14px 18px", borderBottom: `1px solid ${line}`, opacity: c.status === "paused" ? 0.7 : 1 }}>
                {/* Channel + status */}
                <div style={{ display: "flex", alignItems: "center", gap: "9px", minWidth: "160px", flex: "1 1 160px" }}>
                  <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: "13.5px", fontWeight: 700 }}>{name}</span>
                  <span style={{ ...mono, fontSize: "10px", color: c.status === "active" ? "#1B6B4F" : soft, background: c.status === "active" ? "#DCEFE3" : "#F4F0E8", border: `1px solid ${c.status === "active" ? "#A8D9BC" : line}`, borderRadius: "999px", padding: "2px 7px" }}>
                    {c.status === "active" ? "activa" : c.status === "paused" ? "pausada" : "finalizada"}
                  </span>
                </div>

                {/* Metrics */}
                <div style={{ display: "flex", gap: "18px", flex: "2 1 300px", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ ...mono, fontSize: "9.5px", color: soft }}>PRESUPUESTO</div>
                    <div style={{ fontSize: "13px", fontWeight: 700 }}>{formatMoney(c.budget)}</div>
                  </div>
                  <div>
                    <div style={{ ...mono, fontSize: "9.5px", color: soft }}>GASTADO</div>
                    <div style={{ fontSize: "13px", fontWeight: 700 }}>{formatMoney(Number(c.spend))}</div>
                  </div>
                  <div>
                    <div style={{ ...mono, fontSize: "9.5px", color: soft }}>VIEWS</div>
                    <div style={{ fontSize: "13px", fontWeight: 700 }}>{c.views.toLocaleString("es-ES")}</div>
                  </div>
                  <div>
                    <div style={{ ...mono, fontSize: "9.5px", color: soft }}>CANDIDATURAS</div>
                    <div style={{ fontSize: "13px", fontWeight: 700 }}>{apps}</div>
                  </div>
                  <div>
                    <div style={{ ...mono, fontSize: "9.5px", color: soft }}>CPA</div>
                    <div style={{ ...mono, fontSize: "12.5px", fontWeight: 700, color: cpa != null ? cpaColor(cpa) : soft }}>
                      {cpa != null ? formatMoney(cpa) : "—"}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: "8px", marginLeft: "auto" }}>
                  <CopyButton text={trackedUrl(utmSrc)} />
                  {c.status !== "finished" && (
                    <button
                      onClick={() => toggleCampaign(c.id, c.status)}
                      disabled={isToggling}
                      title={c.status === "active" ? "Pausar campaña" : "Reactivar campaña"}
                      style={{ display: "inline-flex", alignItems: "center", gap: "5px", ...mono, fontSize: "11px", color: c.status === "active" ? "#BD4332" : "#1B6B4F", background: c.status === "active" ? "#FDE8E5" : "#DCEFE4", border: `1px solid ${c.status === "active" ? "#F5B4AA" : "#A8D9BC"}`, borderRadius: "8px", padding: "5px 10px", cursor: isToggling ? "not-allowed" : "pointer" }}
                    >
                      {isToggling ? <Loader2 size={11} className="animate-spin" /> : c.status === "active" ? <Pause size={11} /> : <Play size={11} />}
                      {c.status === "active" ? "Pausar" : "Reactivar"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══ Organic / untracked UTM sources ════════════════════════════════ */}
      {organicSources.length > 0 && (
        <div style={{ background: surface, border: `1px solid ${line}`, borderRadius: "16px", padding: "16px 20px" }}>
          <SectionHeading>Otras fuentes detectadas (UTM)</SectionHeading>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {organicSources.map((u) => {
              const color = channelColor(u.source);
              const total = (dist?.career_site.applications ?? 0) + (dist?.utm_channels ?? []).reduce((s, x) => s + x.applications, 0);
              const pct = total > 0 ? (u.applications / total) * 100 : 0;
              return (
                <div key={u.source} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: color, flexShrink: 0 }} />
                  <span style={{ ...mono, fontSize: "11.5px", width: "110px", flexShrink: 0 }}>{u.source}</span>
                  <div style={{ flex: 1, height: "6px", background: "#F4F0E8", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "3px" }} />
                  </div>
                  <span style={{ ...mono, fontSize: "11.5px", color: soft, minWidth: "60px", textAlign: "right" }}>
                    {u.applications} aplic.
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ AI Optimizer (collapsible) ═══════════════════════════════════════ */}
      <div style={{ background: surface, border: `1px solid ${line}`, borderRadius: "16px", overflow: "hidden" }}>
        <button
          onClick={() => setShowOptimizer((v) => !v)}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "16px 20px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
        >
          <span style={{ width: "26px", height: "26px", borderRadius: "8px", background: "#DCEFE4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M4 19V9M10 19V5M16 19v-7M20 19V11" stroke="#0E5C4A" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </span>
          <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "14px", flex: 1 }}>
            Optimizar distribución con IA
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ transform: showOptimizer ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }}>
            <path d="M6 9l6 6 6-6" stroke={soft} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {showOptimizer && (
          <div style={{ borderTop: `1px solid ${line}`, padding: "20px" }}>
            <p style={{ fontSize: "13.5px", lineHeight: 1.55, color: soft, margin: "0 0 16px" }}>
              Define objetivo y presupuesto. El agente recomienda canales, reparto y copy según la performance histórica.
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: "12px" }}>
              <div>
                <div style={{ ...mono, fontSize: "10.5px", textTransform: "uppercase" as const, letterSpacing: ".5px", color: soft, marginBottom: "7px" }}>Objetivo</div>
                <select
                  value={objective}
                  onChange={(e) => setObjective(e.target.value as typeof objective)}
                  style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: "13.5px", fontWeight: 600, color: ink, background: "#F4F0E8", border: `1.5px solid ${line}`, borderRadius: "11px", padding: "9px 12px", outline: "none", cursor: "pointer" }}
                >
                  <option value="volume">Volumen de candidatos</option>
                  <option value="quality">Calidad de candidatos</option>
                  <option value="cpa">Minimizar coste por aplicación</option>
                </select>
              </div>
              <div>
                <div style={{ ...mono, fontSize: "10.5px", textTransform: "uppercase" as const, letterSpacing: ".5px", color: soft, marginBottom: "7px" }}>Presupuesto (€)</div>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: "13.5px", fontWeight: 600, width: "110px", color: ink, background: "#F4F0E8", border: `1.5px solid ${line}`, borderRadius: "11px", padding: "9px 12px", outline: "none" }}
                />
              </div>
              <button
                onClick={optimize}
                disabled={optimizing}
                style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13px", color: "#fff", background: "#0E5C4A", border: `2px solid ${ink}`, borderRadius: "11px", padding: "10px 18px", boxShadow: `3px 3px 0 ${ink}`, cursor: optimizing ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "6px", opacity: optimizing ? 0.7 : 1 }}
              >
                {optimizing && <Loader2 size={13} className="animate-spin" />}
                Generar plan
              </button>
            </div>

            {error && <p style={{ fontSize: "13px", color: "#BD4332", marginTop: "12px" }}>{error}</p>}

            {/* Agent recommendation */}
            {plan && (
              <div style={{ position: "relative", overflow: "hidden", background: "#1A1A17", color: "#F4F0E8", borderRadius: "14px", padding: "16px 18px", marginTop: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "10px" }}>
                  <span style={{ width: "24px", height: "24px", borderRadius: "7px", background: "rgba(198,242,78,.16)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M4 19V9M10 19V5M16 19v-7M20 19V11" stroke="#C6F24E" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </span>
                  <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13.5px" }}>Plan del agente</span>
                  {planMode === "fallback" && (
                    <span style={{ ...mono, fontSize: "10px", color: "#E0A23C", background: "rgba(224,162,60,.12)", border: "1px solid rgba(224,162,60,.3)", borderRadius: "999px", padding: "2px 8px" }}>heurístico</span>
                  )}
                  <span style={{ marginLeft: "auto", ...mono, fontSize: "10px", color: "#C6F24E", background: "rgba(198,242,78,.12)", border: "1px solid rgba(198,242,78,.3)", borderRadius: "999px", padding: "2px 8px", whiteSpace: "nowrap" }}>
                    {objectiveLabel[objective]} · {formatMoney(Number(budget))}
                  </span>
                </div>

                <p style={{ fontSize: "13.5px", lineHeight: 1.55, color: "#CFCAC0", margin: "0 0 12px" }}>{plan.rationale}</p>

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
                            <span style={{ fontSize: "13px", fontWeight: 700, color: "#F4F0E8" }}>{r.channel_name}</span>
                            <span style={{ ...mono, fontSize: "10px", color: "#C6F24E", background: "rgba(198,242,78,.10)", border: "1px solid rgba(198,242,78,.25)", borderRadius: "999px", padding: "2px 7px" }}>
                              prioridad {r.priority}
                            </span>
                            <span style={{ ...mono, fontSize: "10px", color: "#8C877E" }}>
                              {formatMoney(r.budget)} · ~{r.expected_applications} aplic. · CPA {formatMoney(r.expected_cpa)}
                            </span>
                          </div>
                          <p style={{ fontSize: "12px", color: "#8C877E", margin: "0 0 5px" }}>{r.reason}</p>
                          <p style={{ fontSize: "12px", fontStyle: "italic", color: "#CFCAC0", background: "#26241F", borderRadius: "7px", padding: "5px 9px", margin: 0 }}>
                            &ldquo;{r.copy}&rdquo;
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <button
                    onClick={activatePlan}
                    disabled={activating || selected.size === 0}
                    style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "12px", color: "#1A1A17", background: selected.size > 0 ? "#C6F24E" : "#38352E", border: "none", borderRadius: "9px", padding: "8px 14px", cursor: activating || selected.size === 0 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "6px", opacity: selected.size === 0 ? 0.6 : 1 }}
                  >
                    {activating && <Loader2 size={12} className="animate-spin" />}
                    Activar selección{selected.size > 0 ? ` (${selected.size})` : ""}
                  </button>
                  <span style={{ marginLeft: "auto", ...mono, fontSize: "10.5px", color: "#8C877E" }}>Tú decides</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
