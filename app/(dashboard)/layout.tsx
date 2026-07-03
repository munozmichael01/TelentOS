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

  // Fetch user role via security-definer function (bypasses RLS, no recursion risk)
  // null = no membership row yet (treated as hr_admin in AppShell)
  const { data: userRole } = await supabase.rpc("current_role_name");

  return <AppShell userRole={userRole as never}>{children}</AppShell>;
}
