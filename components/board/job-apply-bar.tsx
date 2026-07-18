"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { ARCHIVO } from "@/components/board/ui";

// Barra sticky de la oferta: guardar + "Aplicar" → wizard de aplicar (pantalla completa,
// fiel a Design). El flujo de 4 pasos vive en /empleos/oferta/[slug]/aplicar.
export function JobApplyBar({ jobId, slug, locale }: { jobId: string; slug: string; locale: string }) {
  const t = useTranslations("Board");
  const router = useRouter();
  const [saved, setSaved] = useState(false);

  async function toggleSave() {
    const next = !saved;
    setSaved(next);
    const res = next
      ? await fetch("/api/board/saved", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId }) })
      : await fetch(`/api/board/saved?jobId=${jobId}`, { method: "DELETE" });
    if (res.status === 401) { setSaved(false); router.push("/cuenta/entrar"); }
    else if (!res.ok) setSaved(!next);
  }

  return (
    <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, background: "rgba(252,250,246,.96)", backdropFilter: "blur(8px)", borderTop: "1px solid #E7E1D4", padding: "12px 16px 16px", zIndex: 30 }}>
      <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={toggleSave} aria-label="save" className="jb-hard" style={{ width: 46, height: 46, flexShrink: 0, borderRadius: 12, background: "#FCFAF6", border: "2px solid #1A1A17", boxShadow: "3px 3px 0 #1A1A17", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill={saved ? "#0E5C4A" : "none"}><path d="M6 4h12v17l-6-4-6 4V4Z" stroke={saved ? "#0E5C4A" : "#1A1A17"} strokeWidth="2" strokeLinejoin="round" /></svg>
        </button>
        <Link href={{ pathname: "/empleos/oferta/[slug]/aplicar", params: { slug } }} className="jb-hard" style={{ flex: 1, textAlign: "center", fontFamily: ARCHIVO, fontWeight: 800, fontSize: 15, color: "#fff", background: "#F1543F", border: "2px solid #1A1A17", borderRadius: 12, padding: 13, boxShadow: "3px 3px 0 #1A1A17" }}>
          {t("detail.apply")} →
        </Link>
      </div>
    </div>
  );
}
