"use client";

// Nav del sitio de marketing (mockup Landing V3): logo, mega-menú "Producto"
// (ATS · HRIS · Nómina · AI Agents), anclas La IA / Seguridad, Precios,
// login, CTA y selector de idioma ES/EN/PT.

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { LogoMark, MIcon, type IconName } from "./icons";

const ARCHIVO = "'Archivo',sans-serif";
const MONO = "'Space Mono',monospace";

type MenuCol = {
  key: "ats" | "hris" | "nomina" | "aiAgents";
  icon: IconName;
  iconBg: string;
  iconColor: string;
  hrefs: string[];
};

const MENU_COLS: MenuCol[] = [
  {
    key: "ats", icon: "search", iconBg: "#DCEFE4", iconColor: "#0E5C4A",
    hrefs: ["/producto/ats", "/producto/ats", "/producto/ats#career", "/producto/ats"],
  },
  {
    key: "hris", icon: "idcard", iconBg: "#E7E0F2", iconColor: "#5A4C86",
    hrefs: ["/producto/hris", "/producto/hris#ficha", "/producto/hris", "/producto/hris"],
  },
  {
    key: "nomina", icon: "card", iconBg: "#EAF7C4", iconColor: "#46540F",
    hrefs: ["/producto/nomina", "/producto/nomina", "/producto/nomina", "/producto/nomina#packs"],
  },
  {
    key: "aiAgents", icon: "pencil", iconBg: "#F8E7C4", iconColor: "#946312",
    hrefs: ["/producto/ai-agents", "/producto/ai-agents", "/producto/ai-agents", "/producto/ai-agents"],
  },
];

const LOCALE_LABELS: Record<Locale, string> = {
  "es-ve": "Español (Venezuela)",
  "en-us": "English (US)",
  "pt-br": "Português (Brasil)",
};

export function MarketingNav() {
  const t = useTranslations("Landing.nav");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Cierra menús al hacer clic fuera (equivalente al closeMenuBg del mockup).
  useEffect(() => {
    if (!menuOpen && !langOpen) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setLangOpen(false);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [menuOpen, langOpen]);

  function switchLocale(next: Locale) {
    setLangOpen(false);
    router.replace(pathname, { locale: next });
  }

  return (
    <div style={{ position: "sticky", top: 0, zIndex: 40, padding: "16px 24px", display: "flex", justifyContent: "center" }}>
      <div ref={rootRef} style={{ width: "100%", maxWidth: 1180, position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, background: "rgba(252,250,246,.97)", border: "1px solid var(--line)", borderRadius: 16, padding: "11px 14px 11px 18px", boxShadow: "0 8px 24px -18px rgba(26,26,23,.5)" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, color: "var(--ink)" }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "2px 2px 0 var(--ink)" }}>
              <LogoMark size={14} />
            </div>
            <span style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 18, letterSpacing: "-.5px" }}>TalentOS</span>
          </Link>

          <div className="site-navlinks" style={{ display: "flex", gap: 4, marginLeft: 14, alignItems: "center" }}>
            <button
              onClick={(e) => { e.stopPropagation(); setLangOpen(false); setMenuOpen((o) => !o); }}
              style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, fontWeight: 600, color: menuOpen ? "#1A1A17" : "#79746B", background: menuOpen ? "#F4F0E8" : "transparent", border: "none", borderRadius: 9, padding: "8px 12px", cursor: "pointer" }}
            >
              {t("product")}
              <span style={{ display: "flex", transition: "transform .15s ease", transform: menuOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                <MIcon name="chevron" size={13} />
              </span>
            </button>
            <a href="#ia" className="ld-link" style={{ fontSize: 14, fontWeight: 600, color: "var(--soft)", padding: "8px 12px" }}>{t("ai")}</a>
            <a href="#seguridad" className="ld-link" style={{ fontSize: 14, fontWeight: 600, color: "var(--soft)", padding: "8px 12px" }}>{t("security")}</a>
            <Link href="/pricing" className="ld-link" style={{ fontSize: 14, fontWeight: 600, color: "var(--soft)", padding: "8px 12px" }}>{t("pricing")}</Link>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            {/* Selector de idioma ES/EN/PT */}
            <div style={{ position: "relative" }}>
              <button
                className="ld-langbtn"
                aria-label="Idioma / Language"
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); setLangOpen((o) => !o); }}
              >
                <MIcon name="globe" size={13} />
                {locale.split("-")[0].toUpperCase()}
                <span style={{ display: "flex", transition: "transform .15s ease", transform: langOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                  <MIcon name="chevron" size={11} />
                </span>
              </button>
              {langOpen && (
                <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, minWidth: 150, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 13, boxShadow: "0 20px 40px -24px rgba(26,26,23,.55)", padding: 6, zIndex: 60 }}>
                  {routing.locales.map((l) => (
                    <button
                      key={l}
                      className="ld-menuitem"
                      onClick={() => switchLocale(l)}
                      style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: "8px 10px", fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, fontWeight: l === locale ? 700 : 600, color: l === locale ? "var(--brand)" : "#54504A", background: "transparent", border: "none", cursor: "pointer" }}
                    >
                      <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: ".5px", color: l === locale ? "var(--brand)" : "var(--soft)", border: "1px solid", borderColor: l === locale ? "#BEE0CE" : "var(--line)", borderRadius: 6, padding: "1px 5px" }}>{(l.split("-")[1] ?? l).toUpperCase()}</span>
                      {LOCALE_LABELS[l]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Link href="/login" className="ld-link" style={{ fontSize: 14, fontWeight: 700, color: "var(--soft)" }}>{t("login")}</Link>
            <a href="#cta" className="ld-hard" style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 13, color: "#fff", background: "var(--accent)", border: "2px solid var(--ink)", borderRadius: 11, padding: "9px 15px", boxShadow: "3px 3px 0 var(--ink)", cursor: "pointer" }}>{t("cta")}</a>
          </div>
        </div>

        {menuOpen && (
          <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", top: 64, left: 0, right: 0, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 18, boxShadow: "0 30px 60px -30px rgba(26,26,23,.55)", padding: 22, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, zIndex: 50 }}>
            {MENU_COLS.map((col) => {
              const items = t.raw(`menu.${col.key}.items`) as string[];
              return (
                <div key={col.key} style={{ padding: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <span style={{ width: 30, height: 30, borderRadius: 9, background: col.iconBg, color: col.iconColor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <MIcon name={col.icon} size={17} />
                    </span>
                    <div>
                      <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 14, lineHeight: 1, color: "var(--ink)" }}>{t(`menu.${col.key}.title`)}</div>
                      <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: ".5px", textTransform: "uppercase", color: "#46540F", marginTop: 4 }}>{t(`menu.${col.key}.tag`)}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    {items.map((label, i) => (
                      <Link key={label} href={col.hrefs[i] ?? col.hrefs[0]} className="ld-menuitem" onClick={() => setMenuOpen(false)} style={{ display: "block", padding: "7px 9px", fontSize: 13, fontWeight: 600, color: "#54504A" }}>
                        {label}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
