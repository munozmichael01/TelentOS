// Página de precios (coming soon) — port del mockup handoff/landing/TalentOS
// Landing V2 - Pricing.dc.html. Server component: el copy sale del namespace
// `Pricing` (messages/{locale}/pricing.json); el formulario de aviso vive en
// components/marketing/pricing-notify-form.tsx (client).

import type { CSSProperties, ReactNode } from "react";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { MarketingNav } from "@/components/marketing/marketing-nav";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { Reveal } from "@/components/marketing/reveal";
import { PricingNotifyForm } from "@/components/marketing/pricing-notify-form";
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
  minHeight: "100vh",
  backgroundColor: "#F4F0E8",
  backgroundImage: "radial-gradient(rgba(26,26,23,.05) 1.2px, transparent 1.2px)",
  backgroundSize: "22px 22px",
  backgroundPosition: "-1px -1px",
} as CSSProperties;

type Promise_ = { title: string; desc: string };

const PROMISE_LOOK: { icon: IconName; iconBg: string; iconColor: string }[] = [
  { icon: "heart", iconBg: "#DCEFE4", iconColor: "#0E5C4A" },
  { icon: "shieldcheck", iconBg: "#EAF7C4", iconColor: "#46540F" },
  { icon: "layers", iconBg: "#E7E0F2", iconColor: "#5A4C86" },
];

const boldTag = { b: (chunks: ReactNode) => <b>{chunks}</b> };

export default function PricingPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const t = useTranslations("Pricing");

  const promises = t.raw("promises.cards") as Promise_[];

  return (
    <div className="ld-root" style={ROOT_STYLE}>
      <MarketingNav />

      {/* ===== COMING SOON ===== */}
      <section style={{ maxWidth: 940, margin: "0 auto", padding: "60px 24px 30px", textAlign: "center" }}>
        <div className="ld-h1" style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "var(--limeSoft)", border: "1px solid #D6E89A", borderRadius: 999, padding: "6px 15px 6px 11px", marginBottom: 26 }}>
          <span className="ld-pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--lime)" }} />
          <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".5px", textTransform: "uppercase", color: "#46540F" }}>{t("hero.badge")}</span>
        </div>
        <h1 className="ld-h1 ld-h1-title" style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 62, lineHeight: 0.95, letterSpacing: "-2.4px", margin: "0 auto", maxWidth: 760 }}>
          {t("hero.title1")}
          <span style={{ fontStyle: "italic", color: "var(--accent)" }}>{t("hero.titleAccent")}</span>
          {t("hero.title2")}
        </h1>
        <p className="ld-h2" style={{ fontSize: 18, lineHeight: 1.55, color: "#54504A", maxWidth: 600, margin: "22px auto 0" }}>{t.rich("hero.subtitle", boldTag)}</p>

        <div id="avisar" className="ld-h3" style={{ maxWidth: 620, margin: "34px auto 0", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, overflow: "hidden", boxShadow: "0 26px 54px -40px rgba(26,26,23,.5)" }}>
          <div className="ld-sheen" style={{ height: 4 }} />
          <div style={{ padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, textAlign: "left" }}>
              <span style={{ width: 38, height: 38, borderRadius: 11, background: "var(--brandSoft)", color: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <MIcon name="mail" size={19} />
              </span>
              <div>
                <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 15 }}>{t("form.title")}</div>
                <div style={{ fontFamily: MONO, fontSize: 10.5, color: "var(--soft)" }}>{t("form.sub")}</div>
              </div>
            </div>
            <PricingNotifyForm />
          </div>
        </div>
      </section>

      {/* ===== LO QUE SÍ SABEMOS ===== */}
      <Reveal style={{ maxWidth: 1000, margin: "0 auto", padding: "30px 24px 20px" }}>
        <div style={{ textAlign: "center", fontFamily: MONO, fontSize: 11.5, letterSpacing: "1px", textTransform: "uppercase", color: "var(--soft)", marginBottom: 18 }}>{t("promises.label")}</div>
        <Reveal as="div" variant="stagger" className="ld-mgrid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
          {promises.map((p, i) => {
            const look = PROMISE_LOOK[i] ?? PROMISE_LOOK[0];
            return (
              <div key={p.title} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 22 }}>
                <span style={{ width: 38, height: 38, borderRadius: 11, background: look.iconBg, color: look.iconColor, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                  <MIcon name={look.icon} size={19} />
                </span>
                <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 16, marginBottom: 6 }}>{p.title}</div>
                <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--soft)", margin: 0 }}>{p.desc}</p>
              </div>
            );
          })}
        </Reveal>
      </Reveal>

      {/* ===== MIENTRAS TANTO ===== */}
      <Reveal style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 24px 70px" }}>
        <div style={{ background: "var(--ink)", color: "#F4F0E8", borderRadius: 20, padding: "30px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
          <div style={{ maxWidth: 520 }}>
            <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "1px", textTransform: "uppercase", color: "var(--lime)", marginBottom: 10 }}>{t("meanwhile.kicker")}</div>
            <div style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 26, lineHeight: 1.1, letterSpacing: "-.8px" }}>{t("meanwhile.title")}</div>
            <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "#B7B2A8", margin: "12px 0 0" }}>{t("meanwhile.body")}</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9, minWidth: 220 }}>
            <Link href="/" className="ld-hard" style={{ textAlign: "center", fontFamily: ARCHIVO, fontWeight: 800, fontSize: 14, color: "var(--ink)", background: "var(--lime)", border: "2px solid #000", borderRadius: 11, padding: "12px 18px", boxShadow: "3px 3px 0 #000" }}>{t("meanwhile.primary")}</Link>
            <Link href="/producto/ai-agents" className="ld-link" style={{ textAlign: "center", fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 600, fontSize: 13, color: "#CFCAC0", padding: 6 }}>{t("meanwhile.secondary")}</Link>
          </div>
        </div>
      </Reveal>

      <MarketingFooter />
    </div>
  );
}
