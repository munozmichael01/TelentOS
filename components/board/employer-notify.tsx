"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

const ARCHIVO = "'Archivo',sans-serif";

// "Avisarme" — crea una alerta de la empresa (criteria { companyId }) reusando
// /api/board/alerts. Sin sesión → auth de candidato.
export function EmployerNotify({ companyId, locale }: { companyId: string; companyName: string; locale: string }) {
  const t = useTranslations("Board.employer");
  const router = useRouter();
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function notify() {
    if (done || loading) return;
    setLoading(true);
    const res = await fetch("/api/board/alerts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ criteria: { companyId } }),
    }).catch(() => null);
    setLoading(false);
    if (res?.status === 401) { router.push("/cuenta/entrar"); return; }
    if (res?.ok) setDone(true);
  }

  if (done) {
    return (
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: ARCHIVO, fontWeight: 700, fontSize: 13.5, color: "#0E5C4A", background: "#DCEFE4", border: "1.5px solid #BEE0CE", borderRadius: 11, padding: "10px 15px" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5 9-11" stroke="#0E5C4A" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        {t("notifying")}
      </div>
    );
  }

  return (
    <button onClick={notify} disabled={loading} className="jb-hard" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: ARCHIVO, fontWeight: 800, fontSize: 13.5, color: "#1A1A17", background: "#FCFAF6", border: "2px solid #1A1A17", borderRadius: 11, padding: "10px 15px", boxShadow: "3px 3px 0 #1A1A17", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6Z" stroke="#1A1A17" strokeWidth="2" strokeLinejoin="round" /><path d="M10 19a2 2 0 004 0" stroke="#1A1A17" strokeWidth="2" /></svg>
      {t("notify")}
    </button>
  );
}
