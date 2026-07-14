import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * Guard del Platform Console (§9.1). A diferencia de `requireApiRole`, **NO scopea
 * por empresa**: autoriza a un operador de plataforma a leer datos cross-tenant. Es
 * la única superficie con ese permiso — la pared que un `owner` nunca cruza.
 *
 * Fuente de verdad: tabla `platform_admins`, consultada con service_role (la tabla
 * tiene RLS deny-all, así que nadie la enumera desde el cliente). Fail-closed: sin
 * sesión → 401; sesión sin fila en platform_admins → 403.
 */
export async function requirePlatformAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, error: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };
  }

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!row) {
    return {
      user,
      error: NextResponse.json({ error: "Solo administración de plataforma" }, { status: 403 }),
    };
  }

  return { user, error: null as null };
}
