// Página de producto AI Agents (tema oscuro) — port del mockup
// handoff/landing/TalentOS Landing V2 - AI Agents.dc.html. Server component:
// copy del namespace `Ai` (messages/{locale}/ai.json); la demo en streaming
// vive en components/marketing/ai-demo.tsx.
//
// Invariante de producto que esta página comunica y respeta: los agentes
// preparan y proponen; la decisión es siempre humana.

import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { MarketingNav } from "@/components/marketing/marketing-nav";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { Reveal } from "@/components/marketing/reveal";
import { AiStreamDemo } from "@/components/marketing/ai-demo";
import { MIcon, type IconName } from "@/components/marketing/icons";
import { Link } from "@/i18n/navigation";
import "@/components/marketing/marketing.css";

const ARCHIVO = "'Archivo',sans-serif";
const MONO = "'Space Mono',monospace";

const ROOT_STYLE = {
  "--brand": "#0E5C4A",
  "--accent": "#F1543F",
  "--lime": "#C6F24E",
  "--ink": "#1A1A17",
  "--soft": "#79746B",
  "--line": "#E7E1D4",
  "--surface": "#FCFAF6",
  "--bg": "#F4F0E8",
  "--brandSoft": "#DCEFE4",
  "--limeSoft": "#EAF7C4",
  fontFamily: "'Hanken Grotesk',system-ui,sans-serif",
  color: "#F4F0E8",
  WebkitFontSmoothing: "antialiased",
  background: "#1A1A17",
} as CSSProperties;

// Icono y tipo de badge de cada agente (nombre/desc/badge salen de messages).
const AGENT_ICONS: IconName[] = ["pencil", "globe", "extract", "search", "chart", "spark", "clipcheck"];
const AGENT_KINDS: ("ia" | "mix")[] = ["ia", "ia", "ia", "mix", "mix", "mix", "ia"];

const BADGE_STYLE: Record<"ia" | "mix", CSSProperties> = {
  ia: { color: "#C6F24E", background: "rgba(198,242,78,.12)", border: "1px solid rgba(198,242,78,.3)" },
  mix: { color: "#E4E0D8", background: "rgba(244,240,232,.08)", border: "1px solid rgba(244,240,232,.2)" },
};

type Chip = { key: string; label: string };
type Stream = { name: string; where: string; texts: Record<string, string> };
type InvariantRow = { tag: string; text: string };
type ProcRow = { tag: string; text: string };
type AgentCard = { name: string; where: string; desc: string; badge: string };

export default function AiAgentsPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const t = useTranslations("Ai");

  const tasks = t.raw("demo.tasks") as Chip[];
  const tones = t.raw("demo.tones") as Chip[];
  const streams = t.raw("demo.streams") as Record<string, Stream>;
  const invariants = t.raw("invariante.rows") as InvariantRow[];
  const procRows = t.raw("invariante.procRows") as ProcRow[];
  const agents = t.raw("agents.cards") as AgentCard[];

  return (
    <div className="ld-root" style={ROOT_STYLE}>
      <MarketingNav />

      {/* ===== HERO ===== */}
      <section id="top" style={{ maxWidth: 1120, margin: "0 auto", padding: "40px 24px 20px", textAlign: "center" }}>
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "1px", color: "#8C877E", marginBottom: 20 }}>
          <Link href="/" style={{ color: "#8C877E" }}>{t("breadcrumb.products")}</Link> / <b style={{ color: "#F4F0E8" }}>{t("breadcrumb.current")}</b>
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(198,242,78,.1)", border: "1px solid rgba(198,242,78,.3)", borderRadius: 999, padding: "6px 14px 6px 10px", marginBottom: 22 }}>
          <span style={{ width: 22, height: 22, borderRadius: 7, background: "rgba(198,242,78,.18)", color: "#C6F24E", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <MIcon name="pencil" size={13} />
          </span>
          <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".5px", textTransform: "uppercase", color: "#C6F24E" }}>{t("hero.badge")}</span>
        </div>
        <h1 className="ld-ph1" style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 58, lineHeight: 0.96, letterSpacing: "-2.2px", margin: "0 auto", maxWidth: 840 }}>
          {t("hero.title1")}
          <span style={{ fontStyle: "italic", color: "var(--lime)" }}>{t("hero.titleAccent")}</span>
          {t("hero.title2")}
        </h1>
        <p style={{ fontSize: 18, lineHeight: 1.55, color: "#B7B2A8", maxWidth: 640, margin: "22px auto 0" }}>{t("hero.subtitle")}</p>
        <div style={{ display: "flex", gap: 13, justifyContent: "center", marginTop: 28, flexWrap: "wrap" }}>
          <a href="#cta" className="ld-hard" style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 15, color: "var(--ink)", background: "var(--lime)", border: "2px solid #000", borderRadius: 11, padding: "13px 24px", boxShadow: "3px 3px 0 #000" }}>{t("hero.ctaPrimary")}</a>
          <a href="#agents" className="ld-hard" style={{ fontFamily: ARCHIVO, fontWeight: 700, fontSize: 15, color: "#F4F0E8", background: "transparent", border: "2px solid rgba(244,240,232,.4)", borderRadius: 11, padding: "13px 24px" }}>{t("hero.ctaSecondary")}</a>
        </div>
      </section>

      {/* ===== DEMO EN VIVO ===== */}
      <Reveal style={{ maxWidth: 1120, margin: "0 auto", padding: "8px 24px 20px" }}>
        <div style={{ background: "#1F1D19", border: "1px solid #38352E", borderRadius: 20, padding: "30px 32px" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 22 }}>
            <div>
              <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: "2px", textTransform: "uppercase", color: "var(--lime)", marginBottom: 10 }}>{t("demo.kicker")}</div>
              <h2 style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 30, lineHeight: 1.02, letterSpacing: "-1.2px", margin: 0 }}>
                {t("demo.title1")}
                <span style={{ fontStyle: "italic", color: "var(--lime)" }}>{t("demo.titleAccent")}</span>
                {t("demo.title2")}
              </h2>
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: MONO, fontSize: 10.5, color: "#C6F24E", background: "rgba(198,242,78,.1)", border: "1px solid rgba(198,242,78,.3)", borderRadius: 999, padding: "6px 12px" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--lime)" }} />
              {t("demo.liveBadge")}
            </div>
          </div>

          <AiStreamDemo
            tasks={tasks}
            tones={tones}
            streams={streams}
            labels={{
              taskLabel: t("demo.taskLabel"),
              toneLabel: t("demo.toneLabel"),
              regenerate: t("demo.regenerate"),
              generating: t("demo.generating"),
              iaBadge: t("demo.iaBadge"),
              toneMeta: t.raw("demo.toneMeta") as string,
              use: t("demo.use"),
              discard: t("demo.discard"),
              disclaimerPre: t("demo.disclaimerPre"),
              disclaimerAccent: t("demo.disclaimerAccent"),
              disclaimerPost: t("demo.disclaimerPost"),
            }}
          />
        </div>
      </Reveal>

      {/* ===== INVARIANTE + PROCEDENCIA ===== */}
      <Reveal style={{ maxWidth: 1120, margin: "0 auto", padding: "34px 24px 8px" }}>
        <div className="ld-mgrid" style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 16, alignItems: "stretch" }}>
          <div style={{ background: "#1F1D19", border: "1px solid #38352E", borderRadius: 18, padding: 24 }}>
            <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--lime)", marginBottom: 16 }}>{t("invariante.kicker")}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {invariants.map((v) => (
                <div key={v.tag} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: "var(--ink)", background: "var(--lime)", borderRadius: 7, padding: "3px 9px", fontWeight: 700, flexShrink: 0 }}>{v.tag}</span>
                  <span style={{ fontSize: 14.5, color: "#CFCAC0", lineHeight: 1.5 }}>{v.text}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: "#26241F", border: "1px solid #38352E", borderRadius: 18, padding: 24 }}>
            <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 16, marginBottom: 6 }}>{t("invariante.procTitle")}</div>
            <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "#B7B2A8", margin: "0 0 16px" }}>{t("invariante.procBody")}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {procRows.map((row, i) => (
                <div key={row.tag} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontFamily: MONO, fontSize: 10, borderRadius: 999, padding: "3px 10px", ...BADGE_STYLE[i === 0 ? "ia" : "mix"] }}>{row.tag}</span>
                  <span style={{ fontSize: 13, color: "#B7B2A8" }}>{row.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>

      {/* ===== AGENTES ===== */}
      <Reveal id="agents" style={{ maxWidth: 1120, margin: "0 auto", padding: "36px 24px" }}>
        <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: "2px", textTransform: "uppercase", color: "var(--lime)", marginBottom: 12 }}>{t("agents.kicker")}</div>
        <h2 style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 38, lineHeight: 1, letterSpacing: "-1.5px", margin: "0 0 26px", maxWidth: 720 }}>
          {t("agents.title1")}
          <span style={{ fontStyle: "italic", color: "var(--lime)" }}>{t("agents.titleAccent")}</span>
          {t("agents.title2")}
        </h2>
        <Reveal as="div" variant="stagger" className="ld-mgrid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
          {agents.map((a, i) => {
            const kind = AGENT_KINDS[i] ?? "ia";
            return (
              <div key={a.name} className="ld-agent" style={{ background: "#1F1D19", border: "1px solid #38352E", borderRadius: 16, padding: 22 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <span style={{ width: 40, height: 40, borderRadius: 11, background: "rgba(198,242,78,.14)", color: "var(--lime)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <MIcon name={AGENT_ICONS[i] ?? "pencil"} size={19} />
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 9, borderRadius: 999, padding: "2px 8px", ...BADGE_STYLE[kind] }}>{a.badge}</span>
                </div>
                <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: ".5px", textTransform: "uppercase", color: "#8C877E", marginBottom: 5 }}>{a.where}</div>
                <h3 style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 17, margin: "0 0 7px", color: "#F4F0E8" }}>{a.name}</h3>
                <p style={{ fontSize: 13, lineHeight: 1.5, color: "#B7B2A8", margin: 0 }}>{a.desc}</p>
              </div>
            );
          })}
        </Reveal>
      </Reveal>

      {/* ===== CTA ===== */}
      <section id="cta" style={{ background: "var(--brand)", color: "#fff", padding: "64px 24px", marginTop: 24 }}>
        <div style={{ maxWidth: 820, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 42, lineHeight: 1, letterSpacing: "-1.6px", margin: 0 }}>
            {t("cta.title1")}
            <span style={{ fontStyle: "italic", color: "var(--lime)" }}>{t("cta.titleAccent")}</span>
            {t("cta.title2")}
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.55, color: "#CDE5DC", margin: "18px auto 26px", maxWidth: 520 }}>{t("cta.body")}</p>
          <div style={{ display: "flex", gap: 13, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/#cta" className="ld-hard" style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 15, color: "var(--ink)", background: "var(--lime)", border: "2px solid #000", borderRadius: 11, padding: "13px 24px", boxShadow: "3px 3px 0 #000" }}>{t("cta.primary")}</Link>
            <Link href="/" className="ld-hard" style={{ fontFamily: ARCHIVO, fontWeight: 700, fontSize: 15, color: "#fff", background: "transparent", border: "2px solid rgba(255,255,255,.5)", borderRadius: 11, padding: "13px 24px" }}>{t("cta.secondary")}</Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
