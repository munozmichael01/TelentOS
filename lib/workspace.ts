import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { Company } from "@/lib/types";

/**
 * Empresa del usuario, resuelta desde su **membresía** (no `.limit(1)`).
 * Un usuario sin membresía → `null` (nunca cae en otra empresa: aislamiento
 * multi-tenant). El gate del layout redirige a `/onboarding` cuando es null.
 */
export async function getCompany(): Promise<Company | null> {
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
  if (!member?.company_id) return null;

  const { data } = await admin.from("companies").select("*").eq("id", member.company_id).maybeSingle();
  return (data as Company) ?? null;
}
