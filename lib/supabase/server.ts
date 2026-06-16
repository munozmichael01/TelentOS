import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// Los placeholders permiten compilar/arrancar sin .env; cualquier query
// devolverá error y las páginas muestran estados vacíos.
const URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder";

/** Cliente con la sesión del usuario (RLS de `authenticated`). */
export function createClient() {
  const cookieStore = cookies();
  return createServerClient(URL, ANON, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Llamado desde un Server Component: el middleware refresca la sesión.
        }
      },
    },
  });
}

/**
 * Cliente service_role (bypassa RLS). Solo para flujos públicos controlados:
 * candidaturas del career site y subida de CVs sin sesión.
 */
export function createAdminClient() {
  return createSupabaseClient(
    URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "placeholder",
    { auth: { persistSession: false } }
  );
}
