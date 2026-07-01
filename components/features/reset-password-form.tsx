"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, KeyRound, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [noSession, setNoSession] = useState(false);

  // Verify there is an active recovery session — if not, show a helpful message
  useEffect(() => {
    createClient().auth.getSession().then(({ data }) => {
      if (!data.session) setNoSession(true);
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/dashboard"), 2500);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    fontFamily: "inherit",
    fontSize: "14px",
    padding: "11px 13px",
    border: "1.5px solid #E7E1D4",
    borderRadius: "11px",
    background: "#F4F0E8",
    color: "#1A1A17",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div style={{ width: "100%", maxWidth: "392px" }}>
      <div style={{
        background: "#FCFAF6",
        border: "1.5px solid #1A1A17",
        borderRadius: "18px",
        boxShadow: "7px 7px 0 #1A1A17",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ padding: "34px 32px 26px", textAlign: "center", borderBottom: "1px solid #E7E1D4" }}>
          <div style={{
            width: "48px", height: "48px", margin: "0 auto 14px",
            borderRadius: "13px", background: "#0E5C4A",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "3px 3px 0 #1A1A17",
          }}>
            <KeyRound size={22} color="#C6F24E" />
          </div>
          <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: "26px", letterSpacing: "-.8px" }}>
            Nueva contraseña
          </div>
          <div style={{ fontSize: "14px", color: "#79746B", marginTop: "5px" }}>
            Elige una contraseña segura para tu cuenta
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "26px 32px 30px" }}>
          {noSession ? (
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <div style={{ fontSize: "36px", marginBottom: "12px" }}>🔗</div>
              <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: "18px", marginBottom: "8px" }}>
                El enlace expiró
              </div>
              <p style={{ fontSize: "13px", color: "#79746B", marginBottom: "20px", lineHeight: "1.5" }}>
                Solicita un nuevo enlace de recuperación desde la pantalla de inicio de sesión.
              </p>
              <button
                onClick={() => router.push("/login")}
                style={{
                  padding: "10px 20px", borderRadius: "10px",
                  border: "2px solid #1A1A17", boxShadow: "3px 3px 0 #1A1A17",
                  background: "#0E5C4A", color: "#fff",
                  fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Volver al login
              </button>
            </div>
          ) : done ? (
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <CheckCircle2 size={40} color="#0E5C4A" style={{ margin: "0 auto 14px", display: "block" }} />
              <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: "18px", marginBottom: "8px" }}>
                ¡Contraseña actualizada!
              </div>
              <div style={{ fontSize: "13px", color: "#79746B" }}>
                Redirigiendo al panel…
              </div>
            </div>
          ) : (
            <form onSubmit={submit}>
              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, marginBottom: "6px" }}>
                  Nueva contraseña
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={inputStyle}
                  onFocus={(e) => { e.target.style.borderColor = "#0E5C4A"; e.target.style.boxShadow = "0 0 0 3px #DCEFE4"; }}
                  onBlur={(e) => { e.target.style.borderColor = "#E7E1D4"; e.target.style.boxShadow = "none"; }}
                />
              </div>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, marginBottom: "6px" }}>
                  Confirmar contraseña
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  style={inputStyle}
                  onFocus={(e) => { e.target.style.borderColor = "#0E5C4A"; e.target.style.boxShadow = "0 0 0 3px #DCEFE4"; }}
                  onBlur={(e) => { e.target.style.borderColor = "#E7E1D4"; e.target.style.boxShadow = "none"; }}
                />
              </div>

              {error && (
                <p style={{ fontSize: "13px", color: "#BD4332", marginBottom: "14px" }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  fontFamily: "'Archivo', sans-serif",
                  fontWeight: 800,
                  fontSize: "15px",
                  color: "#F4F0E8",
                  background: "#0E5C4A",
                  border: "1.5px solid #1A1A17",
                  borderRadius: "12px",
                  padding: "12px",
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: "3px 3px 0 #1A1A17",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                Guardar contraseña
              </button>
            </form>
          )}
        </div>
      </div>

      <div style={{
        textAlign: "center", marginTop: "18px",
        fontFamily: "'Space Mono', monospace",
        fontSize: "11px", letterSpacing: "1px", color: "#79746B",
      }}>
        ACCESO INTERNO · EQUIPO DE RECLUTAMIENTO
      </div>
    </div>
  );
}
