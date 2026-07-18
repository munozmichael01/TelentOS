// Página de producto HRIS — port del mockup handoff/landing/TalentOS Landing
// V2 - HRIS.dc.html. Server component: copy del namespace `Hris`
// (messages/{locale}/hris.json); las demos interactivas viven en
// components/marketing/hris-demos.tsx.

import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { MarketingNav } from "@/components/marketing/marketing-nav";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { Reveal } from "@/components/marketing/reveal";
import { HrisDirectory, HrisOrgNode } from "@/components/marketing/hris-demos";
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

// Iconos y colores de las filas de tiempo (nombre/desc/status salen de messages).
const TIME_LOOK: { icon: IconName; iconBg: string; iconColor: string; stColor: string; stBg: string }[] = [
  { icon: "cal", iconBg: "#DCEFE4", iconColor: "#0E5C4A", stColor: "#0E5C4A", stBg: "#DCEFE4" },
  { icon: "clock", iconBg: "#EAF7C4", iconColor: "#46540F", stColor: "#1B6B4F", stBg: "#DCEFE3" },
  { icon: "grid", iconBg: "#E7E0F2", iconColor: "#5A4C86", stColor: "#1B6B4F", stBg: "#DCEFE3" },
];

type Person = { role: string; tag: string; fields: { g: string; v: string }[] };
type Group = { name: string; fields: string };
type Stat = { big: string; small: string };
type TimeRow = { name: string; desc: string; status: string };
type OrgReport = { role: string };

export default function HrisPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const t = useTranslations("Hris");

  const people = t.raw("demo.people") as Person[];
  const groups = t.raw("ficha.groups") as Group[];
  const onbChips = t.raw("onb.chips") as string[];
  const orgChips = t.raw("org.chips") as string[];
  const orgReports = t.raw("org.reports") as OrgReport[];
  const stats = t.raw("tiempo.stats") as Stat[];
  const timeRows = t.raw("tiempo.rows") as TimeRow[];

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
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#EFEAF7", border: "1px solid #D8CEEC", borderRadius: 999, padding: "6px 14px 6px 10px", marginBottom: 20 }}>
              <span style={{ width: 22, height: 22, borderRadius: 7, background: "#5A4C86", color: "#EFEAF7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MIcon name="idcard" size={13} />
              </span>
              <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".5px", textTransform: "uppercase", color: "#463A6B" }}>{t("hero.badge")}</span>
            </div>
            <h1 className="ld-ph1" style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 52, lineHeight: 0.98, letterSpacing: "-2px", margin: 0 }}>
              {t("hero.title1")}
              <span style={{ fontStyle: "italic", color: "var(--accent)" }}>{t("hero.titleAccent")}</span>
              {t("hero.title2")}
            </h1>
            <p style={{ fontSize: 18, lineHeight: 1.55, color: "#54504A", margin: "22px 0 0", maxWidth: 520 }}>{t("hero.subtitle")}</p>
            <div style={{ display: "flex", gap: 13, marginTop: 26, flexWrap: "wrap" }}>
              <a href="#cta" className="ld-hard" style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 15, color: "#fff", background: "var(--accent)", border: "2px solid var(--ink)", borderRadius: 11, padding: "13px 22px", boxShadow: "3px 3px 0 var(--ink)" }}>{t("hero.ctaPrimary")}</a>
              <a href="#ficha" className="ld-hard" style={{ fontFamily: ARCHIVO, fontWeight: 700, fontSize: 15, color: "var(--ink)", background: "var(--surface)", border: "2px solid var(--ink)", borderRadius: 11, padding: "13px 22px", boxShadow: "3px 3px 0 var(--ink)" }}>{t("hero.ctaSecondary")}</a>
            </div>
          </div>
          <HrisDirectory
            labels={{
              header: t("demo.header"),
              meta: t("demo.meta"),
              hint: t("demo.hint"),
              back: t("demo.back"),
              note: t("demo.note"),
              people,
            }}
          />
        </div>
      </section>

      {/* ===== MÓDULO 1: FICHA RICA ===== */}
      <Reveal id="ficha" style={{ maxWidth: 1120, margin: "0 auto", padding: "44px 24px 20px" }}>
        <div className="ld-mgrid" style={{ display: "grid", gridTemplateColumns: "0.95fr 1.05fr", gap: 44, alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: "2px", textTransform: "uppercase", color: "var(--accent)", marginBottom: 12 }}>{t("ficha.kicker")}</div>
            <h2 style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 34, lineHeight: 1.02, letterSpacing: "-1.2px", margin: "0 0 14px" }}>
              {t("ficha.title1")}
              <span style={{ fontStyle: "italic", color: "var(--accent)" }}>{t("ficha.titleAccent")}</span>
              {t("ficha.title2")}
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.55, color: "#54504A", margin: "0 0 16px" }}>{t("ficha.body")}</p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "var(--limeSoft)", border: "1px solid #D6E89A", borderRadius: 11, padding: "9px 14px", color: "#46540F" }}>
              <MIcon name="shield" size={15} />
              <span style={{ fontSize: 13.5, fontWeight: 700, color: "#46540F" }}>{t("ficha.badge")}</span>
            </div>
          </div>
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 22, boxShadow: "0 24px 50px -34px rgba(26,26,23,.4)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, paddingBottom: 14, borderBottom: "1px solid var(--line)" }}>
              <span style={{ width: 44, height: 44, borderRadius: 12, background: "var(--brand)", color: "var(--lime)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ARCHIVO, fontWeight: 900, fontSize: 15 }}>IM</span>
              <div>
                <div style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 16, letterSpacing: "-.3px" }}>Isabel Moreno</div>
                <div style={{ fontSize: 12, color: "var(--soft)" }}>{t("ficha.cardRole")}</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
              {groups.map((g) => (
                <div key={g.name} style={{ background: "#F8F4EB", border: "1px solid var(--line)", borderRadius: 11, padding: "11px 12px" }}>
                  <div style={{ fontFamily: MONO, fontSize: 8.5, textTransform: "uppercase", letterSpacing: ".5px", color: "var(--brand)", marginBottom: 6 }}>{g.name}</div>
                  <div style={{ fontSize: 11.5, color: "#54504A", lineHeight: 1.4 }}>{g.fields}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>

      {/* ===== MÓDULO 2: ONBOARDING + ORGANIGRAMA ===== */}
      <Reveal style={{ maxWidth: 1120, margin: "0 auto", padding: "20px 24px" }}>
        <div className="ld-mgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className="ld-card" style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 26 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--brandSoft)", color: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <MIcon name="clipcheck" size={22} />
            </div>
            <h3 style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 21, letterSpacing: "-.4px", margin: "0 0 8px" }}>{t("onb.title")}</h3>
            <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--soft)", margin: "0 0 14px" }}>{t("onb.body")}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {onbChips.map((c) => (
                <span key={c} style={{ fontSize: 12, fontWeight: 600, background: "#F8F4EB", color: "#54504A", border: "1px solid var(--line)", borderRadius: 999, padding: "5px 11px" }}>{c}</span>
              ))}
            </div>
          </div>
          <div className="ld-card" style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 26 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#E7E0F2", color: "#5A4C86", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <MIcon name="org" size={22} />
            </div>
            <h3 style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 21, letterSpacing: "-.4px", margin: "0 0 8px" }}>{t("org.title")}</h3>
            <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--soft)", margin: "0 0 14px" }}>{t("org.body")}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 14 }}>
              {orgChips.map((c) => (
                <span key={c} style={{ fontSize: 12, fontWeight: 600, background: "#F8F4EB", color: "#54504A", border: "1px solid var(--line)", borderRadius: 999, padding: "5px 11px" }}>{c}</span>
              ))}
            </div>
            <HrisOrgNode labels={{ rootMeta: t("org.rootMeta"), reports: orgReports }} />
          </div>
        </div>
      </Reveal>

      {/* ===== MÓDULO 3: TIEMPO ===== */}
      <Reveal style={{ maxWidth: 1120, margin: "0 auto", padding: "20px 24px" }}>
        <div className="ld-mgrid" style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 20, padding: 32, display: "grid", gridTemplateColumns: "1fr 1.05fr", gap: 40, alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: "2px", textTransform: "uppercase", color: "var(--accent)", marginBottom: 12 }}>{t("tiempo.kicker")}</div>
            <h2 style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 32, lineHeight: 1.02, letterSpacing: "-1.2px", margin: "0 0 14px" }}>
              {t("tiempo.title1")}
              <span style={{ fontStyle: "italic", color: "var(--accent)" }}>{t("tiempo.titleAccent")}</span>
              {t("tiempo.title2")}
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.55, color: "#54504A", margin: "0 0 16px" }}>{t("tiempo.body")}</p>
            <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
              {stats.map((s, i) => (
                <div key={s.big}>
                  <div style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 26, letterSpacing: "-1px", color: i === 1 ? "var(--accent)" : "var(--ink)" }}>{s.big}</div>
                  <div style={{ fontFamily: MONO, fontSize: 10.5, color: "var(--soft)" }}>{s.small}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {timeRows.map((row, i) => {
              const look = TIME_LOOK[i] ?? TIME_LOOK[0];
              return (
                <div key={row.name} style={{ display: "flex", alignItems: "center", gap: 12, background: "#F8F4EB", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px" }}>
                  <span style={{ width: 30, height: 30, borderRadius: 9, background: look.iconBg, color: look.iconColor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <MIcon name={look.icon} size={16} />
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{row.name}</div>
                    <div style={{ fontSize: 12, color: "var(--soft)" }}>{row.desc}</div>
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", color: look.stColor, background: look.stBg, borderRadius: 999, padding: "3px 9px" }}>{row.status}</span>
                </div>
              );
            })}
          </div>
        </div>
      </Reveal>

      {/* ===== CTA ===== */}
      <section id="cta" style={{ background: "var(--brand)", color: "#fff", padding: "64px 24px", marginTop: 34 }}>
        <div style={{ maxWidth: 820, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 42, lineHeight: 1, letterSpacing: "-1.6px", margin: 0 }}>
            {t("cta.title1")}
            <span style={{ fontStyle: "italic", color: "var(--lime)" }}>{t("cta.titleAccent")}</span>
            {t("cta.title2")}
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.55, color: "#CDE5DC", margin: "18px auto 26px", maxWidth: 520 }}>{t("cta.body")}</p>
          <div style={{ display: "flex", gap: 13, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/#cta" className="ld-hard" style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 15, color: "var(--ink)", background: "var(--lime)", border: "2px solid #000", borderRadius: 11, padding: "13px 24px", boxShadow: "3px 3px 0 #000" }}>{t("cta.primary")}</a>
            <Link href="/producto/nomina" className="ld-hard" style={{ fontFamily: ARCHIVO, fontWeight: 700, fontSize: 15, color: "#fff", background: "transparent", border: "2px solid rgba(255,255,255,.5)", borderRadius: 11, padding: "13px 24px" }}>{t("cta.secondary")}</Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
