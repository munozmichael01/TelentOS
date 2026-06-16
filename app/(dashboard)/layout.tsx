import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { getCompany } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const company = await getCompany();
  return <AppShell careersSlug={company?.slug}>{children}</AppShell>;
}
