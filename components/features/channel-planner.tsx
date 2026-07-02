"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Copy, Check, ExternalLink, Play, Pause, RefreshCw } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import type { Campaign, Channel } from "@/lib/types";
import type { ChannelPlan } from "@/agents/agent-channel-optimizer";

/* ── Types ─────────────────────────────────────────────────────────────────── */

type DistributionPlan = {
  id: string;
  objective: string;
  budget: number;
  plan: ChannelPlan;
  model: "ok" | "fallback";
  status: "pending" | "activated" | "superseded";
  activated_at: string | null;
  created_at: string;
};

type DistData = {
  company_slug: string;
  career_site: { job_views: number; applications: number };
  utm_channels: { source: string; applications: number }[];
  channels: (Channel & { utm_source: string | null })[];
  active_plan: DistributionPlan | null;
};

/* ── Design tokens ──────────────────────────────────────────────────────────── */

const CHANNEL_COLOR: Record<string, string> = {
  infojobs:    "#3B7FC4",
  linkedin:    "#2867B2",
  indeed:      "#2164F3",
  career_site: "#0E5C4A",
  glassdoor:   "#0CAA41",
  google:      "#EA4335",
  meta:        "#1877F2",
  turijobs:    "#E85A1B",
  default:     "#9C9588",
};

function channelColor(src: string) {
  const key = src.toLowerCase().replace(/\s+/g, "_").replace(/\s/g, "");
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

function convRate(views: number, apps: number) {
  if (!views) return "—";
  return `${((apps / views) * 100).toFixed(1)}%`;
}

function relativeDate(iso: string) {
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return "ahora mismo";
  if (diff < 60) return `hace ${diff}m`;
  if (diff < 1440) return `hace ${Math.round(diff / 60)}h`;
  return `hace ${Math.round(diff / 1440)}d`;
}

/* ── Sub-components ─────────────────────────────────────────────────────────── */

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ ...mono, fontSize: "10px", textTransform: "uppercase" as const, letterSpacing: "1px", color: soft, marginBottom: "10px" }}>
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
    <button onClick={copy} style={{ display: "inline-flex", alignItems: "center", gap: "5px", ...mono, fontSize: "11px", color: copied ? "#1B6B4F" : soft, background: copied ? "#DCEFE4" : "#F4F0E8", border: `1px solid ${copied ? "#A8D9BC" : line}`, borderRadius: "8px", padding: "5px 9px", cursor: "pointer" }}>
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? "Copiado" : "URL tracking"}
    </button>
  );
}

/* ── Main component ─────────────────────────────────────────────────────────── */

export function ChannelPlanner({ jobId, campaigns: initialCampaigns }: { jobId: string; campaigns: Campaign[] }) {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [dist, setDist] = useState<DistData | null>(null);
  const [distLoading, setDistLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  // Optimizer
  const [planId, setPlanId] = useState<string | null>(null);
  const [plan, setPlan] = useState<ChannelPlan | null>(null);
  const [planMeta, setPlanMeta] = useState<{ model: string; objective: string; budget: number; created_at: string; status: string } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [optimizing, setOptimizing] = useState(false);
  const [activating, setActivating] = useState(false);
  const [objective, setObjective] = useState<"volume" | "quality" | "cpa">("volume");
  const [budget, setBudget] = useState("500");
  const [error, setError] = useState("");
  const [showOptimizer, setShowOptimizer] = useState(false);

  const fetchDist = useCallback(async () => {
    setDistLoading(true);
    try {
      const r = await fetch(`/api/jobs/${jobId}/distribution`);
      if (!r.ok) return;
      const data: DistData = await r.json();
      setDist(data);
      // Restore persisted plan if exists
      if (data.active_plan && !plan) {
        setPlan(data.active_plan.plan);
        setPlanId(data.active_plan.id);
        setPlanMeta({
          model: data.active_plan.model,
          objective: data.active_plan.objective,
          budget: data.active_plan.budget,
          created_at: data.active_plan.created_at,
          status: data.active_plan.status,
        });
        setSelected(new Set(data.active_plan.plan.recommendations.map((r) => r.channel_id)));
        setObjective(data.active_plan.objective as typeof objective);
        setBudget(String(data.active_plan.budget));
        // Auto-expand optimizer if there's a pending plan waiting for action
        if (data.active_plan.status === "pending") setShowOptimizer(true);
      }
    } finally {
      setDistLoading(false);
    }
  }, [jobId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchDist(); }, [fetchDist]);

  function trackedUrl(utmSource: string) {
    if (!dist?.company_slug) return "";
    const base = typeof window !== "undefined" ? window.location.origin : "";
    return `${base}/careers/${dist.company_slug}/jobs/${jobId}?utm_source=${utmSource}&utm_medium=${utmSource === "career_site" ? "organic" : "job_board"}&utm_campaign=${jobId.slice(0, 8)}`;
  }

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
      if (r.ok) setCampaigns((prev) => prev.map((c) => c.id === id ? { ...c, status: next as Campaign["status"] } : c));
    } finally {
      setToggling(null);
    }
  }

  async function simulate() {
    setSimulating(true);
    await fetch("/api/campaigns/simulate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId }) });
    setSimulating(false);
    router.refresh();
  }

  async function generatePlan() {
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
      setPlanId(data.plan_id ?? null);
      setPlanMeta({ model: data.status, objective, budget: Number(budget), created_at: new Date().toISOString(), status: "pending" });
      setSelected(new Set(data.output.recommendations.map((rec: { channel_id: string }) => rec.channel_id)));
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
        body: JSON.stringify({ selections, objective, plan_id: planId }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Error al activar canales");
      setPlanMeta((prev) => prev ? { ...prev, status: "activated" } : prev);
      await fetchDist();
      router.refresh();
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setActivating(false);
    }
  }

  const objectiveLabel: Record<string, string> = { volume: "Volumen", quality: "Calidad", cpa: "Mín. CPA" };

  const campaignUtmSources = new Set(
    campaigns.map((c) => dist?.channels.find((ch) => ch.id === c.channel_id)?.utm_source).filter(Boolean)
  );
  const organicSources = (dist?.utm_channels ?? []).filter(
    (u) => !campaignUtmSources.has(u.source) && u.source !== "career_site"
  );

  const totalApps =
    (dist?.career_site.applications ?? 0) +
    (dist?.utm_channels ?? []).reduce((s, u) => s + u.applications, 0);

  /* ────────────────────────────────────────────────────────── render ──── */

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

      {/* ══ 1. Career Site ══════════════════════════════════════════════════ */}
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
            <Loader2 size={13} className="animate-spin" /> Cargando…
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", alignItems: "center" }}>
            {[
              ["VISITAS", (dist?.career_site.job_views ?? 0).toLocaleString("es-ES")],
              ["CANDIDATURAS", String(dist?.career_site.applications ?? 0)],
              ["CONVERSIÓN", convRate(dist?.career_site.job_views ?? 0, dist?.career_site.applications ?? 0)],
              ["CPA", "€0"],
            ].map(([label, value]) => (
              <div key={label}>
                <div style={{ ...mono, fontSize: "9.5px", color: soft, marginBottom: "3px" }}>{label}</div>
                <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "20px" }}>{value}</div>
              </div>
            ))}
            <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
              <CopyButton text={trackedUrl("career_site")} />
              {dist?.company_slug && (
                <a href={`/careers/${dist.company_slug}/jobs/${jobId}`} target="_blank" rel="noopener"
                  style={{ display: "inline-flex", alignItems: "center", gap: "5px", ...mono, fontSize: "11px", color: soft, background: "#F4F0E8", border: `1px solid ${line}`, borderRadius: "8px", padding: "5px 9px", textDecoration: "none" }}>
                  <ExternalLink size={11} /> Ver oferta
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ══ 2. Paid campaigns ═══════════════════════════════════════════════ */}
      {campaigns.length > 0 && (
        <div style={{ background: surface, border: `1px solid ${line}`, borderRadius: "16px", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 18px 13px", borderBottom: `1px solid ${line}` }}>
            <Label>Distribución pagada</Label>
            <button onClick={simulate} disabled={simulating}
              style={{ ...mono, fontSize: "11px", color: "#0E5C4A", background: "#DCEFE4", border: "none", borderRadius: "8px", padding: "5px 10px", cursor: simulating ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "5px" }}>
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
            const budgetPct = c.budget > 0 ? Math.min(100, Math.round((Number(c.spend) / Number(c.budget)) * 100)) : 0;
            const daysActive = c.started_at
              ? Math.floor((Date.now() - new Date(c.started_at).getTime()) / 86_400_000)
              : 0;
            const alerts: { msg: string; level: "warn" | "danger" }[] = [];
            if (c.status === "active" && daysActive >= 5 && apps === 0)
              alerts.push({ msg: `Sin candidaturas tras ${daysActive}d activa`, level: "warn" });
            if (budgetPct >= 90 && c.status === "active")
              alerts.push({ msg: `Presupuesto al ${budgetPct}%`, level: budgetPct >= 100 ? "danger" : "warn" });
            return (
              <div key={c.id} style={{ padding: "16px 18px", borderBottom: `1px solid ${line}`, opacity: c.status === "paused" ? 0.65 : 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "12px" }}>
                  <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: "13.5px", fontWeight: 700, flex: 1 }}>{name}</span>
                  <span style={{ ...mono, fontSize: "10px", color: c.status === "active" ? "#1B6B4F" : soft, background: c.status === "active" ? "#DCEFE3" : "#F4F0E8", border: `1px solid ${c.status === "active" ? "#A8D9BC" : line}`, borderRadius: "999px", padding: "2px 7px" }}>
                    {c.status === "active" ? "activa" : c.status === "paused" ? "pausada" : "finalizada"}
                  </span>
                  <CopyButton text={trackedUrl(utmSrc)} />
                  {c.status !== "finished" && (
                    <button onClick={() => toggleCampaign(c.id, c.status)} disabled={isToggling}
                      style={{ display: "inline-flex", alignItems: "center", gap: "5px", ...mono, fontSize: "11px", color: c.status === "active" ? "#BD4332" : "#1B6B4F", background: c.status === "active" ? "#FDE8E5" : "#DCEFE4", border: `1px solid ${c.status === "active" ? "#F5B4AA" : "#A8D9BC"}`, borderRadius: "8px", padding: "5px 9px", cursor: isToggling ? "not-allowed" : "pointer" }}>
                      {isToggling ? <Loader2 size={11} className="animate-spin" /> : c.status === "active" ? <Pause size={11} /> : <Play size={11} />}
                      {c.status === "active" ? "Pausar" : "Reactivar"}
                    </button>
                  )}
                </div>
                {alerts.length > 0 && (
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
                    {alerts.map((a) => (
                      <span key={a.msg} style={{ ...mono, fontSize: "10.5px", color: a.level === "danger" ? "#BD4332" : "#946312", background: a.level === "danger" ? "#FDE8E5" : "rgba(148,99,18,.08)", border: `1px solid ${a.level === "danger" ? "#F5B4AA" : "rgba(148,99,18,.25)"}`, borderRadius: "999px", padding: "3px 10px", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                        ⚠ {a.msg}
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginBottom: "10px" }}>
                  {[
                    ["PRESUPUESTO", formatMoney(c.budget)],
                    ["GASTADO", formatMoney(Number(c.spend))],
                    ["VIEWS", c.views.toLocaleString("es-ES")],
                    ["CANDIDATURAS", String(apps)],
                    ["CPA REAL", cpa != null ? formatMoney(cpa) : "—"],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <div style={{ ...mono, fontSize: "9.5px", color: soft, marginBottom: "2px" }}>{label}</div>
                      <div style={{ fontSize: "13px", fontWeight: 700, ...(label === "CPA REAL" && cpa != null ? { color: cpaColor(cpa), ...mono } : {}) }}>{value}</div>
                    </div>
                  ))}
                </div>
                {c.budget > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                    <div style={{ flex: 1, height: "5px", background: "#F4F0E8", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{ width: `${budgetPct}%`, height: "100%", background: budgetPct > 85 ? "#BD4332" : color, borderRadius: "3px", transition: "width .3s" }} />
                    </div>
                    <span style={{ ...mono, fontSize: "10px", color: soft, flexShrink: 0 }}>{budgetPct}% gastado</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ══ 3. Organic / untracked UTM sources ══════════════════════════════ */}
      {organicSources.length > 0 && (
        <div style={{ background: surface, border: `1px solid ${line}`, borderRadius: "16px", padding: "16px 20px" }}>
          <Label>Otras fuentes detectadas</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
            {organicSources.map((u) => {
              const color = channelColor(u.source);
              const pct = totalApps > 0 ? (u.applications / totalApps) * 100 : 0;
              return (
                <div key={u.source} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: color, flexShrink: 0 }} />
                  <span style={{ ...mono, fontSize: "11px", width: "100px", flexShrink: 0 }}>{u.source}</span>
                  <div style={{ flex: 1, height: "5px", background: "#F4F0E8", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "3px" }} />
                  </div>
                  <span style={{ ...mono, fontSize: "11px", color: soft, minWidth: "60px", textAlign: "right" }}>{u.applications} aplic.</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ 4. AI Optimizer ════════════════════════════════════════════════ */}
      <div style={{ background: surface, border: `1px solid ${line}`, borderRadius: "16px", overflow: "hidden" }}>
        <button onClick={() => setShowOptimizer((v) => !v)}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "16px 20px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
          <span style={{ width: "26px", height: "26px", borderRadius: "8px", background: "#DCEFE4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M4 19V9M10 19V5M16 19v-7M20 19V11" stroke="#0E5C4A" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </span>
          <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "14px", flex: 1 }}>
            Optimizar distribución con IA
            {planMeta && (
              <span style={{ ...mono, fontSize: "10px", fontWeight: 400, color: planMeta.status === "activated" ? "#1B6B4F" : "#946312", marginLeft: "10px" }}>
                {planMeta.status === "activated" ? "✓ plan activado" : `plan pendiente · ${relativeDate(planMeta.created_at)}`}
              </span>
            )}
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            style={{ transform: showOptimizer ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }}>
            <path d="M6 9l6 6 6-6" stroke={soft} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {showOptimizer && (
          <div style={{ borderTop: `1px solid ${line}`, padding: "20px" }}>

            {/* Config controls */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: "12px", marginBottom: plan ? "0" : "0" }}>
              <div>
                <div style={{ ...mono, fontSize: "10px", textTransform: "uppercase" as const, letterSpacing: ".5px", color: soft, marginBottom: "7px" }}>Objetivo</div>
                <select value={objective} onChange={(e) => setObjective(e.target.value as typeof objective)}
                  style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: "13.5px", fontWeight: 600, color: ink, background: "#F4F0E8", border: `1.5px solid ${line}`, borderRadius: "11px", padding: "9px 12px", outline: "none", cursor: "pointer" }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#0E5C4A"; e.currentTarget.style.boxShadow = "0 0 0 3px #DCEFE4"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = line; e.currentTarget.style.boxShadow = "none"; }}>
                  <option value="volume">Volumen de candidatos</option>
                  <option value="quality">Calidad de candidatos</option>
                  <option value="cpa">Minimizar coste por aplicación</option>
                </select>
              </div>
              <div>
                <div style={{ ...mono, fontSize: "10px", textTransform: "uppercase" as const, letterSpacing: ".5px", color: soft, marginBottom: "7px" }}>Presupuesto (€)</div>
                <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)}
                  style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: "13.5px", fontWeight: 600, width: "110px", color: ink, background: "#F4F0E8", border: `1.5px solid ${line}`, borderRadius: "11px", padding: "9px 12px", outline: "none" }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#0E5C4A"; e.currentTarget.style.boxShadow = "0 0 0 3px #DCEFE4"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = line; e.currentTarget.style.boxShadow = "none"; }} />
              </div>
              <button onClick={generatePlan} disabled={optimizing}
                style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13px", color: "#fff", background: "#0E5C4A", border: `2px solid ${ink}`, borderRadius: "11px", padding: "10px 18px", boxShadow: `3px 3px 0 ${ink}`, cursor: optimizing ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "6px", opacity: optimizing ? 0.7 : 1 }}>
                {optimizing ? <Loader2 size={13} className="animate-spin" /> : plan ? <RefreshCw size={13} /> : null}
                {plan ? "Regenerar plan" : "Generar plan"}
              </button>
            </div>

            {plan && planMeta && (
              <>
                {/* Plan header */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "20px 0 12px", flexWrap: "wrap" }}>
                  <span style={{ ...mono, fontSize: "10px", color: soft }}>
                    {objectiveLabel[planMeta.objective]} · {formatMoney(planMeta.budget)} · {relativeDate(planMeta.created_at)}
                  </span>
                  {planMeta.model === "fallback" && (
                    <span style={{ ...mono, fontSize: "10px", color: "#946312", background: "rgba(148,99,18,.1)", border: "1px solid rgba(148,99,18,.25)", borderRadius: "999px", padding: "2px 8px" }}>heurístico</span>
                  )}
                  {planMeta.status === "activated" && (
                    <span style={{ ...mono, fontSize: "10px", color: "#1B6B4F", background: "#DCEFE3", border: "1px solid #A8D9BC", borderRadius: "999px", padding: "2px 8px" }}>✓ activado</span>
                  )}
                  {planMeta.status === "pending" && (
                    <span style={{ ...mono, fontSize: "10px", color: "#946312", background: "rgba(148,99,18,.1)", border: "1px solid rgba(148,99,18,.25)", borderRadius: "999px", padding: "2px 8px" }}>pendiente de activar</span>
                  )}
                </div>

                {/* Dark plan card */}
                <div style={{ background: "#1A1A17", color: "#F4F0E8", borderRadius: "14px", padding: "16px 18px" }}>
                  <p style={{ fontSize: "13.5px", lineHeight: 1.55, color: "#CFCAC0", margin: "0 0 14px" }}>{plan.rationale}</p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "7px", marginBottom: "14px" }}>
                    {plan.recommendations.map((r) => {
                      const on = selected.has(r.channel_id);
                      const isActivated = planMeta.status === "activated";
                      return (
                        <label key={r.channel_id}
                          style={{ display: "flex", alignItems: "flex-start", gap: "10px", background: on ? "rgba(198,242,78,.06)" : "#26241F", border: `1px solid ${on ? "rgba(198,242,78,.3)" : "#38352E"}`, borderRadius: "11px", padding: "11px 13px", cursor: isActivated ? "default" : "pointer" }}>
                          {!isActivated && (
                            <input type="checkbox" checked={on}
                              onChange={(e) => {
                                const next = new Set(selected);
                                e.target.checked ? next.add(r.channel_id) : next.delete(r.channel_id);
                                setSelected(next);
                              }}
                              style={{ marginTop: "2px", accentColor: "#C6F24E", flexShrink: 0 }} />
                          )}
                          {isActivated && (
                            <span style={{ marginTop: "2px", width: "14px", height: "14px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: on ? "#C6F24E" : "#38352E" }} />
                            </span>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                              <span style={{ fontSize: "13px", fontWeight: 700, color: "#F4F0E8" }}>{r.channel_name}</span>
                              <span style={{ ...mono, fontSize: "10px", color: "#C6F24E", background: "rgba(198,242,78,.10)", border: "1px solid rgba(198,242,78,.25)", borderRadius: "999px", padding: "2px 7px" }}>prioridad {r.priority}</span>
                              <span style={{ ...mono, fontSize: "10px", color: "#8C877E" }}>
                                {r.budget > 0 ? formatMoney(r.budget) : "orgánico"} · ~{r.expected_applications} aplic. · CPA {r.expected_cpa > 0 ? formatMoney(r.expected_cpa) : "€0"}
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

                  {planMeta.status === "pending" && (
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <button onClick={activatePlan} disabled={activating || selected.size === 0}
                        style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "12px", color: "#1A1A17", background: selected.size > 0 ? "#C6F24E" : "#38352E", border: "none", borderRadius: "9px", padding: "8px 14px", cursor: activating || selected.size === 0 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "6px", opacity: selected.size === 0 ? 0.6 : 1 }}>
                        {activating && <Loader2 size={12} className="animate-spin" />}
                        Activar selección{selected.size > 0 ? ` (${selected.size})` : ""}
                      </button>
                      <span style={{ ...mono, fontSize: "10.5px", color: "#8C877E" }}>Los agentes sugieren — tú decides</span>
                    </div>
                  )}
                </div>
              </>
            )}

            {error && <p style={{ fontSize: "13px", color: "#BD4332", marginTop: "12px" }}>{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
