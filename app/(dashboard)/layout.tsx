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

  return <AppShell>{children}</AppShell>;
}
