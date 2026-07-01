"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Handles both PKCE (code= in query) and implicit (tokens in #hash) flows.
// Implicit flow sends tokens/errors in the URL fragment, which is invisible
// to server-side route handlers — this must be a client component.
export function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const supabase = createClient();

    // --- Query-param based flows (PKCE / token-hash) ---
    const code       = searchParams.get("code");
    const token_hash = searchParams.get("token_hash");
    const type       = searchParams.get("type") as "recovery" | "signup" | "email" | null;

    // --- Hash fragment (implicit flow) ---
    const hash       = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
    const hp         = new URLSearchParams(hash);
    const hashError  = hp.get("error");
    const hashCode   = hp.get("error_code");
    const hashType   = hp.get("type") as "recovery" | null;
    const access_token  = hp.get("access_token");
    const refresh_token = hp.get("refresh_token");

    const isRecovery = type === "recovery" || hashType === "recovery";
    const next = isRecovery ? "/auth/reset-password" : "/dashboard";

    async function handle() {
      // 1. PKCE: code in query string
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) { router.replace(next); return; }
        setErrorMsg("El enlace es inválido o ha expirado.");
        return;
      }

      // 2. Token-hash OTP (email confirm / recovery)
      if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({ token_hash, type });
        if (!error) { router.replace(next); return; }
        setErrorMsg("El enlace es inválido o ha expirado.");
        return;
      }

      // 3. Implicit flow – error in hash
      if (hashError) {
        if (hashCode === "otp_expired") {
          setErrorMsg("El enlace expiró. Solicita uno nuevo desde el login.");
        } else {
          setErrorMsg("El enlace no es válido. Solicita uno nuevo.");
        }
        return;
      }

      // 4. Implicit flow – tokens in hash (successful reset / signup)
      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (!error) { router.replace(next); return; }
        setErrorMsg("No se pudo establecer la sesión. Intenta de nuevo.");
        return;
      }

      // 5. Supabase v2 – session auto-detected by the SDK from the hash
      const { data } = await supabase.auth.getSession();
      if (data.session) { router.replace(next); return; }

      setErrorMsg("Enlace inválido o ya utilizado.");
    }

    handle();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (errorMsg) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", background: "#F4F0E8", padding: "24px",
      }}>
        <div style={{
          background: "#FCFAF6", border: "1.5px solid #1A1A17",
          boxShadow: "7px 7px 0 #1A1A17", borderRadius: "18px",
          padding: "40px 32px", textAlign: "center", maxWidth: "380px",
        }}>
          <div style={{ fontSize: "40px", marginBottom: "14px" }}>🔗</div>
          <div style={{
            fontFamily: "'Archivo', sans-serif", fontWeight: 900,
            fontSize: "22px", letterSpacing: "-0.5px", marginBottom: "10px",
          }}>
            Enlace expirado
          </div>
          <p style={{ fontSize: "14px", color: "#79746B", marginBottom: "24px", lineHeight: "1.6" }}>
            {errorMsg}
          </p>
          <button
            onClick={() => router.push("/login")}
            style={{
              padding: "11px 24px", borderRadius: "11px",
              border: "2px solid #1A1A17", boxShadow: "3px 3px 0 #1A1A17",
              background: "#0E5C4A", color: "#fff",
              fontFamily: "'Archivo', sans-serif", fontWeight: 800,
              fontSize: "15px", cursor: "pointer",
            }}
          >
            Volver al login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#F4F0E8",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "#79746B" }}>
        <Loader2 size={20} className="animate-spin" />
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "12px", letterSpacing: "1px" }}>
          VERIFICANDO ENLACE…
        </span>
      </div>
    </div>
  );
}
