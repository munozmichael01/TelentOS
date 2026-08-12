"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PRODUCT_HOME } from "@/lib/auth/audiences";

/**
 * Puerta de un producto: la pantalla de entrada, y lo único público de su namespace.
 *
 * Los tres productos comparten identidad (mismo email, misma contraseña) pero el alta es de cada
 * uno: tener cuenta en el board no da el admin.
 *
 * **El formulario se enseña SIEMPRE**, también cuando ya hay una sesión de otro producto. La
 * primera versión lo escondía y ponía en su lugar un "no tienes acceso, cierra sesión y
 * regístrate" — sin botón de cerrar sesión y con el único enlace llevando al producto del que
 * venías. Un callejón sin salida (auditoría del 12-ago, F1). Cuando hay una sesión ajena se
 * añade encima el aviso de que entrar aquí la cerrará, más las puertas de los productos en los
 * que esa cuenta sí tiene alta. Es lo que ya hacía bien la puerta del candidato.
 *
 * Lo que NO se hace nunca es redirigir a otro producto: eso producía el bucle de redirects
 * (docs/auditoria-autenticacion.md).
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
    // `router.refresh()` a secas repinta la puerta pero deja la barra de direcciones en
    // /sign-in, porque no sigue el redirect del middleware. Se navega al producto y se refresca
    // para que el servidor vuelva a evaluar el alta (si no la tiene, esta pantalla lo dirá).
    router.replace(PRODUCT_HOME[product] as never);
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

          {signedInAs && (
            <ForeignSessionNotice email={signedInAs} message={noAccess ?? ""} elsewhere={elsewhere} />
          )}
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
        </div>
      </div>
    </div>
  );
}

/**
 * Aviso de sesión ajena. Se enseña ENCIMA del formulario, nunca en su lugar: quitarle el
 * formulario a quien llega con otra sesión lo deja sin salida (auditoría 12-ago, F1).
 */
export function ForeignSessionNotice({
  email, message, elsewhere,
}: {
  email: string;
  message: string;
  elsewhere?: { href: string; label: string }[];
}) {
  return (
    <div style={{ background: "#FDF6E6", border: "1px solid #E8D9A8", borderRadius: "12px", padding: "13px 14px", marginBottom: "18px" }}>
      <p style={{ fontSize: "13px", color: "#1A1A17", margin: 0, lineHeight: 1.5 }}>
        {message} Tu sesión es <strong>{email}</strong>, y entrar aquí la cerrará.
      </p>
      {elsewhere && elsewhere.length > 0 && (
        <div style={{ marginTop: "10px" }}>
          {elsewhere.map((p) => (
            <a key={p.href} href={p.href} style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#0E5C4A", textDecoration: "none", padding: "3px 0" }}>
              {p.label} →
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
