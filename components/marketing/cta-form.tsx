"use client";

// Formulario de acceso anticipado (mockup Landing V3). Igual que en v1,
// el envío es local (estado "sent") — no hay endpoint de waitlist todavía.

import { useState } from "react";
import { useTranslations } from "next-intl";

const ARCHIVO = "'Archivo',sans-serif";
const MONO = "'Space Mono',monospace";

const labelStyle: React.CSSProperties = {
  fontFamily: MONO, fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".5px", color: "var(--soft)", display: "block", marginBottom: 6,
};

export function CtaForm() {
  const t = useTranslations("Landing.cta");
  const [form, setForm] = useState({ name: "", company: "", email: "" });
  const [sent, setSent] = useState(false);

  function onField(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  return (
    <div style={{ background: "var(--surface)", borderRadius: 20, padding: 28, boxShadow: "0 30px 60px -30px rgba(0,0,0,.5)" }}>
      {sent ? (
        <div style={{ textAlign: "center", padding: "24px 8px", color: "var(--ink)" }}>
          <div style={{ width: 54, height: 54, borderRadius: 16, background: "var(--limeSoft)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 12l5 5 9-11" stroke="#46540F" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 20 }}>{t("sentTitle")}</div>
          <div style={{ fontSize: 14, color: "var(--soft)", marginTop: 6 }}>{t("sentBody", { email: form.email })}</div>
        </div>
      ) : (
        <div style={{ color: "var(--ink)" }}>
          <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 18, marginBottom: 16 }}>{t("formTitle")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            <div>
              <label style={labelStyle}>{t("nameLabel")}</label>
              <input className="ld-in" name="name" value={form.name} onChange={onField} placeholder={t("namePlaceholder")} />
            </div>
            <div>
              <label style={labelStyle}>{t("companyLabel")}</label>
              <input className="ld-in" name="company" value={form.company} onChange={onField} placeholder={t("companyPlaceholder")} />
            </div>
            <div>
              <label style={labelStyle}>{t("emailLabel")}</label>
              <input className="ld-in" name="email" value={form.email} onChange={onField} placeholder={t("emailPlaceholder")} />
            </div>
          </div>
          <button onClick={() => setSent(true)} className="ld-hard" style={{ width: "100%", marginTop: 18, fontFamily: ARCHIVO, fontWeight: 800, fontSize: 15, color: "#fff", background: "var(--accent)", border: "2px solid var(--ink)", borderRadius: 11, padding: 13, boxShadow: "3px 3px 0 var(--ink)", cursor: "pointer" }}>
            {t("submit")}
          </button>
          <div style={{ fontFamily: MONO, fontSize: 10.5, color: "var(--soft)", textAlign: "center", marginTop: 12 }}>{t("foot")}</div>
        </div>
      )}
    </div>
  );
}
