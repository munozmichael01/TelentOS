"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiFetch, notifyError } from "@/lib/api-client";
import { StatCard } from "@/components/stat-card";
import { AgentPanel } from "@/components/agent-hint";
import { IconSparkle } from "@/components/ui/icons";
import { InboxItem } from "@/components/features/inbox-item";
import type { DashboardData, InboxItem as InboxItemType, InboxType, InboxAction, AgentInsight, PulseMetric } from "@/lib/dashboard";

// ─── Tokens ───────────────────────────────────────────────────────────────────

const T = {
  ink: "#1A1A17", soft: "#79746B", line: "#E7E1D4",
  surface: "#FCFAF6", bg: "#F4F0E8",
  brand: "#0E5C4A", brandSoft: "#DCEFE4",
  accent: "#F1543F", accentSoft: "#FAE3DE",
};

// ─── Personalisation defaults ─────────────────────────────────────────────────

const ALL_METRIC_KEYS = ["pipeline", "ofertas", "empleados", "ausentes", "pendientes", "compliance"] as const;
const ALL_INBOX_TYPES: InboxType[] = ["compliance", "ausencia", "candidato", "onboarding", "ausente"];

const TYPE_LABEL: Record<InboxType, string> = {
  compliance: "Compliance", ausencia: "Ausencias", candidato: "Candidatos",
  onboarding: "Onboarding", ausente: "Ausentes hoy",
};

type Prefs = {
  metrics: string[];
  follows: InboxType[];
};

const DEFAULT_PREFS: Prefs = {
  metrics: ["pipeline", "ofertas", "empleados", "ausentes", "pendientes"],
  follows: ["compliance", "ausencia", "candidato", "onboarding"],
};

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem("dashboard-prefs");
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_PREFS;
}

function savePrefs(prefs: Prefs) {
  try { localStorage.setItem("dashboard-prefs", JSON.stringify(prefs)); } catch { /* ignore */ }
}

// ─── Greeting ─────────────────────────────────────────────────────────────────

function greeting(email: string) {
  const h = new Date().getHours();
  const saludo = h < 12 ? "Buenos días" : h < 20 ? "Buenas tardes" : "Buenas noches";
  const firstName = email.split("@")[0].split(/[._-]/)[0];
  const name = firstName.charAt(0).toUpperCase() + firstName.slice(1);
  return `${saludo}, ${name}`;
}

function todayLabel() {
  return new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

// ─── Relative time ────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 2) return "hace un momento";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${Math.floor(hours / 24)}d`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardClient({
  data,
  userEmail,
}: {
  data: DashboardData;
  userEmail: string;
}) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [persOpen, setPersOpen] = useState(false);
  const [filter, setFilter] = useState<InboxType | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [insights, setInsights] = useState<AgentInsight[]>(data.agentInsights);
  const [loadingInsight, setLoadingInsight] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string | null>(data.lastInsightAt);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [showUpdateTip, setShowUpdateTip] = useState(false);

  useEffect(() => { setPrefs(loadPrefs()); }, []);

  function updatePrefs(next: Prefs) { setPrefs(next); savePrefs(next); }

  // ── Personalization toggles ────────────────────────────────────────────
  function toggleMetric(key: string) {
    const next = prefs.metrics.includes(key)
      ? prefs.metrics.filter((k) => k !== key)
      : [...prefs.metrics, key];
    updatePrefs({ ...prefs, metrics: next });
  }

  function toggleFollow(type: InboxType) {
    const next = prefs.follows.includes(type)
      ? prefs.follows.filter((t) => t !== type)
      : [...prefs.follows, type];
    updatePrefs({ ...prefs, follows: next });
  }

  // ── InboxItem action handler ───────────────────────────────────────────
  async function handleAction(item: InboxItemType, action: InboxAction) {
    if (!action.apiPath) return;
    const actionKey = `${item.id}-${action.label}`;
    setLoadingAction(actionKey);
    try {
      await apiFetch(action.apiPath, { method: action.method ?? "POST" });
      // Optimistically remove from inbox after approval/rejection
      // The page will refresh on next navigation; for now remove from view
    } catch (e) {
      notifyError("No se pudo completar la acción", e);
    } finally {
      setLoadingAction(null);
    }
  }

  // ── Agent insight triage ───────────────────────────────────────────────
  async function triageInsight(id: string, status: "done" | "ignored") {
    setLoadingInsight(id);
    try {
      await fetch(`/api/agents/dashboard-insights/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setInsights((prev) => prev.map((i) => i.id === id ? { ...i, status } : i));
    } finally {
      setLoadingInsight(null);
    }
  }

  // ── Refresh agent insights ─────────────────────────────────────────────
  const openInsights = insights.filter((i) => i.status === "open");
  const canRefresh = openInsights.length === 0;

  async function refreshInsights() {
    if (!canRefresh) return;
    setRefreshing(true);
    try {
      await fetch("/api/agents/dashboard-insights/refresh", { method: "POST" });
      // Reload insights from server
      const res = await fetch("/api/agents/dashboard-insights");
      if (res.ok) {
        const json = await res.json();
        setInsights(json.insights ?? []);
        setLastRefresh(new Date().toISOString());
      }
    } finally {
      setRefreshing(false);
    }
  }

  // ── Derived lists ──────────────────────────────────────────────────────
  const visibleInbox = data.inbox.filter((item) =>
    prefs.follows.includes(item.type) && (filter === null || item.type === filter)
  );
  const visibleMetrics: PulseMetric[] = data.pulse.filter((m) => prefs.metrics.includes(m.key));
  const PAGE = 4;
  const displayedInbox = expanded ? visibleInbox : visibleInbox.slice(0, PAGE);

  // Count per type for filter chips
  const countByType: Partial<Record<InboxType, number>> = {};
  for (const item of data.inbox.filter((i) => prefs.follows.includes(i.type))) {
    countByType[item.type] = (countByType[item.type] ?? 0) + 1;
  }

  const shownInsights = insights.filter((i) => i.status !== "ignored").slice(0, 5);

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "18px", flexWrap: "wrap", marginBottom: "22px" }}>
        <div>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase", color: T.soft, marginBottom: "6px" }}>
            {todayLabel()}
          </div>
          <h1 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "30px", letterSpacing: "-1px", margin: 0, color: T.ink }}>
            {greeting(userEmail)}
          </h1>
        </div>
        <button
          onClick={() => setPersOpen((o) => !o)}
          style={{
            display: "flex", alignItems: "center", gap: "7px",
            fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: "12.5px",
            color: persOpen ? T.surface : T.ink,
            background: persOpen ? T.ink : T.surface,
            border: `2px solid ${T.ink}`, borderRadius: "10px",
            padding: "9px 14px", boxShadow: "2px 2px 0 #1A1A17",
            cursor: "pointer", transition: "background .12s, color .12s",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Personalizar
        </button>
      </div>

      {/* ── Personalización panel ──────────────────────────────────────── */}
      {persOpen && (
        <div style={{ background: T.surface, border: `1.5px solid ${T.ink}`, borderRadius: "16px", boxShadow: `4px 4px 0 ${T.ink}`, padding: "18px 20px", marginBottom: "22px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "16px" }}>Personaliza tu panel</div>
            <button onClick={() => setPersOpen(false)} style={{ fontFamily: "'Space Mono',monospace", fontSize: "11px", color: T.soft, background: "none", border: "none", cursor: "pointer" }}>Cerrar</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            {/* Métricas */}
            <div>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: T.soft, marginBottom: "10px" }}>Métricas del pulso</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
                {data.pulse.map((m) => {
                  const on = prefs.metrics.includes(m.key);
                  return (
                    <button
                      key={m.key}
                      onClick={() => toggleMetric(m.key)}
                      style={{ fontFamily: "'Space Mono',monospace", fontSize: "11px", padding: "5px 10px", borderRadius: "999px", border: `1.5px solid ${on ? T.brand : T.line}`, background: on ? T.brandSoft : "transparent", color: on ? T.brand : T.soft, cursor: "pointer", fontWeight: on ? 700 : 400 }}
                    >
                      {on ? "✓ " : ""}{m.label}
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Tipos de bandeja */}
            <div>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: T.soft, marginBottom: "10px" }}>Seguir en tu bandeja</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
                {ALL_INBOX_TYPES.map((type) => {
                  const on = prefs.follows.includes(type);
                  return (
                    <button
                      key={type}
                      onClick={() => toggleFollow(type)}
                      style={{ fontFamily: "'Space Mono',monospace", fontSize: "11px", padding: "5px 10px", borderRadius: "999px", border: `1.5px solid ${on ? T.brand : T.line}`, background: on ? T.brandSoft : "transparent", color: on ? T.brand : T.soft, cursor: "pointer", fontWeight: on ? 700 : 400 }}
                    >
                      {on ? "✓ " : ""}{TYPE_LABEL[type]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "9.5px", color: T.soft, marginTop: "14px", borderTop: `1px solid ${T.line}`, paddingTop: "11px" }}>
            Una sola vista para todos. Lo que ves ya está acotado a lo tuyo por permisos — aquí solo eliges qué priorizar.
          </div>
        </div>
      )}

      {/* ── Pulse metrics ──────────────────────────────────────────────── */}
      {visibleMetrics.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "11px", marginBottom: "24px" }}>
          {visibleMetrics.map((m) => (
            <StatCard key={m.key} label={m.label} value={m.value} hint={m.delta} />
          ))}
        </div>
      )}

      {/* ── 2-col grid ─────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.62fr 1fr", gap: "16px", alignItems: "start" }}>

        {/* ── Left: Bandeja ─────────────────────────────────────────── */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
            <h2 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "19px", letterSpacing: "-.5px", margin: 0, color: T.ink }}>
              Requiere tu atención
            </h2>
            {visibleInbox.length > 0 && (
              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "11px", fontWeight: 700, color: T.accent, background: T.accentSoft, border: `1px solid #F2C4B9`, borderRadius: "999px", padding: "2px 9px" }}>
                {visibleInbox.length}
              </span>
            )}
          </div>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: T.soft, marginBottom: "13px" }}>
            Acciones asignadas a ti · señales precisas, no estimaciones
          </div>

          {/* Filter chips */}
          {ALL_INBOX_TYPES.filter((t) => prefs.follows.includes(t) && (countByType[t] ?? 0) > 0).length > 1 && (
            <div style={{ display: "flex", gap: "7px", flexWrap: "wrap", marginBottom: "14px" }}>
              <FilterChip
                label="Todo"
                count={data.inbox.filter((i) => prefs.follows.includes(i.type)).length}
                active={filter === null}
                onClick={() => setFilter(null)}
              />
              {ALL_INBOX_TYPES
                .filter((t) => prefs.follows.includes(t) && (countByType[t] ?? 0) > 0)
                .map((type) => (
                  <FilterChip
                    key={type}
                    label={TYPE_LABEL[type]}
                    count={countByType[type] ?? 0}
                    active={filter === type}
                    onClick={() => setFilter(filter === type ? null : type)}
                  />
                ))}
            </div>
          )}

          {/* Inbox items */}
          <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
            {displayedInbox.map((item) => (
              <InboxItem
                key={item.id}
                item={item}
                onAction={handleAction}
                loadingActionId={loadingAction}
              />
            ))}
            {visibleInbox.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 0", color: T.soft, fontFamily: "'Space Mono',monospace", fontSize: "12px" }}>
                Todo al día ✓
              </div>
            )}
          </div>

          {/* Expand / collapse */}
          {visibleInbox.length > PAGE && (
            <button
              onClick={() => setExpanded((e) => !e)}
              style={{ marginTop: "11px", width: "100%", padding: "11px", fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: "12.5px", color: T.soft, background: "transparent", border: `1.5px dashed ${T.line}`, borderRadius: "11px", cursor: "pointer" }}
            >
              {expanded ? "Ver menos ↑" : `Ver toda la bandeja (${visibleInbox.length}) →`}
            </button>
          )}
        </div>

        {/* ── Right: Rail ───────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Agent insights panel */}
          <AgentPanel>
            {/* Header row 1: icon + title + count */}
            <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "5px" }}>
              <span style={{ width: "24px", height: "24px", borderRadius: "7px", background: "rgba(198,242,78,.16)", color: "#C6F24E", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <IconSparkle className="size-3.5" />
              </span>
              <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13.5px", color: "#F4F0E8" }}>
                Sugerencias del agente
              </span>
              <span style={{ marginLeft: "auto", fontFamily: "'Space Mono',monospace", fontSize: "9px", color: "#C6F24E", background: "rgba(198,242,78,.12)", border: "1px solid rgba(198,242,78,.3)", borderRadius: "999px", padding: "2px 8px", flexShrink: 0 }}>
                {openInsights.length}
              </span>
            </div>
            {/* Header row 2: timestamp + update button */}
            <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "8px" }}>
              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "9px", color: "#8C877E" }}>
                {lastRefresh ? `Actualizado ${relativeTime(lastRefresh)}` : "Sin analizar aún"}
              </span>
              <span
                style={{ position: "relative", display: "inline-flex" }}
                onMouseEnter={() => !canRefresh && setShowUpdateTip(true)}
                onMouseLeave={() => setShowUpdateTip(false)}
              >
                <button
                  onClick={refreshInsights}
                  disabled={!canRefresh || refreshing}
                  style={{
                    fontFamily: "'Space Mono',monospace", fontSize: "9px",
                    color: canRefresh ? "#C6F24E" : "#5A574F",
                    background: "none", border: "none",
                    display: "flex", alignItems: "center", gap: "4px",
                    padding: 0, cursor: canRefresh ? "pointer" : "not-allowed",
                    opacity: refreshing ? 0.6 : 1,
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M4 12a8 8 0 018-8 8 8 0 016.9 4M20 12a8 8 0 01-8 8 8 8 0 01-6.9-4M18 3v4h-4M6 21v-4h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {refreshing ? "…" : "Actualizar"}
                </button>
                {showUpdateTip && (
                  <span style={{ position: "absolute", top: "calc(100% + 7px)", left: 0, zIndex: 30, width: "214px", background: "#FCFAF6", color: "#1A1A17", border: "1px solid #E7E1D4", borderRadius: "9px", boxShadow: "0 12px 26px -12px rgba(0,0,0,.55)", padding: "9px 11px", fontFamily: "'Hanken Grotesk',sans-serif", fontSize: "10.5px", lineHeight: 1.5, fontWeight: 500, pointerEvents: "none" }}>
                    Marca <strong>Hecho</strong> o <strong>Ignorar</strong> en las {openInsights.length} sugerencias actuales antes de pedir un análisis nuevo.
                  </span>
                )}
              </span>
            </div>

            {/* Feed */}
            {shownInsights.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px 10px" }}>
                <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13px", color: "#F4F0E8" }}>Todo revisado ✓</div>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", color: "#8C877E", marginTop: "5px" }}>Pulsa Actualizar para un nuevo análisis</div>
              </div>
            ) : (
              shownInsights.map((insight) => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  onTriage={triageInsight}
                  loading={loadingInsight === insight.id}
                />
              ))
            )}

            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "9px", color: "#8C877E", marginTop: "11px" }}>
              El agente propone · tú decides
            </div>
          </AgentPanel>

          {/* Actividad reciente */}
          <div>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "1px", color: T.soft, marginBottom: "10px" }}>
              Actividad reciente
            </div>
            <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: "14px", overflow: "hidden" }}>
              {data.activity.length === 0 ? (
                <div style={{ padding: "20px", textAlign: "center", fontFamily: "'Space Mono',monospace", fontSize: "11px", color: T.soft }}>
                  Sin actividad reciente
                </div>
              ) : (
                data.activity.map((item, i) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    style={{ display: "flex", alignItems: "center", gap: "10px", padding: "11px 14px", borderBottom: i < data.activity.length - 1 ? `1px solid ${T.line}` : "none", textDecoration: "none" }}
                  >
                    <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: item.dot, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "12.5px", fontWeight: 600, color: T.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</div>
                    </div>
                    <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", color: T.soft, flexShrink: 0 }}>{relativeTime(item.time)}</span>
                  </Link>
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Footer note */}
      <p style={{ marginTop: "28px", fontFamily: "'Space Mono',monospace", fontSize: "10px", color: T.soft, textAlign: "center" }}>
        Las señales de la bandeja son deterministas · sin estimaciones
      </p>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterChip({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: "'Archivo',sans-serif",
        fontWeight: active ? 800 : 600,
        fontSize: "12px",
        padding: "6px 13px",
        borderRadius: "999px",
        border: `1.5px solid ${active ? "#1A1A17" : "#E7E1D4"}`,
        background: active ? "#1A1A17" : "#FCFAF6",
        color: active ? "#fff" : "#79746B",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "5px",
      }}
    >
      {label}
      <span style={{ opacity: 0.6 }}>{count}</span>
    </button>
  );
}

function InsightCard({ insight, onTriage, loading }: { insight: AgentInsight; onTriage: (id: string, status: "done" | "ignored") => void; loading: boolean }) {
  return (
    <div style={{ padding: "12px 0", borderTop: "1px solid rgba(255,255,255,.09)" }}>
      <p style={{ fontSize: "12.5px", lineHeight: 1.5, color: insight.status === "done" ? "#4A4840" : "#E4E0D8", margin: "0 0 10px" }}>
        {insight.text}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: "7px", flexWrap: "wrap" }}>
        {insight.action?.href && (
          <Link
            href={insight.action.href}
            style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "11px", color: "#1A1A17", background: "#C6F24E", border: "none", borderRadius: "8px", padding: "6px 11px", textDecoration: "none", display: "inline-block" }}
          >
            {insight.action.label}
          </Link>
        )}
        {insight.status === "open" && (
          <>
            <button
              onClick={() => onTriage(insight.id, "done")}
              disabled={loading}
              style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 600, fontSize: "11px", color: "#CFCAC0", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.14)", borderRadius: "8px", padding: "6px 10px", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.5 : 1 }}
            >
              Hecho
            </button>
            <button
              onClick={() => onTriage(insight.id, "ignored")}
              disabled={loading}
              style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 600, fontSize: "11px", color: "#8C877E", background: "none", border: "none", padding: "6px 6px", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.5 : 1 }}
            >
              Ignorar
            </button>
          </>
        )}
        {insight.status === "done" && (
          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", color: "#4A4840" }}>✓ Hecho</span>
        )}
      </div>
    </div>
  );
}
