import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { Company } from "@/lib/types";

/**
 * Empresa del usuario, resuelta desde su **membresía** (no `.limit(1)`).
 * Un usuario sin membresía → `null` (nunca cae en otra empresa: aislamiento
 * multi-tenant). El gate del layout redirige a `/onboarding` cuando es null.
 */
/** ID de la empresa del usuario, desde su membresía. `null` si no tiene (multi-tenant). */
export async function getCompanyId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // service_role para leer la membresía sin fricción de RLS (usuario ya verificado).
  const admin = createAdminClient();
  const { data: member } = await admin
    .from("company_members")
    .select("company_id")
    .eq("user_id", user.id)
    .maybeSingle();
  return (member?.company_id as string) ?? null;
}

export async function getCompany(): Promise<Company | null> {
  const companyId = await getCompanyId();
  if (!companyId) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("companies").select("*").eq("id", companyId).maybeSingle();
  return (data as Company) ?? null;
}
