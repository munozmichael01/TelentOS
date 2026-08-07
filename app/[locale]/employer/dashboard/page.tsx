import { createClient } from "@/lib/supabase/server";
import { getDashboardData } from "@/lib/dashboard";
import { DashboardClient } from "@/components/features/dashboard-client";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const data = await getDashboardData(user?.id ?? "");

  return (
    <DashboardClient
      data={data}
      userEmail={user?.email ?? ""}
    />
  );
}
