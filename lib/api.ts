import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

type ApiRole = "owner" | "hr_admin" | "recruiter" | "manager" | "employee";

/** Guard mínimo: solo exige sesión válida. */
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

/**
 * Guard de rol para rutas sensibles.
 * Resuelve el workspace desde el membership explícito del usuario, no de limit(1) en companies.
 * Devuelve companyId en el resultado para evitar una segunda consulta en el handler.
 */
export async function requireApiRole(allowedRoles: ApiRole[]) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null as null,
      supabase,
      role: null as ApiRole | null,
      companyId: null as string | null,
      error: NextResponse.json({ error: "No autenticado" }, { status: 401 }),
    };
  }

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("company_members")
    .select("role, company_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member?.role) {
    return {
      user,
      supabase,
      role: null as ApiRole | null,
      companyId: null as string | null,
      error: NextResponse.json({ error: "Sin permisos" }, { status: 403 }),
    };
  }

  const role = member.role as ApiRole;
  if (!allowedRoles.includes(role)) {
    return {
      user,
      supabase,
      role,
      companyId: member.company_id as string,
      error: NextResponse.json({ error: "Sin permisos" }, { status: 403 }),
    };
  }

  return {
    user,
    supabase,
    role,
    companyId: member.company_id as string,
    error: null,
  };
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
