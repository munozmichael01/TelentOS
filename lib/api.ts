import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Guard común de las rutas privadas: exige sesión de Supabase. */
export async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      user: null,
      supabase,
      error: NextResponse.json({ error: "No autenticado" }, { status: 401 }),
    };
  }
  return { user, supabase, error: null };
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
