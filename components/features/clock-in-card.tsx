"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Fichaje del portal: entrada/salida con el tiempo corriendo.
 *
 * No manda `employee_id`: los endpoints resuelven sobre quién se actúa a partir de la sesión
 * (`lib/api-self.ts`). Antes aceptaban el id del cuerpo, lo que en el portal habría permitido
 * fichar por un compañero.
 */
const hhmmss = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
    .map((n) => String(n).padStart(2, "0")).join(":");
};

export function ClockInCard({ startedAt }: { startedAt: string | null }) {
  const t = useTranslations("Portal.clock");
  const router = useRouter();
  const [running, setRunning] = useState<string | null>(startedAt);
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { setRunning(startedAt); }, [startedAt]);

  // El contador solo late mientras hay fichaje abierto.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  async function toggle() {
    setLoading(true);
    setError("");
    const res = await fetch(running ? "/api/timer/stop" : "/api/timer/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }).catch(() => null);
    setLoading(false);
    if (!res?.ok) {
      const d = await res?.json().catch(() => null);
      setError(d?.error ?? t("failed"));
      return;
    }
    setRunning(running ? null : new Date().toISOString());
    router.refresh();
  }

  const elapsed = running ? now - new Date(running).getTime() : 0;

  return (
    <div style={{ background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "16px", padding: "22px", marginBottom: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "9.5px", textTransform: "uppercase", letterSpacing: "1px", color: "#79746B", marginBottom: "4px" }}>
            {running ? t("running") : t("stopped")}
          </div>
          <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "30px", letterSpacing: "-1px", color: running ? "#0E5C4A" : "#1A1A17" }}>
            {running ? hhmmss(elapsed) : "00:00:00"}
          </div>
        </div>
        <Button onClick={toggle} disabled={loading} variant={running ? "outline" : "default"}>
          {loading && <Loader2 className="animate-spin" />}
          {running ? t("stop") : t("start")}
        </Button>
      </div>
      {error && <p style={{ fontSize: "13px", color: "#C7402E", margin: "12px 0 0" }}>{error}</p>}
    </div>
  );
}
