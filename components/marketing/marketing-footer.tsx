// Footer del sitio de marketing (mockup Landing V3). Server component.

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LogoMark } from "./icons";

const ARCHIVO = "'Archivo',sans-serif";
const MONO = "'Space Mono',monospace";

const colTitleStyle: React.CSSProperties = {
  fontFamily: MONO, fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", color: "#6E6960", marginBottom: 12,
};
const colListStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 9, fontSize: 13 };
const linkStyle: React.CSSProperties = { color: "#A8A39A" };

export function MarketingFooter() {
  const t = useTranslations("Landing.footer");

  return (
    <footer style={{ background: "var(--ink)", color: "#A8A39A", padding: "52px 24px 40px" }}>
      <div className="ld-mgrid" style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 32 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
            <div style={{ width: 26, height: 26, borderRadius: 8, background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <LogoMark size={13} />
            </div>
            <span style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 16, color: "#F4F0E8" }}>TalentOS</span>
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: "#8C877E", margin: 0, maxWidth: 250 }}>{t("tagline")}</p>
        </div>
        <div>
          <div style={colTitleStyle}>{t("colProduct")}</div>
          <div style={colListStyle}>
            <Link href="/producto/ats" style={linkStyle}>{t("ats")}</Link>
            <Link href="/producto/hris" style={linkStyle}>{t("hris")}</Link>
            <Link href="/producto/nomina" style={linkStyle}>{t("nomina")}</Link>
            <Link href="/producto/ai-agents" style={linkStyle}>{t("aiAgents")}</Link>
          </div>
        </div>
        <div>
          <div style={colTitleStyle}>{t("colCompany")}</div>
          <div style={colListStyle}>
            <span className="ld-link" style={{ ...linkStyle, cursor: "pointer" }}>{t("why")}</span>
            <Link href="/pricing" style={linkStyle}>{t("pricing")}</Link>
            <span className="ld-link" style={{ ...linkStyle, cursor: "pointer" }}>{t("resources")}</span>
          </div>
        </div>
        <div>
          <div style={colTitleStyle}>{t("colLegal")}</div>
          <div style={colListStyle}>
            <span className="ld-link" style={{ ...linkStyle, cursor: "pointer" }}>{t("privacy")}</span>
            <span className="ld-link" style={{ ...linkStyle, cursor: "pointer" }}>{t("terms")}</span>
            <a href="#seguridad" style={linkStyle}>{t("security")}</a>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 1180, margin: "32px auto 0", paddingTop: 20, borderTop: "1px solid #38352E", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ fontFamily: MONO, fontSize: 11 }}>{t("copyright")}</div>
        <div style={{ fontFamily: MONO, fontSize: 11 }}>{t("motto")}</div>
      </div>
    </footer>
  );
}
