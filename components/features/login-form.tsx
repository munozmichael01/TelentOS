"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");
    const supabase = createClient();
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
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
            {mode === "signin" ? "Accede a tu workspace" : "Crea tu cuenta"}
          </div>
        </div>

        {/* form */}
        <div style={{ padding: "26px 32px 30px" }}>
          <form onSubmit={submit}>
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, marginBottom: "6px" }}>Email</label>
              <input
                type="email"
                required
                placeholder="tu@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: "100%",
                  fontFamily: "inherit",
                  fontSize: "14px",
                  padding: "11px 13px",
                  border: "1.5px solid #E7E1D4",
                  borderRadius: "11px",
                  background: "#F4F0E8",
                  color: "#1A1A17",
                  outline: "none",
                  transition: "border-color .12s ease, box-shadow .12s ease",
                }}
                onFocus={(e) => { e.target.style.borderColor = "#0E5C4A"; e.target.style.boxShadow = "0 0 0 3px #DCEFE4"; }}
                onBlur={(e) => { e.target.style.borderColor = "#E7E1D4"; e.target.style.boxShadow = "none"; }}
              />
            </div>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, marginBottom: "6px" }}>Contraseña</label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  fontFamily: "inherit",
                  fontSize: "14px",
                  padding: "11px 13px",
                  border: "1.5px solid #E7E1D4",
                  borderRadius: "11px",
                  background: "#F4F0E8",
                  color: "#1A1A17",
                  outline: "none",
                  transition: "border-color .12s ease, box-shadow .12s ease",
                }}
                onFocus={(e) => { e.target.style.borderColor = "#0E5C4A"; e.target.style.boxShadow = "0 0 0 3px #DCEFE4"; }}
                onBlur={(e) => { e.target.style.borderColor = "#E7E1D4"; e.target.style.boxShadow = "none"; }}
              />
            </div>

            {error && <p style={{ fontSize: "13px", color: "#BD4332", marginBottom: "14px" }}>{error}</p>}
            {info  && <p style={{ fontSize: "13px", color: "#1B6B4F", marginBottom: "14px" }}>{info}</p>}

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
              {mode === "signin" ? "Entrar" : "Crear cuenta"}
            </button>
          </form>

          <div
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            style={{ marginTop: "18px", textAlign: "center", fontSize: "13px", color: "#79746B", cursor: "pointer" }}
          >
            {mode === "signin" ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
          </div>
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: "18px", fontFamily: "'Space Mono', monospace", fontSize: "11px", letterSpacing: "1px", color: "#79746B" }}>
        ACCESO INTERNO · EQUIPO DE RECLUTAMIENTO
      </div>
    </div>
  );
}
