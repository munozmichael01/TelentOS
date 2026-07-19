"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { ARCHIVO } from "@/components/board/ui";

// Barra sticky de la oferta: guardar + aplicar. Candidato logueado con perfil COMPLETO y
// oferta sin screening obligatorio → "Aplicar en un toque" (usa su perfil, sin re-teclear).
// En cualquier otro caso → wizard de aplicar (pantalla completa, fiel a Design).
export function JobApplyBar({ jobId, slug, locale, authed = false, hasRequiredScreening = false }: { jobId: string; slug: string; locale: string; authed?: boolean; hasRequiredScreening?: boolean }) {
  const t = useTranslations("Board");
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [canOneTap, setCanOneTap] = useState(false);
  const [state, setState] = useState<"idle" | "applying" | "applied">("idle");
  const [err, setErr] = useState("");

  // ¿1-toque disponible? candidato + sin screening obligatorio + perfil completo.
  useEffect(() => {
    if (!authed || hasRequiredScreening) return;
    fetch("/api/board/profile").then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (d?.completeness?.complete) setCanOneTap(true);
    }).catch(() => {});
  }, [authed, hasRequiredScreening]);

  async function toggleSave() {
    const next = !saved;
    setSaved(next);
    const res = next
      ? await fetch("/api/board/saved", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId }) })
      : await fetch(`/api/board/saved?jobId=${jobId}`, { method: "DELETE" });
    if (res.status === 401) { setSaved(false); router.push("/cuenta/entrar"); }
    else if (!res.ok) setSaved(!next);
  }

  async function oneTap() {
    setState("applying"); setErr("");
    const res = await fetch("/api/board/apply/one-tap", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId }),
    }).then((r) => r.json().then((j) => ({ status: r.status, j }))).catch(() => null);
    if (res?.j?.needsWizard) { router.push({ pathname: "/empleos/oferta/[slug]/aplicar", params: { slug } }); return; }
    if (res?.status === 200 && res.j?.ok) { setState("applied"); return; }
    if (res?.status === 409) { setState("applied"); return; }
    setState("idle"); setErr(t("apply.error"));
  }

  const barStyle = { flex: 1, textAlign: "center" as const, fontFamily: ARCHIVO, fontWeight: 800, fontSize: 15, color: "#fff", background: "#F1543F", border: "2px solid #1A1A17", borderRadius: 12, padding: 13, boxShadow: "3px 3px 0 #1A1A17" };

  return (
    <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, background: "rgba(252,250,246,.96)", backdropFilter: "blur(8px)", borderTop: "1px solid #E7E1D4", padding: "12px 16px 16px", zIndex: 30 }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {err && <p style={{ fontSize: 12.5, color: "#BD4332", margin: "0 0 8px", textAlign: "center" }}>{err}</p>}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={toggleSave} aria-label="save" className="jb-hard" style={{ width: 46, height: 46, flexShrink: 0, borderRadius: 12, background: "#FCFAF6", border: "2px solid #1A1A17", boxShadow: "3px 3px 0 #1A1A17", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill={saved ? "#0E5C4A" : "none"}><path d="M6 4h12v17l-6-4-6 4V4Z" stroke={saved ? "#0E5C4A" : "#1A1A17"} strokeWidth="2" strokeLinejoin="round" /></svg>
          </button>
          {state === "applied" ? (
            <Link href="/cuenta" className="jb-hard" style={{ ...barStyle, background: "#0E5C4A" }}>{t("detail.applied")} →</Link>
          ) : canOneTap ? (
            <button onClick={oneTap} disabled={state === "applying"} className="jb-hard" style={{ ...barStyle, cursor: "pointer", opacity: state === "applying" ? .7 : 1 }}>
              {state === "applying" ? t("apply.sending") : `${t("detail.oneTap")} ⚡`}
            </button>
          ) : (
            <Link href={{ pathname: "/empleos/oferta/[slug]/aplicar", params: { slug } }} className="jb-hard" style={barStyle}>
              {t("detail.apply")} →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
