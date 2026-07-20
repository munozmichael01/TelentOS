"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

const ARCHIVO = "'Archivo',sans-serif";
const MONO = "'Space Mono',monospace";

// Acciones de la página de empresa: Seguir empresa (/api/board/follows), Avisarme (sheet
// con frecuencia → /api/board/alerts) y Compartir (copia enlace). Sin sesión → auth.
export function EmployerNotify({ companyId, companyName, locale }: { companyId: string; companyName: string; locale: string }) {
  const t = useTranslations("Board.employer");
  const router = useRouter();
  const [following, setFollowing] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [freq, setFreq] = useState<"instant" | "daily" | "weekly">("daily");
  const [created, setCreated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    fetch(`/api/board/follows?companyId=${companyId}`).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d?.following) setFollowing(true); }).catch(() => {});
  }, [companyId]);

  async function toggleFollow() {
    const next = !following;
    setFollowing(next);
    const res = next
      ? await fetch("/api/board/follows", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId }) })
      : await fetch(`/api/board/follows?companyId=${companyId}`, { method: "DELETE" });
    if (res.status === 401) { setFollowing(false); router.push("/cuenta/entrar"); }
    else if (!res.ok) setFollowing(!next);
  }

  async function activate() {
    setBusy(true);
    const res = await fetch("/api/board/alerts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ criteria: { companyId }, frequency: freq }),
    }).catch(() => null);
    setBusy(false);
    if (res?.status === 401) { router.push("/cuenta/entrar"); return; }
    if (res?.ok) setCreated(true);
  }

  function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    navigator.clipboard?.writeText(url).then(() => { setShared(true); setTimeout(() => setShared(false), 2000); }).catch(() => {});
  }

  const freqLabel = t(`freq_${freq}`);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
        <button onClick={toggleFollow} className="jb-hard" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: ARCHIVO, fontWeight: 800, fontSize: 13.5, color: following ? "#2C3907" : "#1A1A17", background: "#C6F24E", border: "2px solid #1A1A17", borderRadius: 11, padding: "10px 15px", boxShadow: "3px 3px 0 #1A1A17", cursor: "pointer" }}>
          {following
            ? <><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5 9-11" stroke="#2C3907" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>{t("following")}</>
            : t("follow")}
        </button>
        <button onClick={() => setSheet(true)} className="jb-hard" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: ARCHIVO, fontWeight: 800, fontSize: 13.5, color: "#1A1A17", background: "#FCFAF6", border: "2px solid #1A1A17", borderRadius: 11, padding: "10px 15px", boxShadow: "3px 3px 0 #1A1A17", cursor: "pointer" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6Z" stroke="#1A1A17" strokeWidth="2" strokeLinejoin="round" /><path d="M10 19a2 2 0 004 0" stroke="#1A1A17" strokeWidth="2" /></svg>
          {t("notify")}
        </button>
        <button onClick={share} aria-label={t("share")} className="jb-tap" style={{ width: 42, height: 42, flexShrink: 0, borderRadius: 11, background: "#FCFAF6", border: "1.5px solid #E7E1D4", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          {shared
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5 9-11" stroke="#0E5C4A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M8 12a3 3 0 10-3-3 3 3 0 003 3Zm8-6a3 3 0 10-3-3M8 12l8 5M16 21a3 3 0 10-3-3" stroke="#54504A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
        </button>
      </div>

      {sheet && (
        <div onClick={() => setSheet(false)} style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(26,26,23,.4)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, background: "var(--bg,#F4F0E8)", borderRadius: "22px 22px 0 0", borderTop: "2px solid #1A1A17", padding: "16px 18px 24px" }}>
            <div style={{ width: 38, height: 4, borderRadius: 999, background: "#D8D1C2", margin: "0 auto 14px" }} />
            {created ? (
              <div style={{ textAlign: "center", padding: "10px 0 6px" }}>
                <span style={{ width: 54, height: 54, borderRadius: 16, background: "#DCEFE4", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}><svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5 9-11" stroke="#0E5C4A" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
                <div style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 18 }}>{t("alertCreated")}</div>
                <p style={{ fontSize: 13.5, color: "var(--soft,#79746B)", margin: "5px 0 14px" }}>{t("alertCreatedDesc", { company: companyName, freq: freqLabel })}</p>
                <button onClick={() => { setSheet(false); setCreated(false); }} className="jb-hard" style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 14, color: "#fff", background: "#0E5C4A", border: "2px solid #1A1A17", borderRadius: 12, padding: "11px 22px", boxShadow: "3px 3px 0 #1A1A17", cursor: "pointer" }}>{t("done")}</button>
              </div>
            ) : (
              <>
                <div style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 19, letterSpacing: "-.5px", marginBottom: 3 }}>{t("notifyTitle")}</div>
                <p style={{ fontSize: 13, color: "var(--soft,#79746B)", margin: "0 0 14px" }}>{t("notifySub", { company: companyName })}</p>
                <div style={{ background: "var(--surface,#FCFAF6)", border: "1px solid #E7E1D4", borderRadius: 12, padding: "11px 13px", marginBottom: 16 }}>
                  <div style={{ fontFamily: MONO, fontSize: 9.5, textTransform: "uppercase", letterSpacing: .5, color: "var(--soft,#79746B)", marginBottom: 8 }}>{t("criteria")}</div>
                  <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: "#0E5C4A", background: "#DCEFE4", border: "1px solid #BEE0CE", borderRadius: 8, padding: "5px 10px" }}>{companyName}</span>
                </div>
                <div style={{ fontFamily: MONO, fontSize: 9.5, textTransform: "uppercase", letterSpacing: .5, color: "var(--soft,#79746B)", marginBottom: 8 }}>{t("frequency")}</div>
                <div style={{ display: "flex", gap: 7, marginBottom: 18 }}>
                  {(["instant", "daily", "weekly"] as const).map((f) => (
                    <button key={f} onClick={() => setFreq(f)} className="jb-tap" style={{ flex: 1, fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: freq === f ? 700 : 600, fontSize: 13, borderRadius: 999, padding: "9px 8px", cursor: "pointer", border: `1.5px solid ${freq === f ? "#1A1A17" : "#E7E1D4"}`, background: freq === f ? "#DCEFE4" : "#FCFAF6", color: freq === f ? "#0E5C4A" : "#54504A" }}>{t(`freq_${f}`)}</button>
                  ))}
                </div>
                <button onClick={activate} disabled={busy} className="jb-hard" style={{ width: "100%", fontFamily: ARCHIVO, fontWeight: 800, fontSize: 15, color: "#fff", background: "#0E5C4A", border: "2px solid #1A1A17", borderRadius: 12, padding: 13, boxShadow: "3px 3px 0 #1A1A17", cursor: "pointer", opacity: busy ? .7 : 1 }}>{busy ? "…" : t("activate")}</button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
