"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

const ARCHIVO = "'Archivo',sans-serif";

// Crea una alerta desde el hub (criteria { categoryKey, location }). Reusa /api/board/alerts.
export function HubAlert({ criteria }: { criteria: { categoryKey: string; location?: string } }) {
  const t = useTranslations("Board.hub");
  const router = useRouter();
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function create() {
    if (done || loading) return;
    setLoading(true);
    const res = await fetch("/api/board/alerts", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ criteria }),
    }).catch(() => null);
    setLoading(false);
    if (res?.status === 401) { router.push("/cuenta/entrar"); return; }
    if (res?.ok) setDone(true);
  }

  if (done) {
    return <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: ARCHIVO, fontWeight: 700, fontSize: 13.5, color: "#0E5C4A", background: "#DCEFE4", border: "1.5px solid #BEE0CE", borderRadius: 11, padding: "10px 15px" }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5 9-11" stroke="#0E5C4A" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>{t("alertDone")}
    </div>;
  }
  return <button onClick={create} disabled={loading} className="jb-hard" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: ARCHIVO, fontWeight: 800, fontSize: 13.5, color: "#fff", background: "#F1543F", border: "2px solid #1A1A17", borderRadius: 11, padding: "10px 16px", boxShadow: "3px 3px 0 #1A1A17", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6Z" stroke="#fff" strokeWidth="2" strokeLinejoin="round" /><path d="M10 19a2 2 0 004 0" stroke="#fff" strokeWidth="2" /></svg>{t("createAlert")}
  </button>;
}
