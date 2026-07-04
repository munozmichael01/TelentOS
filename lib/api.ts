import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getCompany } from "@/lib/workspace";

type ApiRole = "owner" | "hr_admin" | "recruiter" | "manager" | "employee";

/** Guard mínimo para rutas privadas: solo exige sesión válida. */
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
 * Guard de rol para rutas sensibles: exige sesión válida + membership activo con rol permitido.
 * Usar en todas las mutaciones sobre datos privilegiados (empleados, compensación, compliance…).
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
      error: NextResponse.json({ error: "No autenticado" }, { status: 401 }),
    };
  }

  const company = await getCompany();
  if (!company) {
    return {
      user,
      supabase,
      role: null as ApiRole | null,
      error: NextResponse.json({ error: "Sin empresa configurada" }, { status: 403 }),
    };
  }

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("company_members")
    .select("role")
    .eq("company_id", company.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member?.role) {
    return {
      user,
      supabase,
      role: null as ApiRole | null,
      error: NextResponse.json({ error: "Sin permisos" }, { status: 403 }),
    };
  }

  const role = member.role as ApiRole;
  if (!allowedRoles.includes(role)) {
    return {
      user,
      supabase,
      role,
      error: NextResponse.json({ error: "Sin permisos" }, { status: 403 }),
    };
  }

  return { user, supabase, role, error: null };
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
