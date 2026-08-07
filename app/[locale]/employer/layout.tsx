import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getCompany, getAccountCompanies, getActiveCompanyId } from "@/lib/workspace";
import { seedHrisDefaults } from "@/lib/hris-seed";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/employer/sign-in");

  const company = await getCompany();
  // Sin empresa propia → onboarding self-serve (nunca se cae en la empresa demo).
  if (!company) redirect("/employer/onboarding");

  // Ensure HRIS defaults exist for this company (no-op if already seeded)
  await seedHrisDefaults(supabase, company.id);

  // Use service-role client to read company_members without RLS interference.
  // Runs server-side only; user is already verified above.
  // null = no membership row → AppShell shows employee-level nav (least privilege).
  let userRole: string | null = null;
  if (company) {
    const admin = createAdminClient();
    const { data: member } = await admin
      .from("company_members")
      .select("role")
      .eq("company_id", company.id)
      .eq("user_id", user.id)
      .maybeSingle();
    userRole = member?.role ?? null;
  }

  // Multi-empresa: si la cuenta tiene más de una empresa (matriz + hijas), el switcher.
  const companies = await getAccountCompanies();
  const activeCompanyId = companies.length > 1 ? await getActiveCompanyId() : null;

  // ¿Esta persona es además plantilla? Solo entonces se le ofrece el salto a su portal. Antes
  // el menú mostraba "Mi espacio" a cualquiera, incluido un owner sin ficha: enlaces muertos.
  const { data: ownEmployee } = await createAdminClient()
    .from("employees").select("id").eq("user_id", user.id).maybeSingle();

  return (
    <AppShell
      userRole={userRole as never}
      companies={companies.map((c) => ({ id: c.id, name: c.name, isParent: c.parent_company_id == null }))}
      activeCompanyId={activeCompanyId}
      crossLink={ownEmployee ? { href: "/employee/profile", label: "Ir a mi espacio" } : null}
    >
      {children}
    </AppShell>
  );
}
