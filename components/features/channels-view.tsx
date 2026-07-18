"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import type { Channel } from "@/lib/types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { IconSparkle } from "@/components/ui/icons";
import { AgentActionButton } from "@/components/ui/agent-action-button";
import { EmptyState } from "@/components/empty-state";

/* ── Asistente global (Ola 2) — el vertical es un chip, no otro chat ──────────── */
function openAssistant() {
  window.dispatchEvent(new Event("assistant:toggle"));
}
function askAssistant(question: string) {
  // El host abre el drawer, precarga el chip "Canales" por pathname y siembra el turno.
  window.dispatchEvent(new CustomEvent("assistant:ask", { detail: { question } }));
}

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
  stale_campaigns?: number;
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

const STARTER_QUESTIONS = [
  "¿Qué canal trajo más candidaturas este mes?",
  "¿Cuál es el canal con menor CPA?",
  "¿Qué campañas llevan más de 5 días sin candidaturas?",
  "¿Qué canal funciona mejor por sector?",
];

/* ── Entrada al Asistente (sustituye al chat embebido, Ola 2) ────────────────── */

function ChipRow({ chips, onAsk }: { chips: string[]; onAsk: (q: string) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
      {chips.map((q) => (
        <button key={q} onClick={() => onAsk(q)}
          style={{ fontFamily: "inherit", fontSize: "12px", color: "#0E5C4A", background: "#EAF4EF", border: "1px solid #A8D9BC", borderRadius: "999px", padding: "5px 13px", cursor: "pointer", whiteSpace: "nowrap" }}>
          {q}
        </button>
      ))}
    </div>
  );
}

/** Lanzador compacto (superficie clara — es una acción): abre el drawer global con el
 *  contexto de Canales; los chips siembran directamente la primera pregunta. */
function AssistantEntry() {
  return (
    <div style={{ background: surface, border: `1px solid ${line}`, borderRadius: "16px", padding: "16px 18px", display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "11px" }}>
        <span style={{ width: "30px", height: "30px", borderRadius: "9px", background: "#DCEFE4", color: "#0E5C4A", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <IconSparkle className="size-4" />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "14px" }}>Asistente</span>
            <span style={{ ...mono, fontSize: "10px", color: soft, background: "#F4F0E8", border: `1px solid ${line}`, borderRadius: "999px", padding: "2px 8px" }}>Contexto: Canales</span>
          </div>
          <div style={{ fontSize: "12px", color: soft, lineHeight: 1.45, marginTop: "2px" }}>
            Pregunta por rendimiento de canales, CPA o campañas estancadas — responde con tus datos y enlaces.
          </div>
        </div>
        <AgentActionButton idleLabel="Preguntar al asistente" busyLabel="…" busy={false} onClick={openAssistant} />
      </div>
      <ChipRow chips={STARTER_QUESTIONS} onAsk={askAssistant} />
    </div>
  );
}

/* ── Tab: KPIs ──────────────────────────────────────────────────────────────── */

function KPIsTab() {
  const [data, setData] = useState<ReportData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setDataLoading(true);
    try {
      const r = await fetch(`/api/channels/report?period=30d`);
      if (r.ok) setData(await r.json());
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const visibleRows = data?.rows ?? [];
  const maxApps = visibleRows[0]?.applications ?? 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Entrada al Asistente global — reemplaza el chat embebido (Ola 2) */}
      <AssistantEntry />

      {/* Summary KPI strip */}
      {data && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: "10px" }}>
          {[
            { label: "Total candidaturas", value: data.meta.total_applications.toLocaleString("es-ES") },
            { label: "Canales activos", value: String(visibleRows.filter((r) => r.applications > 0).length) },
            { label: "Mejor canal", value: visibleRows[0]?.channel_name ?? "—" },
            { label: "CPA medio", value: visibleRows.filter((r) => r.cpa).length ? formatMoney(Math.round(visibleRows.filter((r) => r.cpa).reduce((s, r) => s + (r.cpa ?? 0), 0) / visibleRows.filter((r) => r.cpa).length)) : "—" },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: surface, border: `1px solid ${line}`, borderRadius: "13px", padding: "14px 16px" }}>
              <div style={{ ...mono, fontSize: "9.5px", color: soft, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: "6px" }}>{label}</div>
              <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "20px", letterSpacing: "-.4px" }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Initial load spinner — only when no data yet */}
      {dataLoading && !data && (
        <div style={{ display: "flex", justifyContent: "center", padding: "32px" }}>
          <Loader2 size={20} className="animate-spin" style={{ color: soft }} />
        </div>
      )}

      {/* Channel rows — always visible once data loaded; refresh happens in background */}
      {data && visibleRows.length === 0 && (
        <EmptyState
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 19V9M10 19V5M16 19v-7M20 19V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>}
          title="Sin datos de canales"
          description="No hay candidaturas para los filtros actuales. Publica ofertas en tus canales para empezar a ver rendimiento."
        />
      )}

      {visibleRows.map((row) => {
        const color = channelColor(row.source);
        const pct = maxApps > 0 ? (row.applications / maxApps) * 100 : 0;
        const isOpen = expanded === row.source;
        return (
          <div key={row.source} style={{ background: surface, border: `1px solid ${line}`, borderRadius: "14px", overflow: "hidden" }}>
            <button
              onClick={() => setExpanded(isOpen ? null : row.source)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: "14px", padding: "16px 20px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "9px", minWidth: "160px", flexShrink: 0 }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: color, flexShrink: 0 }} />
                <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: "14px" }}>{row.channel_name}</span>
                {row.active_campaigns > 0 && (
                  <span style={{ ...mono, fontSize: "10px", color: "#1B6B4F", background: "#DCEFE3", border: "1px solid #A8D9BC", borderRadius: "999px", padding: "2px 7px" }}>
                    {row.active_campaigns} activa{row.active_campaigns > 1 ? "s" : ""}
                  </span>
                )}
              </div>

              <div style={{ flex: 1, height: "6px", background: "#F4F0E8", borderRadius: "3px", overflow: "hidden", minWidth: "80px" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "3px" }} />
              </div>

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

            {isOpen && (
              <div style={{ borderTop: `1px solid ${line}`, padding: "16px 20px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "20px" }}>
                <div>
                  <div style={{ ...mono, fontSize: "10px", color: soft, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: "8px" }}>Por sector</div>
                  {row.top_sector ? (
                    <div style={{ fontSize: "13.5px", fontWeight: 700 }}>{row.top_sector} <span style={{ fontWeight: 400, color: soft }}>(más candidaturas)</span></div>
                  ) : <div style={{ fontSize: "13px", color: soft }}>Sin datos</div>}
                </div>

                <div>
                  <div style={{ ...mono, fontSize: "10px", color: soft, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: "8px" }}>Por ubicación</div>
                  {row.top_location ? (
                    <div style={{ fontSize: "13.5px", fontWeight: 700 }}>{row.top_location} <span style={{ fontWeight: 400, color: soft }}>(más candidaturas)</span></div>
                  ) : <div style={{ fontSize: "13px", color: soft }}>Sin datos</div>}
                </div>

                {row.budget > 0 && (
                  <div>
                    <div style={{ ...mono, fontSize: "10px", color: soft, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: "8px" }}>Presupuesto</div>
                    <div style={{ fontSize: "13.5px", fontWeight: 700 }}>{formatMoney(row.spend)} <span style={{ fontWeight: 400, color: soft }}>de {formatMoney(row.budget)}</span></div>
                    <div style={{ marginTop: "6px", height: "4px", background: "#F4F0E8", borderRadius: "2px", overflow: "hidden" }}>
                      <div style={{ width: `${Math.min(100, (row.spend / row.budget) * 100)}%`, height: "100%", background: color }} />
                    </div>
                  </div>
                )}

                {row.top_jobs.length > 0 && (
                  <div>
                    <div style={{ ...mono, fontSize: "10px", color: soft, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: "8px" }}>Ofertas con más candidaturas</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {row.top_jobs.map((j) => (
                        <div key={j.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                          <Link href={`/app/jobs/${j.id}`} style={{ fontSize: "13px", color: ink, textDecoration: "none", fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
  return (
    <Tabs defaultValue="kpis">
      <TabsList className="mb-5">
        <TabsTrigger value="kpis">KPIs de canales</TabsTrigger>
        <TabsTrigger value="config">Configuración</TabsTrigger>
      </TabsList>
      <TabsContent value="kpis"><KPIsTab /></TabsContent>
      <TabsContent value="config"><ConfigTab channels={channels} /></TabsContent>
    </Tabs>
  );
}
