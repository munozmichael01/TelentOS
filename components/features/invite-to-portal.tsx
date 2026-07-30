"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Da acceso al portal a un empleado (crea/vincula su cuenta y le manda el enlace).
 * Muestra el enlace tras invitar: el correo puede no llegar (dominio sin verificar, spam) y
 * RR.HH. necesita poder pasárselo por otro canal. La invitación no depende del email.
 */
export function InviteToPortal({ employeeId, hasAccess, hasEmail }: { employeeId: string; hasAccess: boolean; hasEmail: boolean }) {
  const t = useTranslations("People.portal");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (hasAccess) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12.5px", fontWeight: 600, color: "#0E5C4A", background: "#DCEFE4", border: "1px solid #BEE0CE", borderRadius: "999px", padding: "5px 11px" }}>
        <Check className="h-3.5 w-3.5" />
        {t("hasAccess")}
      </span>
    );
  }

  async function invite() {
    setLoading(true); setError(null);
    const res = await fetch(`/api/employees/${employeeId}/invite`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) { setError(data.error ?? t("error")); return; }
    setLink(data.inviteLink ?? null);
    setNote(data.emailSent ? t("sent", { email: data.email }) : t("notSent"));
    router.refresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-start" }}>
      {!link && (
        <Button variant="outline" onClick={invite} disabled={loading || !hasEmail} title={hasEmail ? undefined : t("noEmail")}>
          {loading && <Loader2 className="animate-spin" />}
          {t("invite")}
        </Button>
      )}
      {!hasEmail && <span style={{ fontSize: "12px", color: "#79746B" }}>{t("noEmail")}</span>}
      {note && <span style={{ fontSize: "12.5px", color: "#0E5C4A" }}>{note}</span>}
      {link && (
        <button
          type="button"
          onClick={() => { navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12.5px", fontWeight: 600, color: "#54504A", background: "#F8F4EB", border: "1px solid #E7E1D4", borderRadius: "9px", padding: "7px 11px", cursor: "pointer" }}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? t("copied") : t("copyLink")}
        </button>
      )}
      {error && <span style={{ fontSize: "12.5px", color: "#C7402E" }}>{error}</span>}
    </div>
  );
}
