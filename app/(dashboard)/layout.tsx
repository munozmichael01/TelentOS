import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { getCompany } from "@/lib/workspace";
import { seedHrisDefaults } from "@/lib/hris-seed";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const company = await getCompany();

  // Ensure HRIS defaults exist for this company (no-op if already seeded)
  if (company) await seedHrisDefaults(supabase, company.id);

  // Fetch user role; null = no membership row yet (treated as hr_admin in AppShell)
  let userRole: string | null = null;
  if (company) {
    const { data: member } = await supabase
      .from("company_members")
      .select("role")
      .eq("company_id", company.id)
      .eq("user_id", user.id)
      .maybeSingle();
    userRole = member?.role ?? null;
  }

  return <AppShell userRole={userRole as never}>{children}</AppShell>;
}
