"use client";

// Formulario "avísame cuando haya precios" (mockup Landing V2 · Pricing).
// Como CtaForm, el envío es local (estado "sent") — no hay endpoint de waitlist.

import { useState } from "react";
import { useTranslations } from "next-intl";

const ARCHIVO = "'Archivo',sans-serif";

export function PricingNotifyForm() {
  const t = useTranslations("Pricing.form");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 11, background: "var(--brandSoft)", border: "1px solid #BEE0CE", borderRadius: 12, padding: "14px 16px", textAlign: "left" }}>
        <span style={{ width: 32, height: 32, borderRadius: 10, background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12l5 5 9-11" stroke="#0E5C4A" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <div>
          <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 14, color: "#0A4638" }}>{t("sentTitle")}</div>
          <div style={{ fontSize: 13, color: "#2C5247" }}>{t("sentBody", { email })}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
      <input
        className="ld-in"
        style={{ flex: 1, minWidth: 200 }}
        name="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t("placeholder")}
      />
      <button
        onClick={() => setSent(true)}
        className="ld-hard"
        style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 14, color: "#fff", background: "var(--accent)", border: "2px solid var(--ink)", borderRadius: 11, padding: "12px 20px", boxShadow: "3px 3px 0 var(--ink)", cursor: "pointer", whiteSpace: "nowrap" }}
      >
        {t("submit")}
      </button>
    </div>
  );
}
