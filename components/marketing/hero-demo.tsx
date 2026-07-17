"use client";

// Demo interactiva del hero (mockup Landing V3): un "browser frame" con el
// dashboard real de TalentOS en miniatura. El menú lateral cambia de vista
// (dashboard / ofertas / empleados / nómina) y el resto aparece bloqueado
// invitando a registrarse.

import { useState, type CSSProperties, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { LogoMark, MIcon, type IconName } from "./icons";

const ARCHIVO = "'Archivo',sans-serif";
const MONO = "'Space Mono',monospace";
const HANKEN = "'Hanken Grotesk',sans-serif";

type Metric = { label: string; value: string; delta: string; up: boolean };
type Filter = { label: string; count: string };
type AttentionRow = { ini: string; name: string; tag: string; meta: string; actions: string[] };
type Job = { ini: string; title: string; ia: boolean; meta: string; salary: string; cands: string };
type Person = { ini: string; name: string; meta: string; boss: string };
type PayRow = { ini: string; name: string; net: string };
type Activity = { text: string; time: string };

type NavItem = { view: string; labelKey: string; icon: IconName; locked?: boolean };

const NAV: { group: string | null; items: NavItem[] }[] = [
  { group: null, items: [{ view: "dashboard", labelKey: "dashboard", icon: "grid" }] },
  {
    group: "groupRecruiting",
    items: [
      { view: "ofertas", labelKey: "ofertas", icon: "brief" },
      { view: "candidatos", labelKey: "candidatos", icon: "users2", locked: true },
    ],
  },
  {
    group: "groupPeople",
    items: [
      { view: "empleados", labelKey: "empleados", icon: "idcard" },
      { view: "organigrama", labelKey: "organigrama", icon: "org", locked: true },
      { view: "ausencias", labelKey: "ausencias", icon: "cal", locked: true },
      { view: "horas", labelKey: "horas", icon: "clock", locked: true },
    ],
  },
  {
    group: "groupPayroll",
    items: [
      { view: "nomina", labelKey: "nomina", icon: "card" },
      { view: "payruns", labelKey: "payruns", icon: "slip", locked: true },
      { view: "perfiles", labelKey: "perfiles", icon: "user", locked: true },
    ],
  },
  { group: "groupWorkspace", items: [{ view: "ajustes", labelKey: "ajustes", icon: "gear", locked: true }] },
];

const METRIC_KEYS = ["pipeline", "hires", "absent", "hours", "cpa"] as const;

const ROW_LOOK = [
  { border: "#BD4332", avBg: "#F6D9D2", avColor: "#BD4332", tagColor: "#BD4332", tagBg: "#F6D9D2" },
  { border: "#0E5C4A", avBg: "#DCEFE4", avColor: "#0E5C4A", tagColor: "#0E5C4A", tagBg: "#DCEFE4" },
  { border: "#F1543F", avBg: "#DCEFE4", avColor: "#0E5C4A", tagColor: "#C7402E", tagBg: "#FAE3DE" },
];

const JOB_AV = [
  { bg: "#DCEFE4", color: "#0E5C4A" },
  { bg: "#F6E0D9", color: "#F1543F" },
  { bg: "#E7E0F2", color: "#5A4C86" },
  { bg: "#F8E7C4", color: "#946312" },
];
const PERSON_AV = [
  { bg: "#DCEFE4", color: "#0E5C4A" },
  { bg: "#F8E7C4", color: "#946312" },
  { bg: "#E7E0F2", color: "#5A4C86" },
];
const ACTIVITY_DOTS = ["#0E5C4A", "#F1543F", "#946312"];

// Estilo de los botones de acción de la bandeja, por fila y por acción.
function actionStyle(row: number, action: number): CSSProperties {
  const base: CSSProperties = { fontFamily: ARCHIVO, fontSize: 11, borderRadius: 9, whiteSpace: "nowrap" };
  if (row === 0) return { ...base, fontWeight: 800, color: "#fff", background: "var(--accent)", border: "1.5px solid var(--ink)", padding: "6px 12px", boxShadow: "2px 2px 0 var(--ink)" };
  if (row === 1 && action === 0) return { ...base, fontWeight: 700, color: "var(--soft)", background: "var(--surface)", border: "1.5px solid var(--line)", padding: "6px 11px" };
  if (row === 1) return { ...base, fontWeight: 800, color: "#fff", background: "#0E5C4A", border: "1.5px solid var(--ink)", padding: "6px 12px", boxShadow: "2px 2px 0 var(--ink)" };
  return { ...base, fontWeight: 800, color: "var(--ink)", background: "var(--surface)", border: "1.5px solid var(--ink)", padding: "6px 12px", boxShadow: "2px 2px 0 var(--ink)" };
}

function Avatar({ ini, bg, color, size = 34 }: { ini: string; bg: string; color: string; size?: number }) {
  return (
    <span style={{ width: size, height: size, flexShrink: 0, borderRadius: "50%", background: bg, color, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ARCHIVO, fontWeight: 800, fontSize: size * 0.34 }}>
      {ini}
    </span>
  );
}

function Kicker({ children }: { children: ReactNode }) {
  return <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "1.4px", textTransform: "uppercase", color: "var(--soft)", marginBottom: 5 }}>{children}</div>;
}

function ViewTitle({ children }: { children: ReactNode }) {
  return <div style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 26, letterSpacing: "-1px" }}>{children}</div>;
}

export function HeroDemo() {
  const t = useTranslations("Landing");
  const [view, setView] = useState("dashboard");
  const [pers, setPers] = useState(false);
  const [metricsOn, setMetricsOn] = useState<Record<string, boolean>>({ pipeline: true, hires: true, absent: true, hours: true, cpa: true });

  const metrics = t.raw("demo.dash.metrics") as Metric[];
  const filters = t.raw("demo.dash.filters") as Filter[];
  const rows = t.raw("demo.dash.rows") as AttentionRow[];
  const activity = t.raw("demo.dash.activity") as Activity[];
  const jobs = t.raw("demo.ofertas.jobs") as Job[];
  const jobFilters = t.raw("demo.ofertas.filters") as string[];
  const people = t.raw("demo.empleados.people") as Person[];
  const payRows = t.raw("demo.nomina.rows") as PayRow[];
  const lockedLabels = t.raw("demo.locked.labels") as Record<string, string>;

  const isLocked = view in lockedLabels;

  function pick(v: string) {
    setView(v);
    setPers(false);
  }

  const navButton = (item: NavItem) => (
    <button key={item.view} className={`hero-nav${view === item.view ? " on" : ""}`} onClick={() => pick(item.view)}>
      <span style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><MIcon name={item.icon} size={15} /></span>
      <span style={{ flex: 1 }}>{t(`demo.sidebar.${item.labelKey}`)}</span>
      {item.locked && <span className="lock" style={{ display: "flex" }}><MIcon name="lock" size={12} /></span>}
    </button>
  );

  return (
    <div className="ld-shot ld-heroshot" style={{ marginTop: 46, position: "relative", border: "1px solid var(--line)", borderRadius: 16, background: "var(--surface)", boxShadow: "0 44px 90px -50px rgba(26,26,23,.6)", overflow: "hidden", textAlign: "left" }}>
      {/* barra del navegador */}
      <div style={{ height: 40, display: "flex", alignItems: "center", gap: 7, padding: "0 16px", borderBottom: "1px solid var(--line)", background: "#F8F4EB" }}>
        <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#E6A2A2" }} />
        <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#EBCB8E" }} />
        <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#A9D3B4" }} />
        <span style={{ margin: "0 auto", fontFamily: MONO, fontSize: 11, color: "var(--soft)", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 7, padding: "3px 14px" }}>app.talentos.com/dashboard</span>
      </div>

      <div className="hero-frame" style={{ display: "flex", height: 592, background: "var(--bg)", position: "relative" }}>
        <div className="hero-hint" style={{ position: "absolute", zIndex: 6, top: 60, right: 16, display: "inline-flex", alignItems: "center", gap: 7, fontFamily: MONO, fontSize: 10, fontWeight: 700, color: "#46540F", background: "var(--lime)", border: "1.5px solid var(--ink)", borderRadius: 999, padding: "5px 11px", boxShadow: "2px 2px 0 var(--ink)", pointerEvents: "none" }}>
          <span className="ld-blink" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--brand)" }} />
          {t("hero.hint")}
        </div>

        {/* SIDEBAR interactiva */}
        <aside className="hero-side" style={{ width: 196, flexShrink: 0, background: "var(--surface)", borderRight: "1px solid var(--line)", display: "flex", flexDirection: "column" }}>
          <div style={{ height: 52, display: "flex", alignItems: "center", gap: 9, padding: "0 15px", borderBottom: "1px solid var(--line)" }}>
            <div style={{ width: 26, height: 26, borderRadius: 8, background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "2px 2px 0 var(--ink)" }}>
              <LogoMark size={13} />
            </div>
            <span style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 15, letterSpacing: "-.4px" }}>TalentOS</span>
          </div>
          <div style={{ flex: 1, overflow: "hidden", padding: 10 }}>
            {NAV.map((g, gi) => (
              <div key={g.group ?? `g${gi}`}>
                {g.group && <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "1.2px", textTransform: "uppercase", color: "var(--soft)", padding: "12px 9px 5px" }}>{t(`demo.sidebar.${g.group}`)}</div>}
                {g.items.map(navButton)}
              </div>
            ))}
          </div>
          <div style={{ padding: "11px 13px", borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#8FE3D0,#4FBFA6)", color: "#063D31", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 11, flexShrink: 0 }}>MM</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>michael@empresa.com</div>
              <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--soft)" }}>{t("demo.sidebar.logout")}</div>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          {/* topbar */}
          <div style={{ height: 52, flexShrink: 0, display: "flex", alignItems: "center", gap: 12, padding: "0 18px", borderBottom: "1px solid var(--line)", background: "var(--surface)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 10, padding: "7px 12px", width: 260, color: "var(--soft)" }}>
              <MIcon name="search" size={14} />
              <span style={{ fontSize: 12.5, color: "var(--soft)" }}>{t("demo.search")}</span>
              <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 9.5, color: "var(--soft)", border: "1px solid var(--line)", borderRadius: 5, padding: "1px 5px" }}>⌘K</span>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--soft)" }}><MIcon name="bell" size={17} /></span>
              <span style={{ width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--soft)" }}><MIcon name="help" size={17} /></span>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#8FE3D0,#4FBFA6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 11, color: "#063D31", marginLeft: 4 }}>MM</div>
            </div>
          </div>

          {/* contenido */}
          <div className="hero-scroll" style={{ flex: 1, overflow: "hidden", padding: "20px 22px", background: "radial-gradient(120% 90% at 100% 0%, #F7F3EB 0%, #F4F0E8 55%)" }}>
            {/* chips móvil */}
            <div className="hero-chipnav" style={{ gap: 7, overflowX: "auto", paddingBottom: 12, marginBottom: 4 }}>
              {NAV.flatMap((g) => g.items).map((item) => (
                <button key={item.view} className={`hero-chip${view === item.view ? " on" : ""}`} onClick={() => pick(item.view)}>
                  {t(`demo.sidebar.${item.labelKey}`)}
                </button>
              ))}
            </div>

            {view === "dashboard" && (
              <>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 14, marginBottom: 16 }}>
                  <div>
                    <Kicker>{t("demo.dash.date")}</Kicker>
                    <ViewTitle>{t("demo.dash.greeting")}</ViewTitle>
                  </div>
                  <button onClick={() => setPers((p) => !p)} className="ld-hard" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: ARCHIVO, fontWeight: 700, fontSize: 12, color: "var(--ink)", background: "var(--surface)", border: "2px solid var(--ink)", borderRadius: 10, padding: "8px 13px", boxShadow: "2px 2px 0 var(--ink)", cursor: "pointer" }}>
                    <MIcon name="sliders" size={13} />
                    {t("demo.dash.personalize")}
                  </button>
                </div>

                {pers && (
                  <div style={{ background: "var(--surface)", border: "1.5px solid var(--ink)", borderRadius: 14, boxShadow: "4px 4px 0 var(--ink)", padding: "14px 16px", marginBottom: 16 }}>
                    <div style={{ fontFamily: MONO, fontSize: 9, textTransform: "uppercase", letterSpacing: ".5px", color: "var(--soft)", marginBottom: 10 }}>{t("demo.dash.personalizeHint")}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                      {METRIC_KEYS.map((key, i) => {
                        const on = !!metricsOn[key];
                        return (
                          <button key={key} onClick={() => setMetricsOn((m) => ({ ...m, [key]: !m[key] }))} style={{ fontFamily: HANKEN, fontWeight: 600, fontSize: 11, cursor: "pointer", borderRadius: 999, padding: "5px 10px", border: `1.5px solid ${on ? "#0E5C4A" : "#E7E1D4"}`, background: on ? "#DCEFE4" : "#FCFAF6", color: on ? "#0E5C4A" : "#79746B" }}>
                            {on ? "✓" : "+"} {metrics[i]?.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* pulso */}
                <div className="hero-pulse" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(118px,1fr))", gap: 9, marginBottom: 18 }}>
                  {METRIC_KEYS.map((key, i) =>
                    metricsOn[key] ? (
                      <div key={key} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 13px" }}>
                        <div style={{ fontFamily: MONO, fontSize: 8.5, textTransform: "uppercase", letterSpacing: ".5px", color: "var(--soft)", marginBottom: 6, lineHeight: 1.3 }}>{metrics[i]?.label}</div>
                        <div style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 23, letterSpacing: "-1px" }}>{metrics[i]?.value}</div>
                        <div style={{ fontSize: 10, fontWeight: 700, marginTop: 2, color: metrics[i]?.up ? "#1B6B4F" : "#79746B" }}>{metrics[i]?.delta}</div>
                      </div>
                    ) : null
                  )}
                </div>

                {/* grid bandeja + rail */}
                <div className="hero-body" style={{ display: "grid", gridTemplateColumns: "1.62fr 1fr", gap: 14, alignItems: "start" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <span style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 16, letterSpacing: "-.5px" }}>{t("demo.dash.attentionTitle")}</span>
                      <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: "var(--accent)", background: "#FAE3DE", border: "1px solid #F2C4B9", borderRadius: 999, padding: "2px 8px" }}>6</span>
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--soft)", margin: "5px 0 11px" }}>{t("demo.dash.attentionSub")}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                      {filters.map((f, i) => (
                        <span key={f.label} style={{ fontFamily: ARCHIVO, fontWeight: i === 0 ? 800 : 600, fontSize: 11, borderRadius: 999, padding: "5px 11px", border: `1.5px solid ${i === 0 ? "var(--ink)" : "var(--line)"}`, background: i === 0 ? "var(--ink)" : "var(--surface)", color: i === 0 ? "#fff" : "var(--soft)" }}>
                          {f.label}<span style={{ opacity: 0.6, marginLeft: 5 }}>{f.count}</span>
                        </span>
                      ))}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {rows.map((r, i) => {
                        const look = ROW_LOOK[i] ?? ROW_LOOK[0];
                        return (
                          <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--surface)", border: "1px solid var(--line)", borderLeft: `4px solid ${look.border}`, borderRadius: 13, padding: "11px 13px" }}>
                            <Avatar ini={r.ini} bg={look.avBg} color={look.avColor} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                                <span style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 13.5, letterSpacing: "-.2px" }}>{r.name}</span>
                                <span style={{ fontFamily: MONO, fontSize: 8, textTransform: "uppercase", letterSpacing: ".5px", color: look.tagColor, background: look.tagBg, borderRadius: 999, padding: "2px 7px" }}>{r.tag}</span>
                              </div>
                              <div style={{ fontFamily: MONO, fontSize: 10, color: "var(--soft)", marginTop: 3 }}>{r.meta}</div>
                            </div>
                            {r.actions.map((a, ai) => (
                              <span key={a} style={actionStyle(i, ai)}>{a}</span>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ width: "100%", marginTop: 10, fontFamily: ARCHIVO, fontWeight: 700, fontSize: 11.5, color: "var(--soft)", background: "transparent", border: "1.5px dashed var(--line)", borderRadius: 11, padding: 9, textAlign: "center" }}>{t("demo.dash.viewAll")}</div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {/* sugerencias del agente */}
                    <div style={{ background: "var(--ink)", borderRadius: 15, padding: "15px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                        <span style={{ width: 23, height: 23, borderRadius: 7, background: "rgba(198,242,78,.16)", display: "flex", alignItems: "center", justifyContent: "center", color: "#C6F24E" }}><MIcon name="pencil" size={12} /></span>
                        <span style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 12.5, color: "#F4F0E8" }}>{t("demo.dash.agentTitle")}</span>
                        <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 8.5, color: "#C6F24E", background: "rgba(198,242,78,.12)", border: "1px solid rgba(198,242,78,.3)", borderRadius: 999, padding: "2px 7px" }}>4</span>
                      </div>
                      <div style={{ fontFamily: MONO, fontSize: 8.5, color: "#8C877E", marginBottom: 9 }}>
                        {t("demo.dash.agentUpdated")} <span style={{ color: "#C6F24E" }}>{t("demo.dash.agentRefresh")}</span>
                      </div>
                      <p style={{ fontSize: 11.5, lineHeight: 1.5, color: "#E4E0D8", margin: "0 0 10px" }}>
                        {t.rich("demo.dash.agentBody", { b: (chunks) => <b style={{ color: "#fff" }}>{chunks}</b> })}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 10.5, color: "var(--ink)", background: "var(--lime)", borderRadius: 8, padding: "6px 10px" }}>{t("demo.dash.agentAction")}</span>
                        <span style={{ fontFamily: HANKEN, fontWeight: 600, fontSize: 10.5, color: "#CFCAC0", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.14)", borderRadius: 8, padding: "6px 9px" }}>{t("demo.dash.agentDone")}</span>
                        <span style={{ fontFamily: HANKEN, fontWeight: 600, fontSize: 10.5, color: "#8C877E", padding: "6px 4px" }}>{t("demo.dash.agentIgnore")}</span>
                      </div>
                      <div style={{ fontFamily: MONO, fontSize: 8.5, color: "#8C877E", marginTop: 10 }}>{t("demo.dash.agentFoot")}</div>
                    </div>

                    {/* actividad reciente */}
                    <div>
                      <div style={{ fontFamily: MONO, fontSize: 9, textTransform: "uppercase", letterSpacing: "1px", color: "var(--soft)", marginBottom: 9 }}>{t("demo.dash.activityTitle")}</div>
                      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 13, overflow: "hidden" }}>
                        {activity.map((a, i) => (
                          <div key={a.text} style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 13px", borderBottom: i < activity.length - 1 ? "1px solid var(--line)" : "none" }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: ACTIVITY_DOTS[i] ?? "#0E5C4A", flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0, fontSize: 11.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.text}</div>
                            <span style={{ fontFamily: MONO, fontSize: 9, color: "var(--soft)" }}>{a.time}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {view === "ofertas" && (
              <>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 14, marginBottom: 14 }}>
                  <div>
                    <Kicker>{t("demo.ofertas.kicker")}</Kicker>
                    <ViewTitle>{t("demo.ofertas.title")}</ViewTitle>
                  </div>
                  <span className="ld-hard" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: ARCHIVO, fontWeight: 800, fontSize: 12, color: "#fff", background: "var(--accent)", border: "2px solid var(--ink)", borderRadius: 10, padding: "8px 13px", boxShadow: "2px 2px 0 var(--ink)", cursor: "pointer" }}>{t("demo.ofertas.newBtn")}</span>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                  {jobFilters.map((f, i) => (
                    <span key={f} style={{ fontFamily: ARCHIVO, fontWeight: i === 0 ? 800 : 600, fontSize: 11, borderRadius: 999, padding: "5px 11px", border: `1.5px solid ${i === 0 ? "var(--ink)" : "var(--line)"}`, background: i === 0 ? "var(--ink)" : "var(--surface)", color: i === 0 ? "#fff" : "var(--soft)" }}>{f}</span>
                  ))}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {jobs.map((j, i) => {
                    const av = JOB_AV[i] ?? JOB_AV[0];
                    return (
                      <div key={j.title} className="ld-card" style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 13, padding: "11px 13px" }}>
                        <Avatar ini={j.ini} bg={av.bg} color={av.color} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                            <span style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 13.5, letterSpacing: "-.2px" }}>{j.title}</span>
                            {j.ia && <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, color: "#46540F", background: "#EAF7C4", borderRadius: 5, padding: "1px 6px" }}>{t("demo.ofertas.iaBadge")}</span>}
                          </div>
                          <div style={{ fontFamily: MONO, fontSize: 10, color: "var(--soft)", marginTop: 3 }}>{j.meta}</div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>{j.salary}</div>
                          <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--soft)", marginTop: 2 }}>{j.cands}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {view === "empleados" && (
              <>
                <div style={{ marginBottom: 14 }}>
                  <Kicker>{t("demo.empleados.kicker")}</Kicker>
                  <ViewTitle>{t("demo.empleados.title")}</ViewTitle>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "linear-gradient(90deg,#0E5C4A,#2C4E63)", color: "#fff", borderRadius: 13, padding: "12px 15px", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 14 }}>{t("demo.empleados.bannerTitle")}</div>
                    <div style={{ fontSize: 11.5, color: "#CDE5DC", marginTop: 2 }}>{t("demo.empleados.bannerSub")}</div>
                  </div>
                  <span className="ld-hard" style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 11.5, color: "var(--ink)", background: "var(--lime)", border: "2px solid var(--ink)", borderRadius: 9, padding: "7px 12px", boxShadow: "2px 2px 0 var(--ink)", cursor: "pointer", whiteSpace: "nowrap" }}>{t("demo.empleados.bannerCta")}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {people.map((p, i) => {
                    const av = PERSON_AV[i] ?? PERSON_AV[0];
                    return (
                      <div key={p.name} className="ld-card" style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 13, padding: "10px 13px" }}>
                        <Avatar ini={p.ini} bg={av.bg} color={av.color} size={34} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 13.5 }}>{p.name}</div>
                          <div style={{ fontFamily: MONO, fontSize: 10, color: "var(--soft)", marginTop: 2 }}>{p.meta}</div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0, fontFamily: MONO, fontSize: 8.5, color: "var(--soft)", textTransform: "uppercase" }}>
                          {t("demo.empleados.reportsTo")}
                          <div style={{ color: "var(--ink)", fontWeight: 700, fontSize: 10.5, textTransform: "none", marginTop: 1 }}>{p.boss}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {view === "nomina" && (
              <>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
                  <div>
                    <Kicker>{t("demo.nomina.kicker")}</Kicker>
                    <ViewTitle>{t("demo.nomina.title")}</ViewTitle>
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: "#0E5C4A", background: "#DCEFE4", border: "1px solid #BEE0CE", borderRadius: 999, padding: "5px 11px" }}>{t("demo.nomina.status")}</span>
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", background: "var(--ink)", color: "#F4F0E8", borderRadius: 14, padding: "15px 17px", marginBottom: 14 }}>
                  <div>
                    <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: ".5px", textTransform: "uppercase", color: "#B7B2A8" }}>{t("demo.nomina.costLabel")}</div>
                    <div style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 30, letterSpacing: "-1px", marginTop: 3 }}>{t("demo.nomina.cost")}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: MONO, fontSize: 10, color: "var(--lime)" }}>{t("demo.nomina.receipts")}</div>
                    <div style={{ fontFamily: MONO, fontSize: 9, color: "#8C877E", marginTop: 3 }}>{t("demo.nomina.pack")}</div>
                  </div>
                </div>
                <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 13, padding: "4px 14px" }}>
                  {payRows.map((r, i) => {
                    const av = PERSON_AV[i] ?? PERSON_AV[0];
                    return (
                      <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 2px", borderTop: i > 0 ? "1px solid var(--line)" : "none" }}>
                        <Avatar ini={r.ini} bg={av.bg} color={av.color} size={30} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 13 }}>{r.name}</div>
                          <div style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--soft)" }}>{r.net}</div>
                        </div>
                        <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: "#0E5C4A", background: "#DCEFE4", borderRadius: 6, padding: "3px 8px" }}>{t("demo.nomina.receiptBadge")}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {isLocked && (
              <div style={{ height: 440, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
                <div style={{ maxWidth: 390, textAlign: "center", background: "var(--surface)", border: "1.5px solid var(--ink)", borderRadius: 18, boxShadow: "4px 4px 0 var(--ink)", padding: "32px 30px" }}>
                  <div style={{ width: 50, height: 50, margin: "0 auto 16px", borderRadius: 15, background: "var(--limeSoft)", border: "1.5px solid #D6E89A", display: "flex", alignItems: "center", justifyContent: "center", color: "#46540F" }}>
                    <MIcon name="lock" size={22} />
                  </div>
                  <div style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 21, letterSpacing: "-.5px" }}>{lockedLabels[view]}</div>
                  <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--soft)", margin: "8px 0 18px" }}>{t("demo.locked.body")}</p>
                  <a href="#cta" className="ld-hard" style={{ display: "inline-flex", fontFamily: ARCHIVO, fontWeight: 800, fontSize: 13, color: "#fff", background: "var(--accent)", border: "2px solid var(--ink)", borderRadius: 11, padding: "11px 20px", boxShadow: "3px 3px 0 var(--ink)", cursor: "pointer" }}>{t("demo.locked.cta")}</a>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--soft)", marginTop: 14 }}>{t("demo.locked.foot")}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
