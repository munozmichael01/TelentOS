"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import type { Channel } from "@/lib/types";

/* ── Types ──────────────────────────────────────────────────────────────────── */

type ReportRow = {
  source: string;
  channel_name: string;
  applications: number;
  hired: number;
  avg_fit: number | null;
  cpa: number | null;
  conversion: number | null;
  budget: number;
  spend: number;
  views: number;
  active_campaigns: number;
  top_sector: string | null;
  top_location: string | null;
  top_jobs: { id: string; title: string; applications: number }[];
};

type ReportData = {
  rows: ReportRow[];
  channels: Channel[];
  sectors: string[];
  jobs: { id: string; title: string; sector: string | null; location: string | null }[];
  meta: { period: string; total_applications: number };
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
  direct:      "#9C9588",
  default:     "#9C9588",
};

function channelColor(src: string) {
  const k = src.toLowerCase().replace(/\s+/g, "_");
  return CHANNEL_COLOR[k] ?? Object.entries(CHANNEL_COLOR).find(([key]) => k.includes(key))?.[1] ?? CHANNEL_COLOR.default;
}

function cpaColor(cpa: number) {
  if (cpa <= 15) return "#1B6B4F";
  if (cpa <= 35) return "#946312";
  return "#BD4332";
}

const mono: React.CSSProperties = { fontFamily: "'Space Mono',monospace" };
const ink = "#1A1A17", soft = "#79746B", line = "#E7E1D4", surface = "#FCFAF6";

const KIND_LABEL: Record<string, string> = {
  job_board:   "Job Board",
  aggregator:  "Agregador",
  social:      "Social",
  career_site: "Directo",
};

/* ── Tab: KPIs ──────────────────────────────────────────────────────────────── */

function KPIsTab() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30d");
  const [sector, setSector] = useState("");
  const [location, setLocation] = useState("");
  const [jobId, setJobId] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period });
      if (sector) params.set("sector", sector);
      if (location) params.set("location", location);
      if (jobId) params.set("job_id", jobId);
      const r = await fetch(`/api/channels/report?${params}`);
      if (r.ok) setData(await r.json());
    } finally {
      setLoading(false);
    }
  }, [period, sector, location, jobId]);

  useEffect(() => { load(); }, [load]);

  const maxApps = data?.rows[0]?.applications ?? 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Filters */}
      <div style={{ background: surface, border: `1px solid ${line}`, borderRadius: "14px", padding: "14px 18px", display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "flex-end" }}>
        <div>
          <div style={{ ...mono, fontSize: "10px", color: soft, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: "6px" }}>Periodo</div>
          <select value={period} onChange={(e) => setPeriod(e.target.value)}
            style={{ fontFamily: "inherit", fontSize: "13px", fontWeight: 600, color: ink, background: "#F4F0E8", border: `1.5px solid ${line}`, borderRadius: "10px", padding: "8px 12px", outline: "none", cursor: "pointer" }}>
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Últimos 30 días</option>
            <option value="90d">Últimos 90 días</option>
            <option value="all">Todo el tiempo</option>
          </select>
        </div>
        <div>
          <div style={{ ...mono, fontSize: "10px", color: soft, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: "6px" }}>Sector</div>
          <select value={sector} onChange={(e) => setSector(e.target.value)}
            style={{ fontFamily: "inherit", fontSize: "13px", fontWeight: 600, color: ink, background: "#F4F0E8", border: `1.5px solid ${line}`, borderRadius: "10px", padding: "8px 12px", outline: "none", cursor: "pointer", minWidth: "160px" }}>
            <option value="">Todos</option>
            {(data?.sectors ?? []).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <div style={{ ...mono, fontSize: "10px", color: soft, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: "6px" }}>Ubicación</div>
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Madrid, Barcelona…"
            style={{ fontFamily: "inherit", fontSize: "13px", color: ink, background: "#F4F0E8", border: `1.5px solid ${line}`, borderRadius: "10px", padding: "8px 12px", outline: "none", width: "170px" }} />
        </div>
        <div>
          <div style={{ ...mono, fontSize: "10px", color: soft, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: "6px" }}>Oferta concreta</div>
          <select value={jobId} onChange={(e) => setJobId(e.target.value)}
            style={{ fontFamily: "inherit", fontSize: "13px", fontWeight: 600, color: ink, background: "#F4F0E8", border: `1.5px solid ${line}`, borderRadius: "10px", padding: "8px 12px", outline: "none", cursor: "pointer", minWidth: "200px" }}>
            <option value="">Todas las ofertas</option>
            {(data?.jobs ?? []).map((j) => <option key={j.id} value={j.id}>{j.title}{j.location ? ` — ${j.location}` : ""}</option>)}
          </select>
        </div>
        {loading && <Loader2 size={16} className="animate-spin" style={{ color: soft, alignSelf: "center", marginTop: "20px" }} />}
      </div>

      {/* Summary KPI strip */}
      {data && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: "10px" }}>
          {[
            { label: "Total candidaturas", value: data.meta.total_applications.toLocaleString("es-ES") },
            { label: "Canales activos", value: String(data.rows.filter((r) => r.applications > 0).length) },
            { label: "Mejor canal", value: data.rows[0]?.channel_name ?? "—" },
            { label: "CPA medio", value: data.rows.filter((r) => r.cpa).length ? formatMoney(Math.round(data.rows.filter((r) => r.cpa).reduce((s, r) => s + (r.cpa ?? 0), 0) / data.rows.filter((r) => r.cpa).length)) : "—" },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: surface, border: `1px solid ${line}`, borderRadius: "13px", padding: "14px 16px" }}>
              <div style={{ ...mono, fontSize: "9.5px", color: soft, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: "6px" }}>{label}</div>
              <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "20px", letterSpacing: "-.4px" }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Channel rows */}
      {data && data.rows.length === 0 && (
        <div style={{ background: surface, border: `1px solid ${line}`, borderRadius: "14px", padding: "40px", textAlign: "center", color: soft, fontSize: "14px" }}>
          Sin datos para los filtros seleccionados.
        </div>
      )}

      {data && data.rows.map((row) => {
        const color = channelColor(row.source);
        const pct = maxApps > 0 ? (row.applications / maxApps) * 100 : 0;
        const isOpen = expanded === row.source;
        return (
          <div key={row.source} style={{ background: surface, border: `1px solid ${line}`, borderRadius: "14px", overflow: "hidden" }}>
            {/* Main row */}
            <button
              onClick={() => setExpanded(isOpen ? null : row.source)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: "14px", padding: "16px 20px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
              {/* Channel name + bar */}
              <div style={{ display: "flex", alignItems: "center", gap: "9px", minWidth: "160px", flexShrink: 0 }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: color, flexShrink: 0 }} />
                <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: "14px" }}>{row.channel_name}</span>
                {row.active_campaigns > 0 && (
                  <span style={{ ...mono, fontSize: "10px", color: "#1B6B4F", background: "#DCEFE3", border: "1px solid #A8D9BC", borderRadius: "999px", padding: "2px 7px" }}>
                    {row.active_campaigns} activa{row.active_campaigns > 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {/* Bar */}
              <div style={{ flex: 1, height: "6px", background: "#F4F0E8", borderRadius: "3px", overflow: "hidden", minWidth: "80px" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "3px" }} />
              </div>

              {/* KPI columns */}
              <div style={{ display: "flex", gap: "24px", flexShrink: 0 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ ...mono, fontSize: "9.5px", color: soft }}>CANDIDATURAS</div>
                  <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "18px" }}>{row.applications}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ ...mono, fontSize: "9.5px", color: soft }}>CPA</div>
                  <div style={{ ...mono, fontSize: "14px", fontWeight: 700, color: row.cpa != null ? cpaColor(row.cpa) : soft }}>
                    {row.cpa != null ? formatMoney(row.cpa) : "—"}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ ...mono, fontSize: "9.5px", color: soft }}>FIT MEDIO</div>
                  <div style={{ ...mono, fontSize: "14px", fontWeight: 700 }}>{row.avg_fit != null ? `${row.avg_fit}` : "—"}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ ...mono, fontSize: "9.5px", color: soft }}>CONVERSIÓN</div>
                  <div style={{ ...mono, fontSize: "14px", fontWeight: 700 }}>{row.conversion != null ? `${row.conversion}%` : "—"}</div>
                </div>
              </div>

              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                style={{ flexShrink: 0, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }}>
                <path d="M6 9l6 6 6-6" stroke={soft} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* Expanded detail */}
            {isOpen && (
              <div style={{ borderTop: `1px solid ${line}`, padding: "16px 20px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "20px" }}>
                {/* Sector breakdown */}
                <div>
                  <div style={{ ...mono, fontSize: "10px", color: soft, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: "8px" }}>Por sector</div>
                  {row.top_sector ? (
                    <div style={{ fontSize: "13.5px", fontWeight: 700 }}>{row.top_sector} <span style={{ fontWeight: 400, color: soft }}>(más candidaturas)</span></div>
                  ) : <div style={{ fontSize: "13px", color: soft }}>Sin datos</div>}
                </div>

                {/* Location breakdown */}
                <div>
                  <div style={{ ...mono, fontSize: "10px", color: soft, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: "8px" }}>Por ubicación</div>
                  {row.top_location ? (
                    <div style={{ fontSize: "13.5px", fontWeight: 700 }}>{row.top_location} <span style={{ fontWeight: 400, color: soft }}>(más candidaturas)</span></div>
                  ) : <div style={{ fontSize: "13px", color: soft }}>Sin datos</div>}
                </div>

                {/* Budget context */}
                {row.budget > 0 && (
                  <div>
                    <div style={{ ...mono, fontSize: "10px", color: soft, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: "8px" }}>Presupuesto</div>
                    <div style={{ fontSize: "13.5px", fontWeight: 700 }}>{formatMoney(row.spend)} <span style={{ fontWeight: 400, color: soft }}>de {formatMoney(row.budget)}</span></div>
                    <div style={{ marginTop: "6px", height: "4px", background: "#F4F0E8", borderRadius: "2px", overflow: "hidden" }}>
                      <div style={{ width: `${Math.min(100, (row.spend / row.budget) * 100)}%`, height: "100%", background: color }} />
                    </div>
                  </div>
                )}

                {/* Top jobs */}
                {row.top_jobs.length > 0 && (
                  <div>
                    <div style={{ ...mono, fontSize: "10px", color: soft, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: "8px" }}>Ofertas con más candidaturas</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {row.top_jobs.map((j) => (
                        <div key={j.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                          <Link href={`/jobs/${j.id}`} style={{ fontSize: "13px", color: ink, textDecoration: "none", fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {j.title}
                          </Link>
                          <span style={{ ...mono, fontSize: "10.5px", color: soft, flexShrink: 0 }}>{j.applications} aplic.</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {!data && !loading && (
        <div style={{ background: surface, border: `1px solid ${line}`, borderRadius: "14px", padding: "40px", textAlign: "center", color: soft }}>
          Sin datos.
        </div>
      )}
    </div>
  );
}

/* ── Tab: Configuración ─────────────────────────────────────────────────────── */

function ConfigTab({ channels }: { channels: Channel[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <p style={{ fontSize: "13.5px", color: soft, margin: "0 0 6px" }}>
        Estos son los canales disponibles para distribuir tus ofertas. Genera URLs con tracking desde la pestaña <strong>Distribución</strong> de cada oferta. Las integraciones directas con APIs de job boards están en desarrollo.
      </p>
      {channels.map((ch) => (
        <div key={ch.id} style={{ background: surface, border: `1px solid ${line}`, borderRadius: "13px", padding: "16px 20px", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "160px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "4px" }}>
              <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: channelColor(ch.utm_source ?? ch.name), flexShrink: 0 }} />
              <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: "14px" }}>{ch.name}</span>
              <span style={{ ...mono, fontSize: "10px", color: soft, background: "#F4F0E8", border: `1px solid ${line}`, borderRadius: "999px", padding: "2px 8px" }}>
                {KIND_LABEL[ch.kind] ?? ch.kind}
              </span>
            </div>
            {ch.audience && <div style={{ fontSize: "13px", color: soft }}>{ch.audience}</div>}
          </div>
          <div style={{ display: "flex", gap: "24px", flexShrink: 0 }}>
            <div>
              <div style={{ ...mono, fontSize: "9.5px", color: soft, marginBottom: "2px" }}>CPA REF.</div>
              <div style={{ ...mono, fontSize: "13px", fontWeight: 700 }}>{ch.base_cpa > 0 ? formatMoney(ch.base_cpa) : "Orgánico"}</div>
            </div>
            <div>
              <div style={{ ...mono, fontSize: "9.5px", color: soft, marginBottom: "2px" }}>UTM SOURCE</div>
              <div style={{ ...mono, fontSize: "13px", color: ink }}>{ch.utm_source ?? "—"}</div>
            </div>
          </div>
          <div>
            <span style={{ ...mono, fontSize: "11px", color: soft, background: "#F4F0E8", border: `1px solid ${line}`, borderRadius: "8px", padding: "5px 10px" }}>
              Integración API — próximamente
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────────────── */

export function ChannelsView({ channels }: { channels: Channel[] }) {
  const [tab, setTab] = useState<"kpis" | "config">("kpis");

  return (
    <div>
      {/* Tab switcher */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "20px", background: "#ECEAE4", borderRadius: "12px", padding: "4px", width: "fit-content" }}>
        {[
          { id: "kpis", label: "KPIs de canales" },
          { id: "config", label: "Configuración" },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
            style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: "13px", padding: "8px 18px", borderRadius: "9px", border: "none", cursor: "pointer", background: tab === t.id ? surface : "transparent", color: tab === t.id ? ink : soft, boxShadow: tab === t.id ? "0 1px 3px rgba(0,0,0,.08)" : "none", transition: "all .15s" }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "kpis" && <KPIsTab />}
      {tab === "config" && <ConfigTab channels={channels} />}
    </div>
  );
}
