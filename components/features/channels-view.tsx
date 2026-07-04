"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import type { Channel } from "@/lib/types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

/** Convierte **negrita** en <strong> sin dangerouslySetInnerHTML. */
function renderBold(text: string) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part));
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

type AnalystResponse = {
  answer: string;
  suggested_questions: string[];
  redirect: { url: string; label: string } | null;
  filters_applied: { period?: string; sector?: string; location?: string; source?: string };
};

type HistoryEntry = { role: "user" | "assistant"; content: string };

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

type ThreadTurn = { query: string; response: AnalystResponse };

/* ── Chat sub-components ────────────────────────────────────────────────────── */

function AgentAvatar({ loading = false }: { loading?: boolean }) {
  return (
    <div style={{ width: "26px", height: "26px", borderRadius: "8px", background: "#DCEFE4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px" }}>
      {loading
        ? <Loader2 size={12} className="animate-spin" style={{ color: "#0E5C4A" }} />
        : <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M4 19V9M10 19V5M16 19v-7M20 19V11" stroke="#0E5C4A" strokeWidth="2.2" strokeLinecap="round"/></svg>
      }
    </div>
  );
}

function ChipRow({ chips, onAsk, disabled }: { chips: string[]; onAsk: (q: string) => void; disabled: boolean }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
      {chips.map((q) => (
        <button key={q} onClick={() => onAsk(q)} disabled={disabled}
          style={{ fontFamily: "inherit", fontSize: "12px", color: "#0E5C4A", background: "#EAF4EF", border: "1px solid #A8D9BC", borderRadius: "999px", padding: "5px 13px", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1, whiteSpace: "nowrap" }}>
          {q}
        </button>
      ))}
    </div>
  );
}

function InputRow({ query, setQuery, onAsk, onKeyDown, loading, inputRef }: {
  query: string;
  setQuery: (v: string) => void;
  onAsk: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  loading: boolean;
  inputRef: React.Ref<HTMLInputElement>;
}) {
  return (
    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
      <div style={{ position: "relative", flex: 1 }}>
        <svg style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="15" height="15" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="7" stroke={soft} strokeWidth="1.8"/>
          <path d="M16.5 16.5L21 21" stroke={soft} strokeWidth="1.8" strokeLinecap="round"/>
          <path d="M8 11.5c.5-1.5 2-2.5 3.5-2.5" stroke="#0E5C4A" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Pregunta sobre canales y campañas…"
          style={{ width: "100%", paddingLeft: "40px", paddingRight: "12px", paddingTop: "10px", paddingBottom: "10px", fontFamily: "inherit", fontSize: "14px", color: ink, background: "#F4F0E8", border: `1.5px solid ${line}`, borderRadius: "11px", outline: "none", boxSizing: "border-box" }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "#0E5C4A"; e.currentTarget.style.boxShadow = "0 0 0 3px #DCEFE4"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = line; e.currentTarget.style.boxShadow = "none"; }}
        />
      </div>
      <button onClick={onAsk} disabled={!query.trim() || loading}
        style={{ flexShrink: 0, background: "#0E5C4A", color: "#fff", border: "none", borderRadius: "11px", padding: "10px 18px", fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: "13px", cursor: query.trim() && !loading ? "pointer" : "not-allowed", opacity: query.trim() && !loading ? 1 : 0.5, display: "flex", alignItems: "center", gap: "7px" }}>
        {loading ? <Loader2 size={14} className="animate-spin" /> : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M12 5l7 7-7 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        )}
        Preguntar
      </button>
    </div>
  );
}

/* ── Tab: KPIs ──────────────────────────────────────────────────────────────── */

function KPIsTab() {
  const [data, setData] = useState<ReportData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  // AI conversation state
  const [query, setQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [thread, setThread] = useState<ThreadTurn[]>([]);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const lastResponse = thread[thread.length - 1]?.response ?? null;
  const chips = lastResponse?.suggested_questions ?? STARTER_QUESTIONS;

  const loadData = useCallback(async (filters: Record<string, string>) => {
    setDataLoading(true);
    try {
      const params = new URLSearchParams({ period: filters.period ?? "30d" });
      if (filters.sector) params.set("sector", filters.sector);
      if (filters.location) params.set("location", filters.location);
      if (filters.source) params.set("source", filters.source);
      const r = await fetch(`/api/channels/report?${params}`);
      if (r.ok) setData(await r.json());
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => { loadData({}); }, [loadData]);

  // Scroll to latest response
  useEffect(() => {
    if (thread.length > 0) threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [thread.length]);

  const ask = useCallback(async (q: string) => {
    if (!q.trim() || aiLoading) return;
    setAiLoading(true);
    setQuery("");
    try {
      // Build history from thread for proper OpenAI context
      const history: HistoryEntry[] = thread.flatMap((t) => [
        { role: "user" as const, content: t.query },
        { role: "assistant" as const, content: t.response.answer },
      ]);
      const r = await fetch("/api/agents/channel-analyst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, history }),
      });
      if (!r.ok) return;
      const result: AnalystResponse = await r.json();
      setThread((prev) => [...prev, { query: q, response: result }]);
      loadData(result.filters_applied ?? {});
    } finally {
      setAiLoading(false);
    }
  }, [aiLoading, thread, loadData]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") ask(query);
  };

  const clearThread = () => { setThread([]); loadData({}); };

  const visibleRows = data?.rows ?? [];
  const maxApps = visibleRows[0]?.applications ?? 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* AI panel — two modes: idle (input top) / chat (input bottom) */}
      <div style={{ background: surface, border: `1px solid ${line}`, borderRadius: "16px", overflow: "hidden", display: "flex", flexDirection: "column" }}>

        {thread.length === 0 ? (
          /* ── Idle mode: input + chips at top ── */
          <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <InputRow query={query} setQuery={setQuery} onAsk={() => ask(query)} onKeyDown={handleKeyDown} loading={aiLoading} inputRef={inputRef} />
            <ChipRow chips={chips} onAsk={ask} disabled={aiLoading} />
            {aiLoading && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Loader2 size={13} className="animate-spin" style={{ color: soft }} />
                <span style={{ ...mono, fontSize: "11px", color: soft }}>Analizando datos…</span>
              </div>
            )}
          </div>
        ) : (
          /* ── Chat mode: thread + chips + input at bottom ── */
          <>
            {/* Header with "Nueva conversación" button */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: `1px solid ${line}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "20px", height: "20px", borderRadius: "6px", background: "#DCEFE4", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M4 19V9M10 19V5M16 19v-7M20 19V11" stroke="#0E5C4A" strokeWidth="2.2" strokeLinecap="round"/></svg>
                </span>
                <span style={{ ...mono, fontSize: "10px", color: soft, textTransform: "uppercase", letterSpacing: ".5px" }}>Análisis de canales</span>
              </div>
              <button onClick={clearThread}
                style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "11px", color: ink, background: surface, border: `2px solid ${ink}`, borderRadius: "8px", padding: "5px 11px", boxShadow: `2px 2px 0 ${ink}`, cursor: "pointer" }}>
                + Nueva conversación
              </button>
            </div>

            {/* Thread */}
            <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: "20px", maxHeight: "420px", overflowY: "auto" }}>
              {thread.map((turn, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <div style={{ background: "#F4F0E8", border: `1px solid ${line}`, borderRadius: "12px 12px 4px 12px", padding: "8px 14px", maxWidth: "75%", fontSize: "13.5px", color: ink, lineHeight: "1.5" }}>
                      {turn.query}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                    <AgentAvatar />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "13.5px", lineHeight: "1.6", color: ink }}>
                        {renderBold(turn.response.answer)}
                      </div>
                      {turn.response.redirect && (
                        <a href={turn.response.redirect.url}
                          style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "8px", fontSize: "13px", fontWeight: 700, color: "#0E5C4A", textDecoration: "none", background: "#EAF4EF", border: "1px solid #A8D9BC", borderRadius: "9px", padding: "6px 12px" }}>
                          {turn.response.redirect.label}
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M12 5l7 7-7 7" stroke="#0E5C4A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </a>
                      )}
                      {i === thread.length - 1 && Object.entries(turn.response.filters_applied ?? {}).some(([, v]) => Boolean(v)) && (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginTop: "8px" }}>
                          <span style={{ ...mono, fontSize: "10px", color: soft }}>Datos filtrados:</span>
                          {Object.entries(turn.response.filters_applied).map(([k, v]) => v && (
                            <span key={k} style={{ ...mono, fontSize: "10px", color: "#0E5C4A", background: "#EAF4EF", border: "1px solid #A8D9BC", borderRadius: "999px", padding: "2px 8px" }}>
                              {k === "period" || k === "days_ago" ? String(v) : `${k}: ${v}`}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <AgentAvatar loading />
                  <span style={{ ...mono, fontSize: "11px", color: soft }}>Analizando datos…</span>
                </div>
              )}
              <div ref={threadEndRef} />
            </div>

            {/* Chips + input pinned at bottom */}
            <div style={{ borderTop: `1px solid ${line}`, padding: "12px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <ChipRow chips={chips} onAsk={ask} disabled={aiLoading} />
              <InputRow query={query} setQuery={setQuery} onAsk={() => ask(query)} onKeyDown={handleKeyDown} loading={aiLoading} inputRef={inputRef} />
            </div>
          </>
        )}
      </div>

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
        <div style={{ background: surface, border: `1px solid ${line}`, borderRadius: "14px", padding: "40px", textAlign: "center", color: soft, fontSize: "14px" }}>
          Sin datos para los filtros actuales.
        </div>
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
