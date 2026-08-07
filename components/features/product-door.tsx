"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Puerta de un producto: la pantalla de entrada, y lo único público de su namespace.
 *
 * Los tres productos comparten identidad (mismo email, misma contraseña) pero el alta es de cada
 * uno: tener cuenta en el board no da el admin. Por eso la puerta tiene DOS estados y el segundo
 * es tan importante como el primero:
 *
 *   · sin sesión → formulario de entrada.
 *   · con sesión pero sin alta en ESTE producto → se explica, y se ofrece la puerta de los
 *     productos en los que sí la tiene. Nunca se le redirige solo: mandar a la gente de un
 *     producto a otro es lo que producía el bucle de redirects (docs/auditoria-autenticacion.md).
 */

const ink = "#1A1A17", soft = "#79746B", line = "#E7E1D4", surface = "#FCFAF6";

export type DoorProduct = "staff" | "employee" | "candidate";

export function ProductDoor({
  product,
  title,
  eyebrow,
  hint,
  signedInAs,
  elsewhere,
  noAccess,
}: {
  product: DoorProduct;
  title: string;
  eyebrow: string;
  /** Cómo se consigue el alta, cuando no es autoservicio. */
  hint?: string;
  /** Email de la sesión abierta, si la hay y no tiene alta aquí. */
  signedInAs?: string | null;
  /** Puertas de los productos en los que SÍ tiene alta. */
  elsewhere?: { href: string; label: string }[];
  noAccess?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) {
      setError("Email o contraseña incorrectos.");
      return;
    }
    // El middleware decide a dónde: si hay alta en este producto, entra; si no, vuelve aquí y
    // esta misma pantalla explica por qué. No se adivina el destino desde el cliente.
    router.refresh();
  }

  const label = { fontFamily: "'Space Mono',monospace", fontSize: "9.5px", textTransform: "uppercase" as const, letterSpacing: "1px", color: soft, display: "block", marginBottom: "6px" };
  const input = { width: "100%", padding: "11px 13px", borderRadius: "11px", border: `1px solid ${line}`, background: "#fff", fontSize: "14px", color: ink, fontFamily: "inherit" };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 20px", background: "radial-gradient(130% 80% at 50% -10%, #F7F3EB 0%, #F4F0E8 60%)" }}>
      <div style={{ width: "100%", maxWidth: "400px" }}>
        <div style={{ background: surface, border: `1.5px solid ${ink}`, borderRadius: "18px", boxShadow: `7px 7px 0 ${ink}`, padding: "30px 26px" }}>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "9.5px", textTransform: "uppercase", letterSpacing: "1.4px", color: soft, marginBottom: "6px" }}>
            {eyebrow}
          </div>
          <h1 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "24px", letterSpacing: "-.6px", color: ink, margin: "0 0 18px" }}>
            {title}
          </h1>

          {signedInAs ? (
            <>
              <p style={{ fontSize: "13.5px", color: ink, margin: "0 0 6px", lineHeight: 1.5 }}>{noAccess}</p>
              <p style={{ fontSize: "12.5px", color: soft, margin: "0 0 18px" }}>
                Tu sesión es <strong style={{ color: ink }}>{signedInAs}</strong>.
              </p>
              {hint && <p style={{ fontSize: "12.5px", color: soft, margin: "0 0 18px", lineHeight: 1.5 }}>{hint}</p>}
              {elsewhere && elsewhere.length > 0 && (
                <div style={{ borderTop: `1px solid ${line}`, paddingTop: "16px" }}>
                  <div style={{ ...label, marginBottom: "10px" }}>Tus productos</div>
                  {elsewhere.map((p) => (
                    <a key={p.href} href={p.href} style={{ display: "block", fontSize: "13.5px", fontWeight: 600, color: "#0E5C4A", textDecoration: "none", padding: "7px 0" }}>
                      {p.label} →
                    </a>
                  ))}
                </div>
              )}
            </>
          ) : (
            <form onSubmit={submit}>
              <div style={{ marginBottom: "14px" }}>
                <label style={label} htmlFor="door-email">Email</label>
                <input id="door-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} style={input} />
              </div>
              <div style={{ marginBottom: "18px" }}>
                <label style={label} htmlFor="door-password">Contraseña</label>
                <input id="door-password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} style={input} />
              </div>
              {error && <p style={{ fontSize: "13px", color: "#BD4332", margin: "0 0 14px" }}>{error}</p>}
              <button type="submit" disabled={loading} style={{ width: "100%", fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "14px", color: "#fff", background: "#0E5C4A", border: `2px solid ${ink}`, boxShadow: `3px 3px 0 ${ink}`, borderRadius: "11px", padding: "12px", cursor: loading ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                {loading && <Loader2 size={15} className="animate-spin" />}
                Entrar
              </button>
              {hint && <p style={{ fontSize: "12.5px", color: soft, margin: "16px 0 0", lineHeight: 1.5 }}>{hint}</p>}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
