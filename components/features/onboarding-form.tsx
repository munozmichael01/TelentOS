"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Onboarding self-serve: la cuenta recién creada nombra su empresa → se crea +
 * te hace owner → workspace vacío tuyo. Estilo del DS (misma tarjeta que el login).
 */
export function OnboardingForm({ email = "" }: { email?: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const ready = name.trim() && firstName.trim() && lastName.trim();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/onboarding/company", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), firstName: firstName.trim(), lastName: lastName.trim() }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "No se pudo crear la empresa");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
      setLoading(false);
    }
  }

  const labelStyle: React.CSSProperties = { display: "block", fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", color: "#79746B", marginBottom: "7px" };
  const inputStyle: React.CSSProperties = { width: "100%", background: "#FFF", border: "1.5px solid #E7E1D4", borderRadius: "10px", padding: "11px 13px", fontSize: "14px", color: "#1A1A17", outline: "none", fontFamily: "'Hanken Grotesk', sans-serif" };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F4F0E8", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: "392px", background: "#FCFAF6", border: "1.5px solid #1A1A17", borderRadius: "18px", boxShadow: "7px 7px 0 #1A1A17", overflow: "hidden" }}>
        <div style={{ padding: "34px 32px 26px", textAlign: "center", borderBottom: "1px solid #E7E1D4" }}>
          <div style={{ width: "48px", height: "48px", margin: "0 auto 14px", borderRadius: "13px", background: "#0E5C4A", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "3px 3px 0 #1A1A17" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 7l8 4 8-4M4 7l8-4 8 4M4 7v10l8 4 8-4V7M12 11v10" stroke="#C6F24E" strokeWidth="2" strokeLinejoin="round" /></svg>
          </div>
          <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: "24px", letterSpacing: "-.6px" }}>Crea tu empresa</div>
          <div style={{ fontSize: "14px", color: "#79746B", marginTop: "5px", lineHeight: 1.5 }}>Un último paso: dale nombre a tu workspace y preséntate. Serás su administrador.</div>
        </div>
        <form onSubmit={submit} style={{ padding: "26px 32px 32px" }}>
          <label style={labelStyle}>Nombre de la empresa</label>
          <input
            autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Mi Empresa S.L."
            style={inputStyle}
          />
          <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Tu nombre</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Ana" style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Tu apellido</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="García" style={inputStyle} />
            </div>
          </div>
          {email && (
            <div style={{ marginTop: "16px", display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#79746B" }}>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase" }}>Cuenta</span>
              <span style={{ background: "#F4F0E8", border: "1px solid #E7E1D4", borderRadius: "7px", padding: "3px 9px", color: "#1A1A17" }}>{email}</span>
            </div>
          )}
          {error && <p style={{ fontSize: "13px", color: "#C0392B", margin: "12px 0 0" }}>{error}</p>}
          <button
            type="submit" disabled={loading || !ready}
            style={{ marginTop: "18px", width: "100%", padding: "12px", borderRadius: "11px", border: "2px solid #1A1A17", boxShadow: loading || !ready ? "none" : "3px 3px 0 #1A1A17", background: loading || !ready ? "#B7D48A" : "#0E5C4A", color: "#fff", fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: "15px", cursor: loading || !ready ? "default" : "pointer" }}
          >
            {loading ? "Creando…" : "Crear workspace"}
          </button>
          <p style={{ fontSize: "12px", color: "#79746B", margin: "14px 0 0", lineHeight: 1.5, textAlign: "center" }}>
            Esto crea tu cuenta y tu empresa, no una ficha de empleado. Podrás añadirte a la plantilla luego, si quieres.
          </p>
        </form>
      </div>
    </div>
  );
}
