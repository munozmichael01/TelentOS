"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

// ── Design tokens ────────────────────────────────────────────────────────────
const T = {
  surface: "#FCFAF6", bg: "#F4F0E8", surface2: "#F8F4EB",
  ink: "#1A1A17", soft: "#79746B", line: "#E7E1D4",
  brand: "#0E5C4A", brandSoft: "#DCEFE4",
  accent: "#F1543F", accentSoft: "#FAE3DE",
  amber: "#946312", amberSoft: "#F8E7C4",
  lime: "#C6F24E",
};

// ── Status badge helpers ─────────────────────────────────────────────────────
const STATUS: Record<string, { label: string; bg: string; color: string }> = {
  draft:     { label: "Borrador",    bg: "#EEE9DD",   color: "#79746B" },
  in_review: { label: "En revisión", bg: T.amberSoft, color: T.amber },
  approved:  { label: "Aprobado",    bg: T.brandSoft, color: T.brand },
  exported:  { label: "Exportado",   bg: "#E4E1DA",   color: "#54504A" },
  paid:      { label: "Pagado",      bg: T.brand,     color: "#fff" },
};

function fmtUSD(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ── SVG chart ────────────────────────────────────────────────────────────────
function chartPaths(vals: number[]): { line: string; area: string } {
  if (vals.length < 2) return { line: "", area: "" };
  const max = Math.max(...vals) * 1.08;
  const min = Math.min(...vals) * 0.9;
  const W = 560, H = 150, pad = 6;
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * (W - pad * 2) + pad;
    const y = H - ((v - min) / (max - min || 1)) * (H - 20) - 10;
    return [x, y] as [number, number];
  });
  const line = pts.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = line
    + " L" + pts[pts.length - 1][0].toFixed(1) + " " + H
    + " L" + pts[0][0].toFixed(1) + " " + H + " Z";
  return { line, area };
}

// ── Types ────────────────────────────────────────────────────────────────────
type DashData = {
  currentPeriod: string | null;
  currentRunId: string | null;
  currentRunEntity: string | null;
  currentRunType: string;
  kpis: { grossPayroll: number; netPayroll: number; employerCost: number; employeeCount: number; incidencias: number };
  chart: { months: string[]; values: number[] };
  alerts: { title: string; meta: string; dot: string }[];
  runs: { id: string; periodLabel: string; entity: string; employeeCount: number; gross: number; status: string; currency: string }[];
  isEmpty: boolean;
};

// ── Component ────────────────────────────────────────────────────────────────
export function PayrollDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/payroll/dashboard", { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ height: "80px", borderRadius: "14px", background: T.surface, border: `1px solid ${T.line}`, opacity: 0.6 }} />
        ))}
      </div>
    );
  }

  if (!data || data.isEmpty) {
    return (
      <EmptyState
        title="Sin corridas de nómina"
        description="Configura los perfiles salariales de tus empleados y procesa tu primera corrida."
      />
    );
  }

  const { currentPeriod, currentRunId, currentRunEntity, currentRunType, kpis, chart, alerts, runs } = data;
  const cp = chartPaths(chart.values);

  const kpiCards = [
    { label: "Gross payroll",  value: fmtUSD(kpis.grossPayroll),  hint: "", hintColor: T.soft, valueColor: T.ink },
    { label: "Net payroll",    value: fmtUSD(kpis.netPayroll),     hint: "estimado", hintColor: T.soft, valueColor: T.ink },
    { label: "Coste empresa",  value: fmtUSD(kpis.employerCost),   hint: "incl. cargas", hintColor: T.soft, valueColor: T.ink },
    { label: "Empleados",      value: String(kpis.employeeCount),  hint: "en la corrida", hintColor: T.soft, valueColor: T.ink },
    { label: "Incidencias",    value: String(kpis.incidencias),    hint: "por resolver", hintColor: T.accent, valueColor: kpis.incidencias > 0 ? T.accent : T.ink },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Payroll"
        title={`Periodo activo · ${currentPeriod ?? "—"}`}
        description={`${currentRunType === "monthly" ? "Corrida mensual" : currentRunType} · ${currentRunEntity} · montos en USD`}
      >
        {currentRunId && (
          <button
            onClick={() => router.push(`/payroll/runs/${currentRunId}`)}
            style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 700, fontSize: "13px", color: T.ink, background: T.surface, border: `1.5px solid ${T.line}`, borderRadius: "11px", padding: "10px 15px", cursor: "pointer" }}
          >
            Revisar incidencias
          </button>
        )}
        {currentRunId && (
          <button
            onClick={() => router.push(`/payroll/runs/${currentRunId}`)}
            style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13px", color: "#fff", background: T.brand, border: `2px solid ${T.ink}`, borderRadius: "11px", padding: "10px 18px", boxShadow: `3px 3px 0 ${T.ink}`, cursor: "pointer", transition: "transform .1s,box-shadow .1s" }}
            onMouseOver={(e) => { e.currentTarget.style.transform = "translate(-1px,-1px)"; e.currentTarget.style.boxShadow = `4px 4px 0 ${T.ink}`; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `3px 3px 0 ${T.ink}`; }}
            onMouseDown={(e) => { e.currentTarget.style.transform = "translate(1px,1px)"; e.currentTarget.style.boxShadow = `1px 1px 0 ${T.ink}`; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = "translate(-1px,-1px)"; e.currentTarget.style.boxShadow = `4px 4px 0 ${T.ink}`; }}
          >
            Procesar nómina
          </button>
        )}
      </PageHeader>

      {/* ── KPI row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "12px", marginBottom: "16px" }}>
        {kpiCards.map((k) => (
          <div key={k.label} style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: "15px", padding: "16px 17px", transition: "transform .14s,border-color .14s" }}
            onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = "#C9BFA8"; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.borderColor = T.line; }}
          >
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: T.soft, lineHeight: 1.4, minHeight: "26px" }}>
              {k.label}
            </div>
            <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "25px", letterSpacing: "-.8px", lineHeight: 1, marginTop: "10px", color: k.valueColor, fontVariantNumeric: "tabular-nums" }}>
              {k.value}
            </div>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", marginTop: "8px", color: k.hintColor }}>
              {k.hint}
            </div>
          </div>
        ))}
      </div>

      {/* ── Chart + Alerts ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: "16px", alignItems: "start", marginBottom: "16px" }}>
        {/* Chart */}
        <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: "16px", padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "16px" }}>
            <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "15px" }}>Gross payroll · últimos {chart.values.length} periodos</span>
            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "12px", color: T.soft }}>USD</span>
          </div>
          {chart.values.length >= 2 ? (
            <>
              <svg viewBox="0 0 560 150" style={{ width: "100%", height: "auto", display: "block" }} preserveAspectRatio="none">
                <line x1="0" y1="20" x2="560" y2="20" stroke="#EFEADD" strokeWidth="1"/>
                <line x1="0" y1="70" x2="560" y2="70" stroke="#EFEADD" strokeWidth="1"/>
                <line x1="0" y1="120" x2="560" y2="120" stroke="#EFEADD" strokeWidth="1"/>
                <defs>
                  <linearGradient id="pgradDash" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={T.brand}/>
                    <stop offset="1" stopColor={T.brand} stopOpacity="0"/>
                  </linearGradient>
                </defs>
                {cp.area && <path d={cp.area} fill="url(#pgradDash)" opacity="0.14"/>}
                {cp.line && <path d={cp.line} fill="none" stroke={T.brand} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>}
              </svg>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px" }}>
                {chart.months.map((m, i) => (
                  <div key={i} style={{ textAlign: "center", flex: 1 }}>
                    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "11px", fontWeight: 700, color: i === chart.months.length - 1 ? T.brand : T.soft }}>
                      {chart.values[i] ? "$" + chart.values[i].toFixed(1) + "k" : ""}
                    </div>
                    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", color: T.soft, marginTop: "2px" }}>{m}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ height: "120px", display: "flex", alignItems: "center", justifyContent: "center", color: T.soft, fontSize: "13px" }}>
              Procesá más corridas para ver la evolución
            </div>
          )}
        </div>

        {/* Alerts */}
        <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: "16px", padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <span style={{ width: "26px", height: "26px", borderRadius: "8px", background: T.accentSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 3l9 16H3l9-16Z" stroke={T.accent} strokeWidth="2" strokeLinejoin="round"/>
                <path d="M12 10v4M12 17h.01" stroke={T.accent} strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </span>
            <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "15px" }}>Incidencias activas</span>
            {alerts.length > 0 && (
              <span style={{ marginLeft: "auto", fontFamily: "'Space Mono',monospace", fontSize: "11px", fontWeight: 700, color: T.accent, background: T.accentSoft, borderRadius: "999px", padding: "3px 10px" }}>
                {alerts.length}
              </span>
            )}
          </div>
          {alerts.length === 0 ? (
            <div style={{ fontSize: "13px", color: T.soft, padding: "8px 0" }}>Sin incidencias activas</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {alerts.map((a, i) => (
                <div
                  key={i}
                  onClick={() => currentRunId && router.push(`/payroll/runs/${currentRunId}`)}
                  style={{ display: "flex", alignItems: "flex-start", gap: "11px", padding: "11px 10px", margin: "0 -10px", borderRadius: "10px", cursor: "pointer", transition: "background .1s" }}
                  onMouseOver={(e) => { e.currentTarget.style.background = "#F8F4EB"; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = ""; }}
                >
                  <span style={{ width: "7px", height: "7px", flexShrink: 0, borderRadius: "50%", background: a.dot, marginTop: "6px" }}/>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, lineHeight: 1.35 }}>{a.title}</div>
                    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: T.soft, marginTop: "2px" }}>{a.meta}</div>
                  </div>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: "2px" }}>
                    <path d="M9 6l6 6-6 6" stroke={T.soft} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Last runs table ── */}
      <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: "16px", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", padding: "15px 20px", borderBottom: `1px solid ${T.line}` }}>
          <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "15px" }}>Últimas corridas</span>
          <button
            onClick={() => router.push("/payroll/runs")}
            style={{ marginLeft: "auto", fontSize: "12.5px", fontWeight: 700, color: T.brand, background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            Ver todas →
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1.2fr 0.7fr 1fr 1fr 0.6fr", padding: "11px 20px", borderBottom: `1px solid ${T.line}`, fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: T.soft }}>
          <span>Periodo</span><span>Entidad</span>
          <span style={{ textAlign: "right" }}>Empleados</span>
          <span style={{ textAlign: "right" }}>Gross</span>
          <span>Status</span><span/>
        </div>
        {runs.map((r) => {
          const badge = STATUS[r.status] ?? STATUS.draft;
          return (
            <div
              key={r.id}
              onClick={() => router.push(`/payroll/runs/${r.id}`)}
              style={{ display: "grid", gridTemplateColumns: "1.3fr 1.2fr 0.7fr 1fr 1fr 0.6fr", alignItems: "center", padding: "14px 20px", borderBottom: `1px solid ${T.line}`, cursor: "pointer", transition: "background .1s" }}
              onMouseOver={(e) => { e.currentTarget.style.background = "#F8F4EB"; }}
              onMouseOut={(e) => { e.currentTarget.style.background = ""; }}
            >
              <span style={{ fontSize: "13.5px", fontWeight: 700 }}>{r.periodLabel}</span>
              <span style={{ fontSize: "13px", color: "#54504A" }}>{r.entity}</span>
              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "13px", textAlign: "right" }}>{r.employeeCount}</span>
              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "13px", fontWeight: 700, textAlign: "right" }}>{fmtUSD(r.gross)}</span>
              <span>
                <span style={{ fontSize: "11px", fontWeight: 700, borderRadius: "999px", padding: "3px 10px", background: badge.bg, color: badge.color }}>
                  {badge.label}
                </span>
              </span>
              <span style={{ textAlign: "right" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M9 6l6 6-6 6" stroke={T.soft} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
