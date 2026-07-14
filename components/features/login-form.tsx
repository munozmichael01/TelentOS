"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  // If we arrived from an expired reset link, drop straight into forgot mode
  const isExpiredLink = !!urlError;
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">(
    isExpiredLink ? "forgot" : "signin"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(isExpiredLink ? "El enlace expiró. Introduce tu email y te enviamos uno nuevo." : "");
  const [info, setInfo] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");
    const supabase = createClient();
    try {
      if (mode === "forgot") {
        const origin = window.location.origin;
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          // type=recovery explícito: el handler de /auth/callback enruta a
          // /auth/reset-password de forma fiable aunque Supabase no lo añada (PKCE).
          redirectTo: `${origin}/auth/callback?type=recovery`,
        });
        if (error) throw error;
        setInfo("Te hemos enviado un email con las instrucciones. Revisa tu bandeja de entrada.");
        return;
      }
      if (mode === "signup") {
        const origin = window.location.origin;
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${origin}/auth/callback` },
        });
        if (error) throw error;
        if (!data.session) {
          setInfo("Cuenta creada. Revisa tu email para confirmarla y vuelve a iniciar sesión.");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ width: "100%", maxWidth: "392px" }}>
      {/* card */}
      <div style={{ background: "#FCFAF6", border: "1.5px solid #1A1A17", borderRadius: "18px", boxShadow: "7px 7px 0 #1A1A17", overflow: "hidden" }}>
        {/* header */}
        <div style={{ padding: "34px 32px 26px", textAlign: "center", borderBottom: "1px solid #E7E1D4" }}>
          <div style={{ width: "48px", height: "48px", margin: "0 auto 14px", borderRadius: "13px", background: "#0E5C4A", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "3px 3px 0 #1A1A17" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M4 7l8 4 8-4M4 7l8-4 8 4M4 7v10l8 4 8-4V7M12 11v10" stroke="#C6F24E" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: "26px", letterSpacing: "-.8px" }}>TalentOS</div>
          <div style={{ fontSize: "14px", color: "#79746B", marginTop: "5px" }}>
            {mode === "signin" ? "Accede a tu workspace" : mode === "signup" ? "Crea tu cuenta" : "Recuperar contraseña"}
          </div>
        </div>

        {/* form */}
        <div style={{ padding: "26px 32px 30px" }}>
          <form onSubmit={submit}>
            {/* Email — always shown */}
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, marginBottom: "6px" }}>Email</label>
              <input
                type="email"
                required
                placeholder="tu@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: "100%", fontFamily: "inherit", fontSize: "14px",
                  padding: "11px 13px", border: "1.5px solid #E7E1D4",
                  borderRadius: "11px", background: "#F4F0E8", color: "#1A1A17",
                  outline: "none", transition: "border-color .12s ease, box-shadow .12s ease",
                  boxSizing: "border-box" as const,
                }}
                onFocus={(e) => { e.target.style.borderColor = "#0E5C4A"; e.target.style.boxShadow = "0 0 0 3px #DCEFE4"; }}
                onBlur={(e) => { e.target.style.borderColor = "#E7E1D4"; e.target.style.boxShadow = "none"; }}
              />
            </div>

            {/* Password — only for signin / signup */}
            {mode !== "forgot" && (
              <div style={{ marginBottom: mode === "signin" ? "6px" : "20px" }}>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, marginBottom: "6px" }}>Contraseña</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: "100%", fontFamily: "inherit", fontSize: "14px",
                    padding: "11px 13px", border: "1.5px solid #E7E1D4",
                    borderRadius: "11px", background: "#F4F0E8", color: "#1A1A17",
                    outline: "none", transition: "border-color .12s ease, box-shadow .12s ease",
                    boxSizing: "border-box" as const,
                  }}
                  onFocus={(e) => { e.target.style.borderColor = "#0E5C4A"; e.target.style.boxShadow = "0 0 0 3px #DCEFE4"; }}
                  onBlur={(e) => { e.target.style.borderColor = "#E7E1D4"; e.target.style.boxShadow = "none"; }}
                />
              </div>
            )}

            {/* Forgot password link — only in signin mode */}
            {mode === "signin" && (
              <div style={{ textAlign: "right", marginBottom: "18px" }}>
                <span
                  onClick={() => { setMode("forgot"); setError(""); setInfo(""); }}
                  style={{ fontSize: "12px", color: "#79746B", cursor: "pointer", textDecoration: "underline" }}
                >
                  ¿Olvidaste tu contraseña?
                </span>
              </div>
            )}

            {/* Forgot mode description */}
            {mode === "forgot" && (
              <p style={{ fontSize: "13px", color: "#79746B", marginBottom: "16px", lineHeight: "1.5" }}>
                Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
              </p>
            )}

            {error && <p style={{ fontSize: "13px", color: "#BD4332", marginBottom: "14px" }}>{error}</p>}
            {info  && <p style={{ fontSize: "13px", color: "#1B6B4F", marginBottom: "14px" }}>{info}</p>}

            {!info && (
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
                  transition: "transform .1s ease, box-shadow .1s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  opacity: loading ? 0.7 : 1,
                }}
                onMouseEnter={(e) => { if (!loading) { (e.target as HTMLButtonElement).style.transform = "translate(-1px,-1px)"; (e.target as HTMLButtonElement).style.boxShadow = "5px 5px 0 #1A1A17"; } }}
                onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.transform = ""; (e.target as HTMLButtonElement).style.boxShadow = "3px 3px 0 #1A1A17"; }}
                onMouseDown={(e) => { (e.target as HTMLButtonElement).style.transform = "translate(2px,2px)"; (e.target as HTMLButtonElement).style.boxShadow = "1px 1px 0 #1A1A17"; }}
                onMouseUp={(e) => { (e.target as HTMLButtonElement).style.transform = ""; (e.target as HTMLButtonElement).style.boxShadow = "3px 3px 0 #1A1A17"; }}
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {mode === "signin" ? "Entrar" : mode === "signup" ? "Crear cuenta" : "Enviar instrucciones"}
              </button>
            )}
          </form>

          <div style={{ marginTop: "18px", textAlign: "center", fontSize: "13px", color: "#79746B" }}>
            {mode === "forgot" ? (
              <span onClick={() => { setMode("signin"); setError(""); setInfo(""); }} style={{ cursor: "pointer" }}>
                ← Volver al inicio de sesión
              </span>
            ) : (
              <span
                onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setInfo(""); }}
                style={{ cursor: "pointer" }}
              >
                {mode === "signin" ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: "18px", fontFamily: "'Space Mono', monospace", fontSize: "11px", letterSpacing: "1px", color: "#79746B" }}>
        ACCESO INTERNO · EQUIPO DE RECLUTAMIENTO
      </div>
    </div>
  );
}
