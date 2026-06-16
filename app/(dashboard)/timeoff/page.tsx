import { PageHeader } from "@/components/page-header";
import { TimeOffPanel } from "@/components/features/timeoff-panel";
import { createClient } from "@/lib/supabase/server";
import type { TimeOffRequest } from "@/lib/types";

export default async function TimeOffPage() {
  const supabase = createClient();
  const [{ data: requests }, { data: employees }] = await Promise.all([
    supabase
      .from("time_off_requests")
      .select("*, employees(id, name, vacation_days_total)")
      .order("created_at", { ascending: false }),
    supabase.from("employees").select("id, name").eq("status", "active").order("name"),
  ]);

  return (
    <div>
      <PageHeader
        title="Vacaciones y ausencias"
        description="Solicitudes, aprobación y saldo. La aprobación es siempre una decisión humana."
      />
      <TimeOffPanel requests={(requests ?? []) as unknown as TimeOffRequest[]} employees={employees ?? []} />
    </div>
  );
}
