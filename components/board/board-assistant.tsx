"use client";

import { useState, useRef, useEffect, type CSSProperties, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import type { BoardJob } from "@/lib/job-board/search";
import { logoFor, formatSalary, jobSlug, modalityStyle } from "@/lib/board/format";

const ARCHIVO = "'Archivo',sans-serif";
const MONO = "'Space Mono',monospace";

const ROOT: CSSProperties = {
  "--brand": "#0E5C4A", "--accent": "#F1543F", "--lime": "#C6F24E", "--ink": "#1A1A17",
  "--soft": "#79746B", "--line": "#E7E1D4", "--surface": "#FCFAF6", "--bg": "#F4F0E8",
  "--brandSoft": "#DCEFE4", "--limeSoft": "#EAF7C4",
  fontFamily: "'Hanken Grotesk',system-ui,sans-serif", color: "#1A1A17", background: "#F4F0E8",
  WebkitFontSmoothing: "antialiased",
} as CSSProperties;

type Filters = { q?: string; location?: string; modality?: string; category?: string; contract?: string; salaryMin?: number };
type BotMsg = { role: "bot"; text: string; chips?: { k: string; v: string }[]; jobs?: BoardJob[]; alert?: { text: string } };
type UserMsg = { role: "user"; text: string };
type Msg = BotMsg | UserMsg;

const SparkIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2Z" stroke="#C6F24E" strokeWidth="1.7" strokeLinejoin="round" /></svg>
);

function chipsFromFilters(f: Filters, locale: string): { k: string; v: string }[] {
  const out: { k: string; v: string }[] = [];
  if (f.q) out.push({ k: "búsqueda", v: f.q });
  if (f.category) out.push({ k: "área", v: f.category });
  if (f.modality) out.push({ k: "modo", v: f.modality });
  if (f.location) out.push({ k: "ciudad", v: f.location });
  if (f.contract) out.push({ k: "contrato", v: f.contract });
  if (f.salaryMin) out.push({ k: "salario", v: `> ${new Intl.NumberFormat(locale).format(f.salaryMin)}` });
  return out;
}

export function BoardAssistant({ locale }: { locale: string }) {
  const t = useTranslations("Board.assistant");
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([{ role: "bot", text: t("greeting") }]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [applied, setApplied] = useState<Record<string, boolean>>({});
  const [applying, setApplying] = useState<string | null>(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  // ¿El candidato tiene perfil completo? Habilita "Aplicar en 1 toque" (misma regla que
  // el board / job-apply-bar). Si no, o si la oferta exige screening, la card enruta al
  // wizard con "Aplicar".
  useEffect(() => {
    fetch("/api/board/profile").then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (d?.completeness?.complete) setHasProfile(true);
    }).catch(() => {});
  }, []);

  // Desktop switch (≥1024px): placeholder/sugerencias más largos y máx 4 tarjetas (móvil 3).
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const on = () => setIsDesktop(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  // Easy apply: aplicar sin salir del chat (1-toque). Sin sesión / con screening / perfil
  // incompleto → al wizard de la oferta.
  async function easyApply(j: BoardJob) {
    setApplying(j.id);
    const r = await fetch("/api/board/apply/one-tap", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId: j.id }),
    }).then((x) => x.json().then((body) => ({ status: x.status, body })).catch(() => ({ status: x.status, body: {} }))).catch(() => null);
    setApplying(null);
    if (r && (r.status === 200 || r.status === 409)) { setApplied((a) => ({ ...a, [j.id]: true })); return; }
    router.push({ pathname: "/empleos/oferta/[slug]/aplicar", params: { slug: jobSlug(j) } });
  }

  // Perfil incompleto o screening obligatorio → wizard directo (estado "full" del board).
  function goWizard(j: BoardJob) {
    router.push({ pathname: "/empleos/oferta/[slug]/aplicar", params: { slug: jobSlug(j) } });
  }

  const suggestions = (t.raw(isDesktop ? "suggestionsDesktop" : "suggestions") as string[]) ?? [];

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  async function send(q: string) {
    const query = q.trim();
    if (!query || typing) return;
    const history = messages.map((m) => ({ role: m.role, content: m.text })).slice(-10);
    setMessages((m) => [...m, { role: "user", text: query }]);
    setDraft("");
    setTyping(true);
    try {
      const res = await fetch("/api/board/assistant", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, history, locale }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const jobs: BoardJob[] = data.jobs ?? [];
      // Alerta creada desde el chat: el backend persiste la JobAlert y devuelve el criterio;
      // aquí armamos el texto del bloque "Alerta creada" localizando la frecuencia.
      let alert: { text: string } | undefined;
      if (data.alert?.criteria) {
        const crit = data.alert.criteria as Filters;
        const parts = chipsFromFilters(crit, locale).map((c) => c.v);
        const desc = parts.length ? parts.join(" · ") : (crit.q ?? "");
        alert = { text: [desc, t("alertFreqDaily")].filter(Boolean).join(" · ") };
      }
      setMessages((m) => [...m, {
        role: "bot",
        text: data.answer || (jobs.length ? "" : t("empty")),
        chips: chipsFromFilters(data.filters ?? {}, locale),
        jobs,
        alert,
      }]);
    } catch {
      setMessages((m) => [...m, { role: "bot", text: t("error") }]);
    } finally {
      setTyping(false);
    }
  }

  return (
    <div style={ROOT} className="jb-asst-shell">
      <AssistantRail t={t} />
      <div className="jb-asst-main">
      {/* header — móvil: identidad del agente. En desktop la identidad vive en el rail
          oscuro, así que esta topbar se oculta (jb-asst-topbar → display:none ≥1024px). */}
      <header className="jb-asst-topbar" style={{ alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid var(--line)", background: "var(--surface)" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", width: "100%", display: "flex", alignItems: "center", gap: 10 }}>
          <Link href="/empleos" style={{ width: 34, height: 34, borderRadius: 10, background: "var(--bg)", border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="var(--ink)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>
          <span style={{ width: 32, height: 32, borderRadius: 10, background: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><SparkIcon size={17} /></span>
          <div>
            <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 15, letterSpacing: "-.3px" }}>{t("title")}</div>
            <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--brand)", display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--brand)" }} />{t("tagline")}</div>
          </div>
        </div>
      </header>

      {/* chat */}
      <div ref={scrollRef} className="jb-asst-scroll" style={{ flex: 1, overflowY: "auto" }}>
        <div className="jb-asst-thread" style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column" }}>
          {messages.map((m, i) => m.role === "user" ? (
            <div key={i} className="jb-asst-bubble-user" style={{ alignSelf: "flex-end", background: "var(--ink)", color: "#F4F0E8", lineHeight: 1.45 }}>{m.text}</div>
          ) : (
            <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
              <span className="jb-asst-bot-avatar" style={{ background: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><SparkIcon /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                {m.text && <div className="jb-asst-bubble-bot" style={{ background: "var(--surface)", border: "1px solid var(--line)", lineHeight: 1.5, color: "#3A3833" }}>{m.text}</div>}
                {m.chips && m.chips.length > 0 && (
                  <div className="jb-asst-chips" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {m.chips.map((c, ci) => (
                      <span key={ci} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, color: "#2C5247", background: "var(--brandSoft)", border: "1px solid #BEE0CE", borderRadius: 999, padding: "4px 10px" }}>
                        <span style={{ fontFamily: MONO, fontSize: 8, textTransform: "uppercase", color: "var(--soft)" }}>{c.k}</span>{c.v}
                      </span>
                    ))}
                  </div>
                )}
                {m.jobs && m.jobs.length > 0 && (
                  <div className="jb-asst-jobs" style={{ display: "grid", marginTop: 11 }}>
                    {m.jobs.slice(0, isDesktop ? 4 : 3).map((j) => {
                      const logo = logoFor(j.company?.name);
                      const md = modalityStyle(j.modality);
                      const canQuick = hasProfile && !j.hasRequiredScreening;
                      return (
                        <div key={j.id} className="jb-asst-jobcard" style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14 }}>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
                            <span style={{ width: 36, height: 36, borderRadius: 10, background: logo.bg, color: logo.color, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ARCHIVO, fontWeight: 900, fontSize: 13, flexShrink: 0 }}>{logo.initials}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--soft)" }}>{j.company?.name}{j.city ? ` · ${j.city}` : ""}</div>
                              <div className="jb-asst-jobtitle" style={{ fontFamily: ARCHIVO, fontWeight: 800, letterSpacing: "-.2px", lineHeight: 1.1, marginTop: 2 }}>{j.title}</div>
                            </div>
                            {typeof (j as { fit?: number }).fit === "number" && <span style={{ flexShrink: 0, fontFamily: MONO, fontSize: 9.5, fontWeight: 700, color: "#46540F", background: "var(--limeSoft)", borderRadius: 6, padding: "3px 7px" }}>{(j as { fit?: number }).fit}% fit</span>}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                            {formatSalary(j, locale) && <span style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 12, color: "var(--brand)" }}>{formatSalary(j, locale)}</span>}
                            {j.modality && <span style={{ fontSize: 10.5, fontWeight: 700, color: md.color, background: md.bg, border: `1px solid ${md.border}`, borderRadius: 6, padding: "2px 7px" }}>{j.modality}</span>}
                          </div>
                          <div style={{ display: "flex", gap: 8, marginTop: 11 }}>
                            {(applied[j.id] || (j as { applied?: boolean }).applied) ? (
                              <span style={{ flex: 1, textAlign: "center", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: ARCHIVO, fontWeight: 800, fontSize: 12.5, color: "var(--brand)", background: "var(--brandSoft)", border: "1px solid #BEE0CE", borderRadius: 10, padding: 9 }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5 9-11" stroke="var(--brand)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>{t("applied")}
                              </span>
                            ) : canQuick ? (
                              <button onClick={() => easyApply(j)} disabled={applying === j.id} className="jb-hard" style={{ flex: 1, textAlign: "center", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, fontFamily: ARCHIVO, fontWeight: 800, fontSize: 12.5, color: "#fff", background: "var(--accent)", border: "2px solid var(--ink)", borderRadius: 10, padding: 9, boxShadow: "2px 2px 0 var(--ink)", cursor: "pointer" }}>
                                {applying === j.id ? "…" : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8Z" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" /></svg>{t("easyApply")}</>}
                              </button>
                            ) : (
                              <button onClick={() => goWizard(j)} className="jb-hard" style={{ flex: 1, textAlign: "center", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, fontFamily: ARCHIVO, fontWeight: 800, fontSize: 12.5, color: "#fff", background: "var(--accent)", border: "2px solid var(--ink)", borderRadius: 10, padding: 9, boxShadow: "2px 2px 0 var(--ink)", cursor: "pointer" }}>
                                {t("apply")}
                              </button>
                            )}
                            <Link href={{ pathname: "/empleos/oferta/[slug]", params: { slug: jobSlug(j) } }} className="jb-tap" style={{ fontFamily: ARCHIVO, fontWeight: 700, fontSize: 12.5, color: "var(--ink)", background: "var(--surface)", border: "2px solid var(--ink)", borderRadius: 10, padding: "9px 14px", boxShadow: "2px 2px 0 var(--ink)" }}>{t("view")}</Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {m.alert && (
                  <div style={{ display: "flex", alignItems: "center", gap: 11, marginTop: 11, background: "var(--limeSoft)", border: "1px solid #D6E89A", borderRadius: 12, padding: "12px 14px" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6Z" stroke="#46540F" strokeWidth="2" strokeLinejoin="round" /><path d="M10 19a2 2 0 004 0" stroke="#46540F" strokeWidth="2" /></svg>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 13, color: "#2C3907" }}>{t("alertCreated")}</div>
                      <div style={{ fontSize: 12, color: "#46540F" }}>{m.alert.text}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {typing && (
            <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
              <span className="jb-asst-bot-avatar" style={{ background: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><SparkIcon /></span>
              <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "4px 14px 14px 14px", padding: "15px 16px", display: "flex", gap: 4 }}>
                <span className="jb-dot" /><span className="jb-dot" /><span className="jb-dot" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* composer */}
      <div style={{ background: "var(--surface)", borderTop: "1px solid var(--line)", padding: "10px 14px 16px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          {messages.length <= 1 && (
            <div className="jb-asst-suggest" style={{ display: "flex", gap: 7, paddingBottom: 9 }}>
              {suggestions.map((q) => (
                <button key={q} onClick={() => send(q)} style={{ flexShrink: 0, fontSize: 12, fontWeight: 600, color: "#54504A", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 999, padding: "7px 12px", whiteSpace: "nowrap", cursor: "pointer" }}>{q}</button>
              ))}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 9, background: "var(--bg)", border: "1.5px solid var(--line)", borderRadius: 14, padding: "9px 9px 9px 14px" }}>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(draft); }} placeholder={isDesktop ? t("placeholderDesktop") : t("placeholder")} style={{ flex: 1, fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 15, color: "var(--ink)", background: "transparent", border: "none", outline: "none" }} />
            <button onClick={() => send(draft)} disabled={typing} className="jb-hard jb-asst-send" style={{ flexShrink: 0, borderRadius: 11, background: "var(--accent)", border: "2px solid var(--ink)", boxShadow: "2px 2px 0 var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", cursor: typing ? "not-allowed" : "pointer", opacity: typing ? 0.7 : 1 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M4 12h15M13 6l6 6-6 6" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

// Rail de marca del agente (solo desktop): tinta, identidad, qué puede hacer, garantía.
// Composición fiel al mockup Desktop: back-link gris arriba → badge sparkle 52 en su
// propia línea → título 26px → intro → estado lima → divisor → capacidades → footer.
function AssistantRail({ t }: { t: ReturnType<typeof useTranslations> }) {
  const caps: { k: string; d: string; icon: ReactNode }[] = [
    { k: "cap1", d: "cap1Desc", icon: <><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" /><path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></> },
    { k: "cap2", d: "cap2Desc", icon: <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /> },
    { k: "cap3", d: "cap3Desc", icon: <><path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M10 19a2 2 0 004 0" stroke="currentColor" strokeWidth="2" /></> },
  ];
  return (
    <aside className="jb-asst-rail" style={{ background: "var(--ink)", color: "#E4E0D7", padding: "32px 30px", flexDirection: "column" }}>
      <Link href="/empleos" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: MONO, fontSize: 11, color: "#8C877E", marginBottom: 28 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>{t("railBack")}
      </Link>
      <span style={{ width: 52, height: 52, borderRadius: 15, background: "rgba(198,242,78,.14)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}><SparkIcon size={26} /></span>
      <h1 style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 26, letterSpacing: "-.9px", lineHeight: 1.1, margin: "0 0 8px", color: "#fff" }}>{t("title")}</h1>
      <p style={{ fontSize: 14, lineHeight: 1.55, color: "#B7B2A8", margin: "0 0 24px" }}>{t("railIntro")}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: MONO, fontSize: 10.5, color: "var(--lime)", marginBottom: 26 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--lime)" }} />{t("railStatus")}
      </div>
      <div style={{ height: 1, background: "#38352E", marginBottom: 22 }} />
      <div style={{ fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: .5, color: "#8C877E", marginBottom: 14 }}>{t("railWhat")}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {caps.map((c) => (
          <div key={c.k} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <span style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(198,242,78,.12)", color: "var(--lime)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none">{c.icon}</svg></span>
            <div>
              <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 14, color: "#fff" }}>{t(c.k)}</div>
              <div style={{ fontSize: 12.5, color: "#B7B2A8", lineHeight: 1.4 }}>{t(c.d)}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ fontFamily: MONO, fontSize: 9.5, color: "#8C877E", marginTop: 22 }}>{t("railFooter")}</div>
    </aside>
  );
}
