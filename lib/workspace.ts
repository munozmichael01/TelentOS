import { cookies } from "next/headers";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { Company } from "@/lib/types";

export const ACTIVE_COMPANY_COOKIE = "tos_company";
export type AccountCompany = { id: string; name: string; slug: string; parent_company_id: string | null };

/** Empresas del usuario: donde es miembro + sus hijas (matriz→sucursales). Para el switcher. */
export async function getAccountCompanies(): Promise<AccountCompany[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const admin = createAdminClient();
  const { data: mems } = await admin.from("company_members").select("company_id").eq("user_id", user.id);
  const ids = (mems ?? []).map((m) => m.company_id as string);
  if (!ids.length) return [];
  const inList = ids.join(",");
  const { data } = await admin.from("companies")
    .select("id, name, slug, parent_company_id")
    .or(`id.in.(${inList}),parent_company_id.in.(${inList})`)
    .order("parent_company_id", { nullsFirst: true }).order("name");
  return (data ?? []) as AccountCompany[];
}

/** Empresa activa del switcher (cookie), validada contra el alcance. null = "todas". */
export async function getActiveCompanyId(): Promise<string | null> {
  const c = cookies().get(ACTIVE_COMPANY_COOKIE)?.value;
  if (!c) return null;
  const companies = await getAccountCompanies();
  return companies.some((x) => x.id === c) ? c : null;
}

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
  // Empresa activa del switcher si está seleccionada; si no, la primera membresía.
  // (Antes .maybeSingle() reventaba con >1 empresa — deuda técnica #2, resuelta.)
  const admin = createAdminClient();
  const { data: members } = await admin
    .from("company_members")
    .select("company_id")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true });
  const ids = (members ?? []).map((m) => m.company_id as string);
  if (!ids.length) return null;
  const active = cookies().get(ACTIVE_COMPANY_COOKIE)?.value;
  if (active && ids.includes(active)) return active;
  return ids[0];
}

export async function getCompany(): Promise<Company | null> {
  const companyId = await getCompanyId();
  if (!companyId) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("companies").select("*").eq("id", companyId).maybeSingle();
  return (data as Company) ?? null;
}
