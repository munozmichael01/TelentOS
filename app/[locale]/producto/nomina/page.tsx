// Landing de producto · Nómina — port del mockup handoff/landing/TalentOS
// Landing V2 - Nomina.dc.html. Server component: el copy sale del namespace
// `Nomina` (messages/{locale}/nomina.json); el desglose interactivo por país
// vive en components/marketing/pay-breakdown.tsx (client).
// Honestidad: cálculo + recibos + corridas + compliance por país. Sin banca.

import type { CSSProperties, ReactNode } from "react";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { MarketingNav } from "@/components/marketing/marketing-nav";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { Reveal } from "@/components/marketing/reveal";
import { PayBreakdown } from "@/components/marketing/pay-breakdown";
import { MIcon } from "@/components/marketing/icons";
import { PackIcon } from "@/components/ui/pack-icons";
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
  "--warnBg": "#F8E7C4",
  "--warnText": "#946312",
  "--successBg": "#DCEFE3",
  "--successText": "#1B6B4F",
  fontFamily: "'Hanken Grotesk',system-ui,sans-serif",
  color: "#1A1A17",
  WebkitFontSmoothing: "antialiased",
  backgroundColor: "#F4F0E8",
  backgroundImage: "radial-gradient(rgba(26,26,23,.05) 1.2px, transparent 1.2px)",
  backgroundSize: "22px 22px",
  backgroundPosition: "-1px -1px",
} as CSSProperties;

type RunLine = { ini: string; name: string; detail: string; gross: string };
type Role = { name: string; scope: string; note?: string };
type PackKind = "active" | "preview" | "soon";
type PackCard = { key: string; kind: PackKind; name: string; status: string; desc: string; tags: string[] };

// Estados del ciclo de la corrida (colores del mockup, por índice).
const STATE_LOOK = [
  { bg: "#EEE9DD", color: "#79746B" },
  { bg: "#F8E7C4", color: "#946312" },
  { bg: "#DCEFE3", color: "#1B6B4F" },
  { bg: "#DCEFE4", color: "#0E5C4A" },
  { bg: "#1A1A17", color: "#C6F24E" },
];

const ROLE_LOOK = [
  { color: "#0E5C4A", bg: "#DCEFE4", dim: false },
  { color: "#0E5C4A", bg: "#DCEFE4", dim: false },
  { color: "#946312", bg: "#F8E7C4", dim: true },
];

const PACK_LOOK: Record<PackKind, { stColor: string; stBg: string; stBorder: string; borderCard: string; opacity: number }> = {
  active: { stColor: "#1B6B4F", stBg: "#DCEFE3", stBorder: "#B7D9C4", borderCard: "#BEE0CE", opacity: 1 },
  preview: { stColor: "#946312", stBg: "#F8E7C4", stBorder: "#EBD4A0", borderCard: "#E7E1D4", opacity: 1 },
  soon: { stColor: "#79746B", stBg: "#EEE9DD", stBorder: "#DAD3C5", borderCard: "#E7E1D4", opacity: 0.62 },
};

const boldTag = { b: (chunks: ReactNode) => <b>{chunks}</b> };

function LimeCheck() {
  return (
    <span style={{ display: "inline-flex", width: 20, height: 20, borderRadius: "50%", background: "var(--lime)", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M2.5 6.2l2.3 2.3 4.7-5" stroke="#46540F" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export default function NominaPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const t = useTranslations("Nomina");

  const runLines = t.raw("hero.runLines") as RunLine[];
  const checks = t.raw("motor.checks") as string[];
  const states = t.raw("corridas.states") as string[];
  const roles = t.raw("corridas.roles") as Role[];
  const receiptsChips = t.raw("modulos.receiptsChips") as string[];
  const compChips = t.raw("modulos.compChips") as string[];
  const packs = t.raw("packs.cards") as PackCard[];

  return (
    <div className="ld-root" style={ROOT_STYLE}>
      <MarketingNav />

      {/* ===== PRODUCT HERO ===== */}
      <section id="top" style={{ maxWidth: 1120, margin: "0 auto", padding: "34px 24px 20px" }}>
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "1px", color: "var(--soft)", marginBottom: 20 }}>
          <Link href="/" style={{ color: "var(--soft)" }}>{t("breadcrumb.products")}</Link> / <b style={{ color: "var(--ink)" }}>{t("breadcrumb.current")}</b>
        </div>
        <div className="ld-mgrid" style={{ display: "grid", gridTemplateColumns: "1.02fr 0.98fr", gap: 44, alignItems: "center" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--brandSoft)", border: "1px solid #BFE0CF", borderRadius: 999, padding: "6px 14px 6px 10px", marginBottom: 20 }}>
              <span style={{ width: 22, height: 22, borderRadius: 7, background: "var(--brand)", color: "var(--lime)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MIcon name="card" size={13} />
              </span>
              <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".5px", textTransform: "uppercase", color: "#0A4638" }}>{t("hero.badge")}</span>
            </div>
            <h1 className="ld-h1-title" style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 52, lineHeight: 0.98, letterSpacing: "-2px", margin: 0 }}>
              {t("hero.title1")}
              <span style={{ fontStyle: "italic", color: "var(--accent)" }}>{t("hero.titleAccent")}</span>
              {t("hero.title2")}
            </h1>
            <p style={{ fontSize: 18, lineHeight: 1.55, color: "#54504A", margin: "22px 0 0", maxWidth: 520 }}>{t("hero.subtitle")}</p>
            <div style={{ display: "flex", gap: 13, marginTop: 26, flexWrap: "wrap" }}>
              <a href="#cta" className="ld-hard" style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 15, color: "#fff", background: "var(--accent)", border: "2px solid var(--ink)", borderRadius: 11, padding: "13px 22px", boxShadow: "3px 3px 0 var(--ink)" }}>{t("hero.ctaPrimary")}</a>
              <a href="#packs" className="ld-hard" style={{ fontFamily: ARCHIVO, fontWeight: 700, fontSize: 15, color: "var(--ink)", background: "var(--surface)", border: "2px solid var(--ink)", borderRadius: 11, padding: "13px 22px", boxShadow: "3px 3px 0 var(--ink)" }}>{t("hero.ctaSecondary")}</a>
            </div>
          </div>

          {/* hero mock: corrida */}
          <div style={{ border: "1px solid var(--line)", borderRadius: 16, background: "var(--surface)", boxShadow: "0 40px 80px -48px rgba(26,26,23,.55)", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px 18px", borderBottom: "1px solid var(--line)", background: "#F8F4EB" }}>
              <div>
                <div style={{ fontFamily: MONO, fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".8px", color: "var(--soft)" }}>{t("hero.runKicker")}</div>
                <div style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 16, letterSpacing: "-.3px", marginTop: 3 }}>{t("hero.runCompany")}</div>
              </div>
              <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", color: "var(--warnText)", background: "var(--warnBg)", borderRadius: 999, padding: "4px 11px" }}>{t("hero.runStatus")}</span>
            </div>
            <div style={{ padding: "6px 18px" }}>
              {runLines.map((l) => (
                <div key={l.ini} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
                  <span style={{ width: 30, height: 30, borderRadius: 9, background: "#EAE4D6", color: "#5A564E", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ARCHIVO, fontWeight: 800, fontSize: 11, flexShrink: 0 }}>{l.ini}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{l.name}</div>
                    <div style={{ fontFamily: MONO, fontSize: 10.5, color: "var(--soft)" }}>{l.detail}</div>
                  </div>
                  <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 13, textAlign: "right" }}>{l.gross}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: "#F8F4EB", borderTop: "1px solid var(--line)" }}>
              <span style={{ fontFamily: MONO, fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".5px", color: "var(--soft)" }}>{t("hero.runTotalLabel")}</span>
              <span style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 17, letterSpacing: "-.4px" }}>{t("hero.runTotal")}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== HONESTY BANNER ===== */}
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "22px 24px" }}>
        <div className="ld-mgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, color: "var(--successText)" }}>
              <MIcon name="check" size={16} />
              <span style={{ fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: ".8px", color: "var(--successText)" }}>{t("honesty.doesLabel")}</span>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.55, color: "#4A463F", margin: 0 }}>{t.rich("honesty.does", boldTag)}</p>
          </div>
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, color: "var(--warnText)" }}>
              <MIcon name="alert" size={16} />
              <span style={{ fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: ".8px", color: "var(--warnText)" }}>{t("honesty.notLabel")}</span>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.55, color: "#4A463F", margin: 0 }}>{t.rich("honesty.not", boldTag)}</p>
          </div>
        </div>
      </section>

      {/* ===== MÓDULO 1: MOTOR DE CÁLCULO ===== */}
      <Reveal style={{ maxWidth: 1120, margin: "0 auto", padding: "44px 24px 20px" }}>
        <div className="ld-mgrid" style={{ display: "grid", gridTemplateColumns: "0.95fr 1.05fr", gap: 44, alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: "2px", textTransform: "uppercase", color: "var(--accent)", marginBottom: 12 }}>{t("motor.kicker")}</div>
            <h2 style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 34, lineHeight: 1.02, letterSpacing: "-1.2px", margin: "0 0 14px" }}>
              {t("motor.title1")}
              <span style={{ fontStyle: "italic", color: "var(--accent)" }}>{t("motor.titleAccent")}</span>
              {t("motor.title2")}
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.55, color: "#54504A", margin: "0 0 16px" }}>{t("motor.body")}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {checks.map((c) => (
                <div key={c} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <LimeCheck />
                  <span style={{ fontSize: 14.5, fontWeight: 600 }}>{c}</span>
                </div>
              ))}
            </div>
          </div>
          <PayBreakdown />
        </div>
      </Reveal>

      {/* ===== MÓDULO 2: CORRIDAS + RBAC ===== */}
      <Reveal style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 24px" }}>
        <div className="ld-mgrid" style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 20, padding: 32, display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 40, alignItems: "center" }}>
          <div style={{ order: 2 }}>
            <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: "2px", textTransform: "uppercase", color: "var(--accent)", marginBottom: 12 }}>{t("corridas.kicker")}</div>
            <h2 style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 34, lineHeight: 1.02, letterSpacing: "-1.2px", margin: "0 0 14px" }}>
              {t("corridas.title1")}
              <span style={{ fontStyle: "italic", color: "var(--accent)" }}>{t("corridas.titleAccent")}</span>
              {t("corridas.title2")}
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.55, color: "#54504A", margin: "0 0 16px" }}>{t("corridas.body")}</p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "var(--limeSoft)", border: "1px solid #D6E89A", borderRadius: 11, padding: "9px 14px", color: "#46540F" }}>
              <MIcon name="shield" size={15} />
              <span style={{ fontSize: 13.5, fontWeight: 700, color: "#46540F" }}>{t("corridas.badge")}</span>
            </div>
          </div>
          <div style={{ order: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
              {states.map((s, i) => {
                const look = STATE_LOOK[i] ?? STATE_LOOK[0];
                return (
                  <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 700, borderRadius: 999, padding: "5px 11px", background: look.bg, color: look.color }}>{s}</span>
                    {i < states.length - 1 && <span style={{ color: "var(--soft)", fontSize: 11 }}>→</span>}
                  </span>
                );
              })}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {roles.map((r, i) => {
                const look = ROLE_LOOK[i] ?? ROLE_LOOK[0];
                return (
                  <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 11, background: "#F8F4EB", border: "1px solid var(--line)", borderRadius: 11, padding: "11px 13px", opacity: look.dim ? 0.72 : 1 }}>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: look.color, background: look.bg, borderRadius: 7, padding: "3px 8px", minWidth: 78, textAlign: "center" }}>{r.name}</span>
                    <span style={{ fontSize: 13, color: "#54504A" }}>
                      {r.scope}
                      {r.note && <span style={{ fontFamily: MONO, fontSize: 9, color: "var(--soft)" }}> {r.note}</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Reveal>

      {/* ===== MÓDULO 3: RECIBOS + MÓDULO 4: COMPENSACIÓN ===== */}
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "12px 24px" }}>
        <div className="ld-mgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className="ld-card" style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 26 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--brandSoft)", color: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <MIcon name="doc" size={22} />
            </div>
            <h3 style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 21, letterSpacing: "-.4px", margin: "0 0 8px" }}>{t("modulos.receiptsTitle")}</h3>
            <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--soft)", margin: "0 0 14px" }}>{t("modulos.receiptsDesc")}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {receiptsChips.map((c) => (
                <span key={c} style={{ fontSize: 12, fontWeight: 600, background: "#F8F4EB", color: "#54504A", border: "1px solid var(--line)", borderRadius: 999, padding: "5px 11px" }}>{c}</span>
              ))}
            </div>
          </div>
          <div className="ld-card" style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 26 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#E7E0F2", color: "#5A4C86", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <MIcon name="chart" size={22} />
            </div>
            <h3 style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 21, letterSpacing: "-.4px", margin: "0 0 8px" }}>{t("modulos.compTitle")}</h3>
            <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--soft)", margin: "0 0 14px" }}>{t.rich("modulos.compDesc", boldTag)}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {compChips.map((c) => (
                <span key={c} style={{ fontSize: 12, fontWeight: 600, background: "#F8F4EB", color: "#54504A", border: "1px solid var(--line)", borderRadius: 999, padding: "5px 11px" }}>{c}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== MÓDULO 5: COMPLIANCE POR PAÍS (honesto) ===== */}
      <Reveal id="packs" style={{ maxWidth: 1120, margin: "0 auto", padding: "44px 24px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 8 }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: "2px", textTransform: "uppercase", color: "var(--accent)", marginBottom: 12 }}>{t("packs.kicker")}</div>
            <h2 style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 34, lineHeight: 1.02, letterSpacing: "-1.2px", margin: 0, maxWidth: 640 }}>
              {t("packs.title1")}
              <span style={{ fontStyle: "italic", color: "var(--accent)" }}>{t("packs.titleAccent")}</span>
              {t("packs.title2")}
            </h2>
          </div>
          <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--soft)", maxWidth: 340 }}>{t("packs.intro")}</p>
        </div>
        <div className="ld-mgrid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginTop: 24 }}>
          {packs.map((p) => {
            const look = PACK_LOOK[p.kind] ?? PACK_LOOK.soon;
            return (
              <div key={p.key} style={{ background: "var(--surface)", border: `1px solid ${look.borderCard}`, borderRadius: 16, padding: 20, opacity: look.opacity }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <PackIcon code={p.key} />
                    <span style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 16 }}>{p.name}</span>
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", color: look.stColor, background: look.stBg, border: `1px solid ${look.stBorder}`, borderRadius: 999, padding: "3px 9px" }}>{p.status}</span>
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--soft)", margin: "0 0 12px", minHeight: 38 }}>{p.desc}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {p.tags.map((tag) => (
                    <span key={tag} style={{ fontFamily: MONO, fontSize: 10, color: "#6C675F", background: "#F4F0E8", border: "1px solid var(--line)", borderRadius: 6, padding: "3px 7px" }}>{tag}</span>
                  ))}
                </div>
                {p.kind === "preview" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 13, paddingTop: 12, borderTop: "1px solid var(--line)", fontFamily: MONO, fontSize: 10, color: "var(--warnText)" }}>
                    <MIcon name="alert" size={13} />
                    {t("packs.previewNote")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 16, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: "16px 18px", display: "flex", gap: 13, alignItems: "flex-start" }}>
          <span style={{ flexShrink: 0, marginTop: 1, color: "var(--brand)", display: "flex" }}>
            <MIcon name="doc" size={18} />
          </span>
          <div style={{ fontSize: 13.5, lineHeight: 1.55, color: "#4A463F" }}>{t.rich("packs.exports", boldTag)}</div>
        </div>
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
