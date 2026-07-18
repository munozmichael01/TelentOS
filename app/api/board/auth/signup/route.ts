import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Registro de CANDIDATO (audiencia distinta de los usuarios de empresa). Server-side con
 * service_role: crea el usuario con audience='candidate' en app_metadata (claim de routing,
 * no barrera de seguridad — la barrera real es RLS: un candidato no tiene company_members)
 * y su perfil global. email_confirm=true para un flujo fluido (verificación por email =
 * hardening posterior). El cliente hace signInWithPassword tras el 200.
 */
export async function POST(req: Request) {
  if (!(await rateLimit(`board-signup:${clientIp(req)}`, 5, 15 * 60_000))) {
    return jsonError("Demasiados intentos. Inténtalo en unos minutos.", 429);
  }
  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  if (!email || !password) return jsonError("Email y contraseña son obligatorios");
  if (!EMAIL_RE.test(email)) return jsonError("El email no es válido");
  if (password.length < 8) return jsonError("La contraseña debe tener al menos 8 caracteres", 422);

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { audience: "candidate" },
    user_metadata: { full_name: name || null },
  });
  if (error || !data.user) {
    // 422/409 de Supabase cuando el email ya existe
    if (/already|registered|exists/i.test(error?.message ?? "")) return jsonError("Ese email ya tiene cuenta. Inicia sesión.", 409);
    return jsonError(error?.message ?? "No se pudo crear la cuenta", 500);
  }

  // Perfil global del candidato (idempotente por user_id unique)
  await admin.from("candidate_profiles").upsert(
    { user_id: data.user.id, full_name: name || null, email },
    { onConflict: "user_id" }
  );

  return NextResponse.json({ ok: true });
}
