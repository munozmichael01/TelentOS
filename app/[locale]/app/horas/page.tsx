import { PageHeader } from "@/components/page-header";
import { TimeTrackingPanel } from "@/components/features/time-tracking-panel";
import { createClient } from "@/lib/supabase/server";
import type { TimeEntry, TimerState } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HorasPage() {
  const supabase = createClient();

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .limit(1)
    .maybeSingle();

  const today = new Date().toISOString().split("T")[0];

  // Current week bounds (Mon–Sun)
  const now = new Date();
  const dow = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dow + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const weekStart = monday.toISOString().split("T")[0];
  const weekEnd = sunday.toISOString().split("T")[0];

  const [
    { data: activeTimers },
    { data: todayEntries },
    { data: employees },
    { data: weekEntries },
  ] = await Promise.all([
    supabase
      .from("timer_state")
      .select("*, employees(id, name, role_title)")
      .order("started_at"),

    supabase
      .from("time_entries")
      .select("*, employees(name, role_title)")
      .eq("company_id", company?.id ?? "")
      .eq("date", today)
      .order("start_time"),

    supabase
      .from("employees")
      .select("id, name")
      .eq("status", "active")
      .eq("company_id", company?.id ?? "")
      .order("name"),

    supabase
      .from("time_entries")
      .select("id, employee_id, date, entry_type, duration_minutes")
      .eq("company_id", company?.id ?? "")
      .gte("date", weekStart)
      .lte("date", weekEnd),
  ]);

  return (
    <div>
      <PageHeader
        title="Registro de horas"
        eyebrow="Horas"
        description="Fichajes del día y entradas manuales."
      />
      <TimeTrackingPanel
        activeTimers={(activeTimers ?? []) as unknown as (TimerState & { employees?: { id: string; name: string; role_title: string | null } | null })[]}
        todayEntries={(todayEntries ?? []) as unknown as TimeEntry[]}
        employees={employees ?? []}
        allEntries={(weekEntries ?? []) as unknown as TimeEntry[]}
      />
    </div>
  );
}
