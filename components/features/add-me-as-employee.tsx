"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, X, Check } from "lucide-react";

/**
 * «Añadirme como empleado» (DS §3.7). Puente user↔employee: el user que además es
 * plantilla crea su ficha de un clic. Call-out descartable sobre la lista; fondo
 * lima PLANO (no el banner de marca en degradado). CTA con sombra dura porque ES
 * una acción. Solo se muestra si el user aún no está vinculado (lo decide la página).
 */
const DISMISS_KEY = "add-me-employee-dismissed";

export function AddMeAsEmployee({ name }: { name: string }) {
  const router = useRouter();
  const [state, setState] = useState<"offer" | "success" | "hidden">("hidden");
  const [empId, setEmpId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY) !== "1") setState("offer");
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setState("hidden");
  }

  async function add() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/employees/self", { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "No se pudo crear tu ficha");
      setEmpId(j.employee?.id ?? null);
      setState("success");
      // Deja ver el estado de éxito (§3.7) antes de que el roster se refresque y lo oculte.
      setTimeout(() => router.refresh(), 1500);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setLoading(false);
    }
  }

  if (state === "hidden") return null;

  if (state === "success") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "#DCEFE3", border: "1px solid #B7DCC6", borderRadius: "14px", padding: "16px 18px", marginBottom: "20px" }}>
        <span style={{ width: "34px", height: "34px", flexShrink: 0, borderRadius: "50%", background: "#1B6B4F", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Check size={18} strokeWidth={2.4} />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "14px", color: "#0E3D2C" }}>Tu ficha está creada</div>
          <div style={{ fontSize: "13px", color: "#3E6B57", marginTop: "1px" }}>Ya apareces en la plantilla.</div>
        </div>
        {empId && (
          <Link href={`/app/employees/${empId}`} style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: "13px", color: "#0E5C4A", textDecoration: "none", whiteSpace: "nowrap" }}>
            Completar ficha →
          </Link>
        )}
      </div>
    );
  }

  const first = (name || "").trim().split(/\s+/)[0] || "";
  const init = (name || "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";

  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "14px", background: "#EAF7C4", border: "1px solid #D4E8A0", borderRadius: "14px", padding: "16px 18px", marginBottom: "20px" }}>
      <span style={{ width: "40px", height: "40px", flexShrink: 0, borderRadius: "50%", background: "#C6F24E", color: "#1A1A17", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "14px" }}>
        {init}
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "15px", color: "#1A1A17" }}>
          {first ? `${first}, ¿trabajas aquí también?` : "¿Trabajas aquí también?"}
        </div>
        <div style={{ fontSize: "13px", color: "#5B6B3A", marginTop: "2px", lineHeight: 1.5 }}>
          Añádete a la plantilla con un clic. Creamos tu ficha desde tu nombre y email; podrás completarla después.
        </div>
        {error && <div style={{ fontSize: "12.5px", color: "#C0392B", marginTop: "6px" }}>{error}</div>}
      </div>
      <button
        onClick={add}
        disabled={loading}
        style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: "6px", padding: "9px 15px", borderRadius: "10px", border: "2px solid #1A1A17", boxShadow: loading ? "none" : "3px 3px 0 #1A1A17", background: "#C6F24E", color: "#1A1A17", fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13.5px", cursor: loading ? "default" : "pointer" }}
      >
        {loading && <Loader2 size={14} className="animate-spin" />}
        Añadirme
      </button>
      <button onClick={dismiss} aria-label="Descartar" style={{ position: "absolute", top: "8px", right: "8px", color: "#8A8A6E", background: "none", border: "none", cursor: "pointer", padding: "2px" }}>
        <X size={15} />
      </button>
    </div>
  );
}
