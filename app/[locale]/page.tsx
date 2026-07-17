// Landing pública de TalentOS — port del mockup handoff/landing/TalentOS
// Landing V3.dc.html. Server component: todo el copy sale del namespace
// `Landing` (messages/{locale}/landing.json); las piezas interactivas viven
// en components/marketing/ como client components.

import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { MarketingNav } from "@/components/marketing/marketing-nav";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { Reveal } from "@/components/marketing/reveal";
import { HeroDemo } from "@/components/marketing/hero-demo";
import { DataTravel } from "@/components/marketing/data-travel";
import { CtaForm } from "@/components/marketing/cta-form";
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
  color: "#1A1A17",
  WebkitFontSmoothing: "antialiased",
  backgroundColor: "#F4F0E8",
  backgroundImage: "radial-gradient(rgba(26,26,23,.05) 1.2px, transparent 1.2px)",
  backgroundSize: "22px 22px",
  backgroundPosition: "-1px -1px",
} as CSSProperties;

const LOGOS = ["Northwind", "Vértice", "Lumina", "Caldera", "Mistral"];
const TOOL_DOTS = ["#0E5C4A", "#946312", "#5A4C86", "#C7402E", "#0E5C4A", "#946312", "#5A4C86"];

const AGENT_ICONS: IconName[] = ["doc", "building", "user", "chart"];

const ROLE_LOOK = [
  { color: "#0E5C4A", bg: "#DCEFE4", border: "#BEE0CE" },
  { color: "#0E5C4A", bg: "#DCEFE4", border: "#BEE0CE" },
  { color: "#C7402E", bg: "#FAE3DE", border: "#F2C4B9" },
  { color: "#5A4C86", bg: "#E7E0F2", border: "#D3C7EC" },
  { color: "#946312", bg: "#F8E7C4", border: "#EBD4A0" },
];

const MATURITY_LOOK: { icon: IconName; iconBg: string; iconColor: string }[] = [
  { icon: "search", iconBg: "#DCEFE4", iconColor: "#0E5C4A" },
  { icon: "idcard", iconBg: "#E7E0F2", iconColor: "#5A4C86" },
  { icon: "card", iconBg: "#EAF7C4", iconColor: "#46540F" },
  { icon: "doc", iconBg: "#F8E7C4", iconColor: "#946312" },
];

const AUDIENCE_LOOK: { icon: IconName; iconBg: string; iconColor: string; checkBg: string; checkColor: string }[] = [
  { icon: "chart", iconBg: "#DCEFE4", iconColor: "#0E5C4A", checkBg: "#DCEFE4", checkColor: "#0E5C4A" },
  { icon: "user", iconBg: "#F6E0D9", iconColor: "#C7402E", checkBg: "#FAE3DE", checkColor: "#C7402E" },
];

type Agent = { title: string; desc: string };
type Invariant = { label: string; text: string };
type Audience = { title: string; points: string[] };
type Role = { name: string; scope: string };
type MaturityCard = { title: string; desc: string; status: "prod" | "preview" };

export default function LandingPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const t = useTranslations("Landing");

  const tools = t.raw("problema.tools") as string[];
  const agents = t.raw("ia.agents") as Agent[];
  const invariants = t.raw("ia.invariants") as Invariant[];
  const audiences = t.raw("audiencias.cards") as Audience[];
  const roles = t.raw("seguridad.roles") as Role[];
  const maturity = t.raw("estado.cards") as MaturityCard[];

  return (
    <div className="ld-root" style={ROOT_STYLE}>
      <MarketingNav />

      {/* ===== HERO ===== */}
      <section className="hero-sec" style={{ maxWidth: 1120, margin: "0 auto", padding: "52px 24px 26px", textAlign: "center" }}>
        <div className="ld-h1" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--limeSoft)", border: "1px solid #D6E89A", borderRadius: 999, padding: "6px 14px 6px 10px", marginBottom: 22 }}>
          <span className="ld-blink" style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--lime)" }} />
          <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".5px", textTransform: "uppercase", color: "#46540F" }}>{t("hero.badge")}</span>
        </div>
        <h1 className="ld-h1 ld-h1-title" style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 70, lineHeight: 0.94, letterSpacing: "-2.8px", margin: "0 auto", maxWidth: 920 }}>
          {t("hero.title1")}
          <span style={{ fontStyle: "italic", color: "var(--accent)" }}>{t("hero.titleAccent")}</span>
          {t("hero.title2")}
        </h1>
        <p className="ld-h2" style={{ fontSize: 19, lineHeight: 1.55, color: "#54504A", maxWidth: 660, margin: "24px auto 0" }}>{t("hero.subtitle")}</p>
        <div className="ld-h3" style={{ display: "flex", gap: 13, justifyContent: "center", marginTop: 28, flexWrap: "wrap" }}>
          <a href="#cta" className="ld-hard" style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 15, color: "#fff", background: "var(--accent)", border: "2px solid var(--ink)", borderRadius: 11, padding: "14px 24px", boxShadow: "3px 3px 0 var(--ink)", cursor: "pointer" }}>{t("hero.ctaPrimary")}</a>
          <a href="#plataforma" className="ld-hard" style={{ fontFamily: ARCHIVO, fontWeight: 700, fontSize: 15, color: "var(--ink)", background: "var(--surface)", border: "2px solid var(--ink)", borderRadius: 11, padding: "14px 24px", boxShadow: "3px 3px 0 var(--ink)", cursor: "pointer" }}>{t("hero.ctaSecondary")}</a>
        </div>
        <div className="ld-h3" style={{ fontFamily: MONO, fontSize: 12, color: "var(--soft)", marginTop: 16 }}>{t("hero.tagline")}</div>

        <HeroDemo />
      </section>

      {/* ===== TRUST STRIP ===== */}
      <Reveal style={{ maxWidth: 1180, margin: "0 auto", padding: "22px 24px 8px" }}>
        <div style={{ textAlign: "center", fontFamily: MONO, fontSize: 11.5, letterSpacing: "1px", textTransform: "uppercase", color: "var(--soft)", marginBottom: 16 }}>
          {t("trust.label")} <span style={{ color: "#B0AAA0" }}>{t("trust.note")}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 38, flexWrap: "wrap", opacity: 0.55 }}>
          {LOGOS.map((n) => (
            <div key={n} style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 21, letterSpacing: "-.5px", color: "var(--soft)" }}>{n}</div>
          ))}
        </div>
      </Reveal>

      {/* ===== PROBLEMA ===== */}
      <Reveal style={{ maxWidth: 1180, margin: "0 auto", padding: "56px 24px" }}>
        <h2 style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 44, lineHeight: 1, letterSpacing: "-1.6px", margin: "0 0 14px", maxWidth: 760 }}>
          {t("problema.title1")}
          <span style={{ fontStyle: "italic" }}>{t("problema.titleAccent")}</span>
          {t("problema.title2")}
        </h2>
        <p style={{ fontSize: 16.5, lineHeight: 1.55, color: "var(--soft)", maxWidth: 680, margin: "0 0 30px" }}>{t("problema.subtitle")}</p>
        <div className="ld-mgrid" style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: 16, alignItems: "stretch" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 9, alignContent: "flex-start", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 18, padding: 22 }}>
            <div style={{ width: "100%", fontFamily: MONO, fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", color: "var(--soft)", marginBottom: 4 }}>{t("problema.stackLabel")}</div>
            {tools.map((label, i) => (
              <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13.5, fontWeight: 600, color: "#54504A", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 10, padding: "8px 12px" }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: TOOL_DOTS[i] ?? "#0E5C4A" }} />
                {label}
              </span>
            ))}
          </div>
          <div style={{ background: "var(--ink)", color: "#F4F0E8", borderRadius: 18, padding: 26, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: "1px", textTransform: "uppercase", color: "var(--lime)", marginBottom: 12 }}>{t("problema.costKicker")}</div>
            <p style={{ fontSize: 17, lineHeight: 1.5, margin: 0, fontWeight: 500 }}>
              {t("problema.cost1")}
              <b style={{ color: "var(--lime)" }}>{t("problema.costAccent")}</b>
              {t("problema.cost2")}
            </p>
            <p style={{ fontSize: 14, lineHeight: 1.5, margin: "14px 0 0", color: "#B7B2A8" }}>{t("problema.costFoot")}</p>
          </div>
        </div>
      </Reveal>

      {/* ===== PROPUESTA + DATO QUE VIAJA ===== */}
      <Reveal id="plataforma" style={{ maxWidth: 1180, margin: "0 auto", padding: "44px 24px 24px" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: "2px", textTransform: "uppercase", color: "var(--brand)", marginBottom: 12 }}>{t("plataforma.kicker")}</div>
          <h2 style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 46, lineHeight: 1, letterSpacing: "-1.8px", margin: "0 auto 14px", maxWidth: 760 }}>
            {t("plataforma.title1")}
            <span style={{ fontStyle: "italic", color: "var(--accent)" }}>{t("plataforma.titleAccent")}</span>
            {t("plataforma.title2")}
          </h2>
          <p style={{ fontSize: 16.5, color: "var(--soft)", maxWidth: 640, margin: "0 auto 40px" }}>{t("plataforma.subtitle")}</p>
        </div>
        <DataTravel />
      </Reveal>

      {/* ===== 3 PILARES ===== */}
      <Reveal style={{ maxWidth: 1180, margin: "0 auto", padding: "48px 24px" }}>
        <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: "2px", textTransform: "uppercase", color: "var(--brand)", marginBottom: 12 }}>{t("pilares.kicker")}</div>
        <h2 style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 38, lineHeight: 1, letterSpacing: "-1.4px", margin: "0 0 30px", maxWidth: 640 }}>
          {t("pilares.title1")}
          <span style={{ fontStyle: "italic", color: "var(--accent)" }}>{t("pilares.titleAccent")}</span>
          {t("pilares.title2")}
        </h2>
        <Reveal as="div" variant="stagger" className="ld-mgrid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
          {/* ATS */}
          <Link href="/producto/ats" className="ld-card" style={{ display: "flex", flexDirection: "column", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 18, overflow: "hidden", color: "var(--ink)" }}>
            <div style={{ height: 206, overflow: "hidden", borderBottom: "1px solid var(--line)", background: "var(--bg)", padding: "14px 14px 0" }}>
              <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "10px 10px 0 0", padding: "14px 15px", height: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 17, letterSpacing: "-.5px" }}>{t("pilares.previews.atsTitle")}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: "#fff", background: "var(--accent)", border: "1.5px solid var(--ink)", borderRadius: 8, padding: "5px 9px", boxShadow: "2px 2px 0 var(--ink)" }}>{t("pilares.previews.newJob")}</span>
                </div>
                <div style={{ display: "flex", gap: 6, marginBottom: 11 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: "#fff", background: "var(--brand)", borderRadius: 7, padding: "4px 9px" }}>{t("pilares.previews.chipAll")}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--soft)", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 7, padding: "4px 9px" }}>{t("pilares.previews.chipActive")}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--soft)", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 7, padding: "4px 9px" }}>{t("pilares.previews.chipTech")}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 11, padding: "9px 11px", marginBottom: 8 }}>
                  <span style={{ width: 30, height: 30, borderRadius: 8, background: "#DCEFE4", color: "#0E5C4A", fontFamily: ARCHIVO, fontWeight: 800, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>PD</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                      {t("pilares.previews.job1")} <span style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 700, color: "#46540F", background: "var(--limeSoft)", borderRadius: 5, padding: "1px 5px" }}>{t("pilares.previews.iaBadge")}</span>
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--soft)" }}>{t("pilares.previews.job1Meta")}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>{t("pilares.previews.job1Salary")}</div>
                    <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--soft)" }}>{t("pilares.previews.job1Cands")}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 11, padding: "9px 11px" }}>
                  <span style={{ width: 30, height: 30, borderRadius: 8, background: "#F6E0D9", color: "#C7402E", fontFamily: ARCHIVO, fontWeight: 800, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>AE</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 13 }}>{t("pilares.previews.job2")}</div>
                    <div style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--soft)" }}>{t("pilares.previews.job2Meta")}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>{t("pilares.previews.job2Salary")}</div>
                    <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--soft)" }}>{t("pilares.previews.job2Cands")}</div>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ padding: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
                <span style={{ width: 34, height: 34, borderRadius: 10, background: "#DCEFE4", color: "#0E5C4A", display: "flex", alignItems: "center", justifyContent: "center" }}><MIcon name="search" size={17} /></span>
                <div>
                  <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 18, lineHeight: 1 }}>{t("pilares.ats.title")}</div>
                  <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: ".5px", textTransform: "uppercase", color: "var(--soft)", marginTop: 4 }}>{t("pilares.ats.tag")}</div>
                </div>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.55, color: "var(--soft)", margin: "0 0 14px" }}>{t("pilares.ats.desc")}</p>
              <span style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 12.5, color: "var(--brand)" }}>{t("pilares.link")}</span>
            </div>
          </Link>

          {/* HRIS */}
          <Link href="/producto/hris" className="ld-card" style={{ display: "flex", flexDirection: "column", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 18, overflow: "hidden", color: "var(--ink)" }}>
            <div style={{ height: 206, overflow: "hidden", borderBottom: "1px solid var(--line)", background: "var(--bg)", padding: "14px 14px 0" }}>
              <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "10px 10px 0 0", padding: "14px 15px", height: "100%" }}>
                <div style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 17, letterSpacing: "-.5px", marginBottom: 11 }}>{t("pilares.previews.hrisTitle")}</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "linear-gradient(90deg,#0E5C4A,#2C4E63)", color: "#fff", borderRadius: 11, padding: "11px 13px", marginBottom: 11 }}>
                  <div>
                    <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 12.5 }}>{t("pilares.previews.onbTitle")}</div>
                    <div style={{ fontSize: 10.5, color: "#CDE5DC" }}>{t("pilares.previews.onbSub")}</div>
                  </div>
                  <span style={{ fontSize: 10.5, fontWeight: 800, color: "var(--ink)", background: "var(--lime)", borderRadius: 8, padding: "6px 11px" }}>{t("pilares.previews.onbCta")}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 11, padding: "8px 11px", marginBottom: 8 }}>
                  <span style={{ width: 30, height: 30, borderRadius: "50%", background: "#DCEFE4", color: "#0E5C4A", fontFamily: ARCHIVO, fontWeight: 800, fontSize: 10.5, display: "flex", alignItems: "center", justifyContent: "center" }}>AR</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 12.5 }}>{t("pilares.previews.emp1")}</div>
                    <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--soft)" }}>{t("pilares.previews.emp1Meta")}</div>
                  </div>
                  <div style={{ textAlign: "right", fontFamily: MONO, fontSize: 8.5, color: "var(--soft)", textTransform: "uppercase" }}>
                    {t("pilares.previews.reportsTo")}
                    <div style={{ color: "var(--ink)", fontWeight: 700, fontSize: 10, textTransform: "none" }}>{t("pilares.previews.emp1Boss")}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 11, padding: "8px 11px" }}>
                  <span style={{ width: 30, height: 30, borderRadius: "50%", background: "#F8E7C4", color: "#946312", fontFamily: ARCHIVO, fontWeight: 800, fontSize: 10.5, display: "flex", alignItems: "center", justifyContent: "center" }}>AO</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 12.5 }}>{t("pilares.previews.emp2")}</div>
                    <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--soft)" }}>{t("pilares.previews.emp2Meta")}</div>
                  </div>
                  <div style={{ textAlign: "right", fontFamily: MONO, fontSize: 8.5, color: "var(--soft)", textTransform: "uppercase" }}>
                    {t("pilares.previews.reportsTo")}
                    <div style={{ color: "var(--ink)", fontWeight: 700, fontSize: 10, textTransform: "none" }}>{t("pilares.previews.emp2Boss")}</div>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ padding: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
                <span style={{ width: 34, height: 34, borderRadius: 10, background: "#E7E0F2", color: "#5A4C86", display: "flex", alignItems: "center", justifyContent: "center" }}><MIcon name="idcard" size={17} /></span>
                <div>
                  <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 18, lineHeight: 1 }}>{t("pilares.hris.title")}</div>
                  <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: ".5px", textTransform: "uppercase", color: "var(--soft)", marginTop: 4 }}>{t("pilares.hris.tag")}</div>
                </div>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.55, color: "var(--soft)", margin: "0 0 14px" }}>{t("pilares.hris.desc")}</p>
              <span style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 12.5, color: "var(--brand)" }}>{t("pilares.link")}</span>
            </div>
          </Link>

          {/* NÓMINA */}
          <Link href="/producto/nomina" className="ld-card" style={{ display: "flex", flexDirection: "column", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 18, overflow: "hidden", color: "var(--ink)" }}>
            <div style={{ height: 206, overflow: "hidden", borderBottom: "1px solid var(--line)", background: "var(--bg)", padding: "14px 14px 0" }}>
              <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "10px 10px 0 0", padding: "14px 15px", height: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 17, letterSpacing: "-.5px" }}>{t("pilares.previews.payTitle")}</span>
                  <span style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 700, color: "#0E5C4A", background: "#DCEFE4", border: "1px solid #BEE0CE", borderRadius: 999, padding: "4px 9px" }}>{t("pilares.previews.payStatus")}</span>
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", background: "var(--ink)", color: "#F4F0E8", borderRadius: 11, padding: "12px 14px", marginBottom: 11 }}>
                  <div>
                    <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: ".5px", textTransform: "uppercase", color: "#B7B2A8" }}>{t("pilares.previews.payCostLabel")}</div>
                    <div style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 22, letterSpacing: "-.6px" }}>{t("pilares.previews.payCost")}</div>
                  </div>
                  <div style={{ textAlign: "right", fontFamily: MONO, fontSize: 9.5, color: "var(--lime)" }}>{t("pilares.previews.payReceipts")}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 2px" }}>
                  <span style={{ width: 28, height: 28, borderRadius: "50%", background: "#DCEFE4", color: "#0E5C4A", fontFamily: ARCHIVO, fontWeight: 800, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>AM</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 12.5 }}>{t("pilares.previews.pay1")}</div>
                    <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--soft)" }}>{t("pilares.previews.pay1Net")}</div>
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: "#0E5C4A", background: "#DCEFE4", borderRadius: 6, padding: "3px 7px" }}>{t("pilares.previews.receipt")}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 2px", borderTop: "1px solid var(--line)" }}>
                  <span style={{ width: 28, height: 28, borderRadius: "50%", background: "#F8E7C4", color: "#946312", fontFamily: ARCHIVO, fontWeight: 800, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>AO</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 12.5 }}>{t("pilares.previews.pay2")}</div>
                    <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--soft)" }}>{t("pilares.previews.pay2Net")}</div>
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: "#0E5C4A", background: "#DCEFE4", borderRadius: 6, padding: "3px 7px" }}>{t("pilares.previews.receipt")}</span>
                </div>
              </div>
            </div>
            <div style={{ padding: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
                <span style={{ width: 34, height: 34, borderRadius: 10, background: "#EAF7C4", color: "#46540F", display: "flex", alignItems: "center", justifyContent: "center" }}><MIcon name="card" size={17} /></span>
                <div>
                  <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 18, lineHeight: 1 }}>{t("pilares.pay.title")}</div>
                  <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: ".5px", textTransform: "uppercase", color: "var(--soft)", marginTop: 4 }}>{t("pilares.pay.tag")}</div>
                </div>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.55, color: "var(--soft)", margin: "0 0 14px" }}>{t("pilares.pay.desc")}</p>
              <span style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 12.5, color: "var(--brand)" }}>{t("pilares.link")}</span>
            </div>
          </Link>
        </Reveal>
      </Reveal>

      {/* ===== IA AGÉNTICA (dark) ===== */}
      <Reveal id="ia" style={{ background: "var(--ink)", color: "#F4F0E8", padding: "70px 24px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 34 }}>
            <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: "2px", textTransform: "uppercase", color: "var(--lime)", marginBottom: 14 }}>{t("ia.kicker")}</div>
            <h2 style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 48, lineHeight: 0.97, letterSpacing: "-1.8px", margin: "0 auto", maxWidth: 820 }}>
              {t("ia.title1")}
              <span style={{ fontStyle: "italic", color: "var(--lime)" }}>{t("ia.titleAccent")}</span>
              {t("ia.title2")}
            </h2>
            <p style={{ maxWidth: 640, margin: "18px auto 0", fontSize: 16, lineHeight: 1.6, color: "#B7B2A8" }}>{t("ia.subtitle")}</p>
          </div>

          <Reveal as="div" variant="stagger" className="ld-mgrid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
            {agents.map((a, i) => (
              <div key={a.title} style={{ background: "#1F1D19", border: "1px solid #38352E", borderRadius: 16, padding: 20 }}>
                <span style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(198,242,78,.14)", color: "var(--lime)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                  <MIcon name={AGENT_ICONS[i] ?? "pencil"} size={17} />
                </span>
                <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 15, marginBottom: 6 }}>{a.title}</div>
                <p style={{ fontSize: 13, lineHeight: 1.5, color: "#B7B2A8", margin: 0 }}>{a.desc}</p>
              </div>
            ))}
          </Reveal>

          <div className="ld-mgrid" style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 16, alignItems: "stretch" }}>
            <div style={{ background: "linear-gradient(150deg,#22201B,#1B1A16)", border: "1px solid #38352E", borderRadius: 18, padding: 26, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ display: "inline-flex", alignSelf: "flex-start", alignItems: "center", gap: 8, fontFamily: MONO, fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", color: "var(--lime)", background: "rgba(198,242,78,.1)", border: "1px solid rgba(198,242,78,.3)", borderRadius: 999, padding: "5px 12px", marginBottom: 16 }}>
                <MIcon name="shield" size={13} />
                {t("ia.trustBadge")}
              </div>
              <div style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 28, lineHeight: 1.15, letterSpacing: "-1px" }}>
                {t("ia.trustTitle1")}
                <span style={{ color: "var(--lime)" }}>{t("ia.trustAccent")}</span>
                {t("ia.trustTitle2")}
              </div>
              <p style={{ fontSize: 15, lineHeight: 1.6, color: "#B7B2A8", margin: "14px 0 0" }}>{t("ia.trustBody")}</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11, justifyContent: "center" }}>
              {invariants.map((v) => (
                <div key={v.label} style={{ display: "flex", gap: 14, alignItems: "flex-start", background: "#26241F", border: "1px solid #38352E", borderRadius: 14, padding: "16px 18px" }}>
                  <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: "var(--lime)", width: 86, flexShrink: 0, paddingTop: 2 }}>{v.label}</span>
                  <span style={{ fontSize: 14, color: "#D6D2C8", lineHeight: 1.45 }}>{v.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>

      {/* ===== DOBLE AUDIENCIA ===== */}
      <Reveal style={{ maxWidth: 1180, margin: "0 auto", padding: "64px 24px 40px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: "2px", textTransform: "uppercase", color: "var(--accent)", marginBottom: 12 }}>{t("audiencias.kicker")}</div>
          <h2 style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 40, lineHeight: 1, letterSpacing: "-1.5px", margin: 0 }}>
            {t("audiencias.title1")}
            <span style={{ fontStyle: "italic" }}>{t("audiencias.titleAccent")}</span>
            {t("audiencias.title2")}
          </h2>
        </div>
        <div className="ld-mgrid" style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
          {audiences.map((au, i) => {
            const look = AUDIENCE_LOOK[i] ?? AUDIENCE_LOOK[0];
            return (
              <div key={au.title} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 18, padding: 28 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 20 }}>
                  <span style={{ width: 40, height: 40, borderRadius: 11, background: look.iconBg, color: look.iconColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <MIcon name={look.icon} size={19} />
                  </span>
                  <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 20 }}>{au.title}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {au.points.map((pt) => (
                    <div key={pt} style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true">
                        <circle cx="12" cy="12" r="10" fill={look.checkBg} />
                        <path d="M8 12.5l2.5 2.5 5-5.5" stroke={look.checkColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span style={{ fontSize: 14.5, lineHeight: 1.45, color: "#54504A" }}>{pt}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Reveal>

      {/* ===== SEGURIDAD ===== */}
      <Reveal id="seguridad" style={{ maxWidth: 1180, margin: "0 auto", padding: "40px 24px" }}>
        <div className="ld-mgrid" style={{ display: "grid", gridTemplateColumns: "0.95fr 1.05fr", gap: 44, alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: "2px", textTransform: "uppercase", color: "var(--brand)", marginBottom: 12 }}>{t("seguridad.kicker")}</div>
            <h2 style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 40, lineHeight: 1.02, letterSpacing: "-1.5px", margin: "0 0 14px" }}>
              {t("seguridad.title1")}
              <span style={{ fontStyle: "italic", color: "var(--accent)" }}>{t("seguridad.titleAccent")}</span>
              {t("seguridad.title2")}
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.6, color: "#54504A", margin: "0 0 16px" }}>{t("seguridad.body")}</p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "var(--brandSoft)", border: "1px solid #BEE0CE", borderRadius: 11, padding: "9px 14px", color: "#0E5C4A" }}>
              <MIcon name="shield" size={15} />
              <span style={{ fontSize: 13.5, fontWeight: 700, color: "#0E5C4A" }}>{t("seguridad.badge")}</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {roles.map((r, i) => {
              const look = ROLE_LOOK[i] ?? ROLE_LOOK[0];
              return (
                <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 14, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 13, padding: "13px 16px" }}>
                  <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: look.color, background: look.bg, border: `1px solid ${look.border}`, borderRadius: 8, padding: "5px 10px", flexShrink: 0, minWidth: 96, textAlign: "center" }}>{r.name}</span>
                  <span style={{ fontSize: 13.5, color: "#54504A", lineHeight: 1.4 }}>{r.scope}</span>
                </div>
              );
            })}
          </div>
        </div>
      </Reveal>

      {/* ===== ESTADO Y MADUREZ ===== */}
      <Reveal id="estado" style={{ maxWidth: 1180, margin: "0 auto", padding: "56px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: MONO, fontSize: 11, textTransform: "uppercase", letterSpacing: "1px", color: "#46540F", background: "var(--limeSoft)", border: "1px solid #D6E89A", borderRadius: 999, padding: "6px 14px", marginBottom: 16 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--lime)" }} />
            {t("estado.badge")}
          </div>
          <h2 style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 40, lineHeight: 1, letterSpacing: "-1.5px", margin: "0 auto 12px", maxWidth: 640 }}>
            {t("estado.title1")}
            <span style={{ fontStyle: "italic", color: "var(--accent)" }}>{t("estado.titleAccent")}</span>
            {t("estado.title2")}
          </h2>
          <p style={{ fontSize: 16, color: "var(--soft)", maxWidth: 640, margin: "0 auto" }}>{t("estado.body")}</p>
        </div>
        <Reveal as="div" variant="stagger" className="ld-mgrid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {maturity.map((m, i) => {
            const look = MATURITY_LOOK[i] ?? MATURITY_LOOK[0];
            const prod = m.status === "prod";
            const stColor = prod ? "#0E5C4A" : "#946312";
            return (
              <div key={m.title} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 22 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <span style={{ width: 34, height: 34, borderRadius: 10, background: look.iconBg, color: look.iconColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <MIcon name={look.icon} size={17} />
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: MONO, fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", color: stColor, background: prod ? "#DCEFE4" : "#F8E7C4", border: `1px solid ${prod ? "#BEE0CE" : "#EBD4A0"}`, borderRadius: 999, padding: "4px 9px" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: stColor }} />
                    {prod ? t("estado.statusProd") : t("estado.statusPreview")}
                  </span>
                </div>
                <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 16, marginBottom: 6 }}>{m.title}</div>
                <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--soft)", margin: 0 }}>{m.desc}</p>
              </div>
            );
          })}
        </Reveal>
      </Reveal>

      {/* ===== CTA FINAL ===== */}
      <Reveal id="cta" style={{ background: "var(--brand)", color: "#fff", padding: "72px 24px", marginTop: 24 }}>
        <div className="ld-mgrid" style={{ maxWidth: 960, margin: "0 auto", display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 48, alignItems: "center" }}>
          <div>
            <h2 style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 44, lineHeight: 1.0, letterSpacing: "-1.8px", margin: 0 }}>
              {t("cta.title1")}
              <span style={{ fontStyle: "italic", color: "var(--lime)" }}>{t("cta.titleAccent")}</span>
              {t("cta.title2")}
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.55, color: "#CDE5DC", margin: "20px 0 0", maxWidth: 400 }}>{t("cta.body")}</p>
            <div style={{ display: "flex", gap: 20, marginTop: 24, flexWrap: "wrap" }}>
              {[t("cta.check1"), t("cta.check2")].map((c) => (
                <div key={c} style={{ display: "flex", alignItems: "center", gap: 8, color: "#C6F24E" }}>
                  <MIcon name="check" size={16} />
                  <span style={{ fontSize: 13.5, color: "#CDE5DC" }}>{c}</span>
                </div>
              ))}
            </div>
          </div>
          <CtaForm />
        </div>
      </Reveal>

      <MarketingFooter />
    </div>
  );
}
