// Página de producto ATS — port del mockup handoff/landing/TalentOS Landing
// V2 - ATS.dc.html. Server component: copy del namespace `Ats`
// (messages/{locale}/ats.json); las demos interactivas viven en
// components/marketing/ats-demos.tsx.

import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { MarketingNav } from "@/components/marketing/marketing-nav";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { Reveal } from "@/components/marketing/reveal";
import { AtsPipeline, AtsFitRows } from "@/components/marketing/ats-demos";
import { MIcon } from "@/components/marketing/icons";
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
  color: "#1A1A17",
  WebkitFontSmoothing: "antialiased",
  backgroundColor: "#F4F0E8",
  backgroundImage: "radial-gradient(rgba(26,26,23,.05) 1.2px, transparent 1.2px)",
  backgroundSize: "22px 22px",
  backgroundPosition: "-1px -1px",
} as CSSProperties;

// Anchos de barra y color del CPA por canal (el nombre/CPA sale de messages).
const CHANNEL_LOOK = [
  { pct: "78%", cpaColor: "#1B6B4F" },
  { pct: "54%", cpaColor: "#1A1A17" },
  { pct: "38%", cpaColor: "#1B6B4F" },
  { pct: "22%", cpaColor: "#BD4332" },
];

type Channel = { name: string; cpa: string };
type FitRow = { stage: string; breakdown: string[] };
type CareerJob = { title: string; meta: string };

export default function AtsPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const t = useTranslations("Ats");

  const stages = t.raw("demo.stages") as string[];
  const checks = t.raw("distribucion.checks") as string[];
  const channels = t.raw("distribucion.channels") as Channel[];
  const fitRows = t.raw("pipeline.rows") as FitRow[];
  const chips = t.raw("career.chips") as string[];
  const careerJobs = t.raw("career.browser.jobs") as CareerJob[];

  return (
    <div className="ld-root" style={ROOT_STYLE}>
      <MarketingNav />

      {/* ===== HERO ===== */}
      <section id="top" style={{ maxWidth: 1120, margin: "0 auto", padding: "34px 24px 20px" }}>
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "1px", color: "var(--soft)", marginBottom: 20 }}>
          <Link href="/" style={{ color: "var(--soft)" }}>{t("breadcrumb.products")}</Link> / <b style={{ color: "var(--ink)" }}>{t("breadcrumb.current")}</b>
        </div>
        <div className="ld-mgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 44, alignItems: "center" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--brandSoft)", border: "1px solid #BFE0CF", borderRadius: 999, padding: "6px 14px 6px 10px", marginBottom: 20 }}>
              <span style={{ width: 22, height: 22, borderRadius: 7, background: "var(--brand)", color: "var(--lime)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MIcon name="search" size={13} />
              </span>
              <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".5px", textTransform: "uppercase", color: "#0A4638" }}>{t("hero.badge")}</span>
            </div>
            <h1 className="ld-ph1" style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 52, lineHeight: 0.98, letterSpacing: "-2px", margin: 0 }}>
              {t("hero.title1")}
              <span style={{ fontStyle: "italic", color: "var(--accent)" }}>{t("hero.titleAccent")}</span>
              {t("hero.title2")}
            </h1>
            <p style={{ fontSize: 18, lineHeight: 1.55, color: "#54504A", margin: "22px 0 0", maxWidth: 520 }}>{t("hero.subtitle")}</p>
            <div style={{ display: "flex", gap: 13, marginTop: 26, flexWrap: "wrap" }}>
              <a href="#cta" className="ld-hard" style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 15, color: "#fff", background: "var(--accent)", border: "2px solid var(--ink)", borderRadius: 11, padding: "13px 22px", boxShadow: "3px 3px 0 var(--ink)" }}>{t("hero.ctaPrimary")}</a>
              <a href="#career" className="ld-hard" style={{ fontFamily: ARCHIVO, fontWeight: 700, fontSize: 15, color: "var(--ink)", background: "var(--surface)", border: "2px solid var(--ink)", borderRadius: 11, padding: "13px 22px", boxShadow: "3px 3px 0 var(--ink)" }}>{t("hero.ctaSecondary")}</a>
            </div>
          </div>
          <AtsPipeline
            labels={{
              jobTitle: t("demo.jobTitle"),
              jobMeta: t("demo.jobMeta"),
              stages,
              fitPrefix: t("demo.fitPrefix"),
              hiredLabel: t("demo.hiredLabel"),
              hint: t("demo.hint"),
              reset: t("demo.reset"),
              hiredBanner: t("demo.hiredBanner"),
            }}
          />
        </div>
      </section>

      {/* ===== MÓDULO 1: OFERTAS Y DISTRIBUCIÓN ===== */}
      <Reveal style={{ maxWidth: 1120, margin: "0 auto", padding: "44px 24px 20px" }}>
        <div className="ld-mgrid" style={{ display: "grid", gridTemplateColumns: "0.95fr 1.05fr", gap: 44, alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: "2px", textTransform: "uppercase", color: "var(--accent)", marginBottom: 12 }}>{t("distribucion.kicker")}</div>
            <h2 style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 34, lineHeight: 1.02, letterSpacing: "-1.2px", margin: "0 0 14px" }}>
              {t("distribucion.title1")}
              <span style={{ fontStyle: "italic", color: "var(--accent)" }}>{t("distribucion.titleAccent")}</span>
              {t("distribucion.title2")}
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.55, color: "#54504A", margin: "0 0 16px" }}>{t("distribucion.body")}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {checks.map((c) => (
                <div key={c} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <span style={{ display: "inline-flex", width: 20, height: 20, borderRadius: "50%", background: "var(--lime)", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path d="M2.5 6.2l2.3 2.3 4.7-5" stroke="#46540F" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span style={{ fontSize: 14.5, fontWeight: 600 }}>{c}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 22, boxShadow: "0 24px 50px -34px rgba(26,26,23,.4)" }}>
            <div style={{ fontFamily: MONO, fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".8px", color: "var(--soft)", marginBottom: 14 }}>{t("distribucion.panelTitle")}</div>
            {channels.map((ch, i) => {
              const look = CHANNEL_LOOK[i] ?? CHANNEL_LOOK[0];
              return (
                <div key={ch.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                  <span style={{ fontWeight: 700, fontSize: 13, minWidth: 96 }}>{ch.name}</span>
                  <div style={{ flex: 1, height: 7, borderRadius: 999, background: "#EEE9DD", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: look.pct, background: "var(--brand)" }} />
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: look.cpaColor, minWidth: 64, textAlign: "right" }}>{ch.cpa}</span>
                </div>
              );
            })}
            <div style={{ marginTop: 12, fontFamily: MONO, fontSize: 9.5, color: "var(--soft)" }}>{t("distribucion.panelFoot")}</div>
          </div>
        </div>
      </Reveal>

      {/* ===== MÓDULO 2: PIPELINE CON FIT ===== */}
      <Reveal style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 24px" }}>
        <div className="ld-mgrid" style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 20, padding: 32, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "center" }}>
          <div style={{ order: 2 }}>
            <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: "2px", textTransform: "uppercase", color: "var(--accent)", marginBottom: 12 }}>{t("pipeline.kicker")}</div>
            <h2 style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 34, lineHeight: 1.02, letterSpacing: "-1.2px", margin: "0 0 14px" }}>
              {t("pipeline.title1")}
              <span style={{ fontStyle: "italic", color: "var(--accent)" }}>{t("pipeline.titleAccent")}</span>
              {t("pipeline.title2")}
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.55, color: "#54504A", margin: "0 0 16px" }}>{t("pipeline.body")}</p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "var(--limeSoft)", border: "1px solid #D6E89A", borderRadius: 11, padding: "9px 14px", color: "#46540F" }}>
              <MIcon name="shield" size={15} />
              <span style={{ fontSize: 13.5, fontWeight: 700, color: "#46540F" }}>{t("pipeline.badge")}</span>
            </div>
          </div>
          <div style={{ order: 1 }}>
            <AtsFitRows labels={{ breakdownLabel: t("pipeline.breakdownLabel"), rows: fitRows }} />
          </div>
        </div>
      </Reveal>

      {/* ===== MÓDULO 3: CAREER SITE ===== */}
      <Reveal id="career" style={{ maxWidth: 1120, margin: "0 auto", padding: "20px 24px 20px" }}>
        <div className="ld-mgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1.05fr", gap: 44, alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: "2px", textTransform: "uppercase", color: "var(--accent)", marginBottom: 12 }}>{t("career.kicker")}</div>
            <h2 style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 34, lineHeight: 1.02, letterSpacing: "-1.2px", margin: "0 0 14px" }}>
              {t("career.title1")}
              <span style={{ fontStyle: "italic", color: "var(--accent)" }}>{t("career.titleAccent")}</span>
              {t("career.title2")}
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.55, color: "#54504A", margin: "0 0 16px" }}>
              {t("career.bodyPre")}
              <span style={{ fontFamily: MONO, fontSize: 13.5, background: "#F8F4EB", border: "1px solid var(--line)", borderRadius: 6, padding: "1px 7px" }}>{t("career.bodyCode")}</span>
              {t("career.bodyPost")}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {chips.map((c) => (
                <span key={c} style={{ fontSize: 12, fontWeight: 600, background: "#F8F4EB", color: "#54504A", border: "1px solid var(--line)", borderRadius: 999, padding: "5px 11px" }}>{c}</span>
              ))}
            </div>
          </div>
          <div style={{ background: "#F8F4EB", border: "1px solid var(--line)", borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 50px -34px rgba(26,26,23,.4)" }}>
            <div style={{ height: 36, display: "flex", alignItems: "center", gap: 7, padding: "0 14px", borderBottom: "1px solid var(--line)", background: "var(--surface)" }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#E6A2A2" }} />
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#EBCB8E" }} />
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#A9D3B4" }} />
              <span style={{ margin: "0 auto", fontFamily: MONO, fontSize: 11, color: "var(--soft)", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 7, padding: "3px 14px" }}>{t("career.browser.url")}</span>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{ width: 46, height: 46, borderRadius: 13, background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ARCHIVO, fontWeight: 900, color: "var(--lime)", fontSize: 20 }}>V</div>
                <div>
                  <div style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 19, letterSpacing: "-.4px" }}>{t("career.browser.title")}</div>
                  <div style={{ fontSize: 12.5, color: "var(--soft)" }}>{t("career.browser.sub")}</div>
                </div>
              </div>
              {careerJobs.map((job) => (
                <div key={job.title} style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: "13px 14px", marginBottom: 9 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 14.5 }}>{job.title}</div>
                    <div style={{ fontFamily: MONO, fontSize: 11, color: "var(--soft)", marginTop: 3 }}>{job.meta}</div>
                  </div>
                  <span style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 12, color: "#fff", background: "var(--accent)", borderRadius: 9, padding: "8px 14px" }}>{t("career.browser.apply")}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>

      {/* ===== BRIDGE + CTA ===== */}
      <section id="cta" style={{ background: "var(--brand)", color: "#fff", padding: "64px 24px", marginTop: 34 }}>
        <div style={{ maxWidth: 820, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 42, lineHeight: 1, letterSpacing: "-1.6px", margin: 0 }}>
            {t("cta.title1")}
            <span style={{ fontStyle: "italic", color: "var(--lime)" }}>{t("cta.titleAccent")}</span>
            {t("cta.title2")}
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.55, color: "#CDE5DC", margin: "18px auto 26px", maxWidth: 520 }}>{t("cta.body")}</p>
          <div style={{ display: "flex", gap: 13, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/#cta" className="ld-hard" style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 15, color: "var(--ink)", background: "var(--lime)", border: "2px solid #000", borderRadius: 11, padding: "13px 24px", boxShadow: "3px 3px 0 #000" }}>{t("cta.primary")}</Link>
            <Link href="/producto/hris" className="ld-hard" style={{ fontFamily: ARCHIVO, fontWeight: 700, fontSize: 15, color: "#fff", background: "transparent", border: "2px solid rgba(255,255,255,.5)", borderRadius: 11, padding: "13px 24px" }}>{t("cta.secondary")}</Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
