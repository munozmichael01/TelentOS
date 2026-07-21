"use client";

import { useState, useRef, useEffect, type CSSProperties } from "react";
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
type BotMsg = { role: "bot"; text: string; chips?: { k: string; v: string }[]; jobs?: BoardJob[] };
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
  const suggestions = (t.raw("suggestions") as string[]) ?? [];

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
        body: JSON.stringify({ query, history }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const jobs: BoardJob[] = data.jobs ?? [];
      setMessages((m) => [...m, {
        role: "bot",
        text: data.answer || (jobs.length ? "" : t("empty")),
        chips: chipsFromFilters(data.filters ?? {}, locale),
        jobs,
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
      {/* header */}
      <header style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid var(--line)", background: "var(--surface)" }}>
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
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "18px 14px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>
          {messages.map((m, i) => m.role === "user" ? (
            <div key={i} style={{ alignSelf: "flex-end", maxWidth: "80%", background: "var(--ink)", color: "#F4F0E8", borderRadius: "14px 14px 4px 14px", padding: "10px 13px", fontSize: 13.5, lineHeight: 1.45 }}>{m.text}</div>
          ) : (
            <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
              <span style={{ width: 28, height: 28, borderRadius: 9, background: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><SparkIcon /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                {m.text && <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "4px 14px 14px 14px", padding: "11px 13px", fontSize: 13.5, lineHeight: 1.5, color: "#3A3833" }}>{m.text}</div>}
                {m.chips && m.chips.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 9 }}>
                    {m.chips.map((c, ci) => (
                      <span key={ci} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, color: "#2C5247", background: "var(--brandSoft)", border: "1px solid #BEE0CE", borderRadius: 999, padding: "4px 10px" }}>
                        <span style={{ fontFamily: MONO, fontSize: 8, textTransform: "uppercase", color: "var(--soft)" }}>{c.k}</span>{c.v}
                      </span>
                    ))}
                  </div>
                )}
                {m.jobs && m.jobs.length > 0 && (
                  <div className="jb-asst-jobs" style={{ display: "grid", gap: 9, marginTop: 11 }}>
                    {m.jobs.slice(0, 4).map((j) => {
                      const logo = logoFor(j.company?.name);
                      const md = modalityStyle(j.modality);
                      return (
                        <div key={j.id} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: 13 }}>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
                            <span style={{ width: 36, height: 36, borderRadius: 10, background: logo.bg, color: logo.color, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ARCHIVO, fontWeight: 900, fontSize: 13, flexShrink: 0 }}>{logo.initials}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--soft)" }}>{j.company?.name}{j.city ? ` · ${j.city}` : ""}</div>
                              <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 14, letterSpacing: "-.2px", lineHeight: 1.1, marginTop: 2 }}>{j.title}</div>
                            </div>
                            {typeof (j as { fit?: number }).fit === "number" && <span style={{ flexShrink: 0, fontFamily: MONO, fontSize: 9.5, fontWeight: 700, color: "#46540F", background: "var(--limeSoft)", borderRadius: 6, padding: "3px 7px" }}>{(j as { fit?: number }).fit}% fit</span>}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                            {formatSalary(j, locale) && <span style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 12, color: "var(--brand)" }}>{formatSalary(j, locale)}</span>}
                            {j.modality && <span style={{ fontSize: 10.5, fontWeight: 700, color: md.color, background: md.bg, border: `1px solid ${md.border}`, borderRadius: 6, padding: "2px 7px" }}>{j.modality}</span>}
                          </div>
                          <div style={{ display: "flex", gap: 8, marginTop: 11 }}>
                            {applied[j.id] ? (
                              <span style={{ flex: 1, textAlign: "center", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: ARCHIVO, fontWeight: 800, fontSize: 12.5, color: "var(--brand)", background: "var(--brandSoft)", border: "1px solid #BEE0CE", borderRadius: 11, padding: 9 }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5 9-11" stroke="var(--brand)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>{t("applied")}
                              </span>
                            ) : (
                              <button onClick={() => easyApply(j)} disabled={applying === j.id} className="jb-hard" style={{ flex: 1, textAlign: "center", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, fontFamily: ARCHIVO, fontWeight: 800, fontSize: 12.5, color: "#fff", background: "var(--accent)", border: "2px solid var(--ink)", borderRadius: 11, padding: 9, boxShadow: "2px 2px 0 var(--ink)", cursor: "pointer" }}>
                                {applying === j.id ? "…" : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8Z" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" /></svg>{t("easyApply")}</>}
                              </button>
                            )}
                            <Link href={{ pathname: "/empleos/oferta/[slug]", params: { slug: jobSlug(j) } }} className="jb-hard" style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 12.5, color: "var(--ink)", background: "var(--surface)", border: "2px solid var(--ink)", borderRadius: 11, padding: "9px 14px", boxShadow: "2px 2px 0 var(--ink)" }}>{t("view")}</Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}

          {typing && (
            <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
              <span style={{ width: 28, height: 28, borderRadius: 9, background: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><SparkIcon /></span>
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
            <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 9 }}>
              {suggestions.map((q) => (
                <button key={q} onClick={() => send(q)} style={{ flexShrink: 0, fontSize: 12, fontWeight: 600, color: "#54504A", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 999, padding: "7px 12px", whiteSpace: "nowrap", cursor: "pointer" }}>{q}</button>
              ))}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 9, background: "var(--bg)", border: "1.5px solid var(--line)", borderRadius: 14, padding: "9px 9px 9px 14px" }}>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(draft); }} placeholder={t("placeholder")} style={{ flex: 1, fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 15, color: "var(--ink)", background: "transparent", border: "none", outline: "none" }} />
            <button onClick={() => send(draft)} disabled={typing} className="jb-hard" style={{ width: 38, height: 38, flexShrink: 0, borderRadius: 11, background: "var(--accent)", border: "2px solid var(--ink)", boxShadow: "2px 2px 0 var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", cursor: typing ? "not-allowed" : "pointer", opacity: typing ? 0.7 : 1 }}>
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
function AssistantRail({ t }: { t: ReturnType<typeof useTranslations> }) {
  const caps = [
    { k: "cap1", d: "cap1Desc", icon: <path d="M11 4a7 7 0 105.6 11.2L21 19M18 11a7 7 0 10-14 0 7 7 0 0014 0Z" /> },
    { k: "cap2", d: "cap2Desc", icon: <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8Z" strokeLinejoin="round" /> },
    { k: "cap3", d: "cap3Desc", icon: <path d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5L12 3Z" strokeLinejoin="round" /> },
  ];
  return (
    <aside className="jb-asst-rail" style={{ background: "var(--ink)", color: "#F4F0E8", padding: "36px 32px", flexDirection: "column", gap: 22 }}>
      <Link href="/empleos" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: MONO, fontSize: 11, fontWeight: 700, color: "var(--lime)" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>{t("railBack")}
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <span style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(198,242,78,.14)", display: "flex", alignItems: "center", justifyContent: "center" }}><SparkIcon size={22} /></span>
        <div style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 22, letterSpacing: "-.5px", lineHeight: 1.05 }}>{t("title")}</div>
      </div>
      <p style={{ fontSize: 14, lineHeight: 1.5, color: "#B7B2A8", margin: 0 }}>{t("railIntro")}</p>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: MONO, fontSize: 10.5, color: "var(--lime)" }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--lime)" }} />{t("railStatus")}
      </div>
      <div>
        <div style={{ fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: .6, color: "#8C877E", marginBottom: 12 }}>{t("railWhat")}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {caps.map((c) => (
            <div key={c.k} style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
              <span style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(198,242,78,.12)", color: "var(--lime)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">{c.icon}</svg></span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#E8E4DB" }}>{t(c.k)}</div>
                <div style={{ fontSize: 12.5, color: "#8C877E", lineHeight: 1.4 }}>{t(c.d)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: MONO, fontSize: 10.5, color: "#8C877E" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="9" rx="2" stroke="#8C877E" strokeWidth="1.8" /><path d="M8 11V8a4 4 0 018 0v3" stroke="#8C877E" strokeWidth="1.8" /></svg>
          {t("railReadonly")}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 10.5, color: "#8C877E", paddingTop: 10, borderTop: "1px solid rgba(244,240,232,.12)" }}>{t("railFooter")}</div>
      </div>
    </aside>
  );
}
