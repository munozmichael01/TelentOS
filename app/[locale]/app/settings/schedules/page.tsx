import { PageHeader } from "@/components/page-header";
import { ScheduleSettingsPanel } from "@/components/features/schedule-settings-panel";
import { createClient } from "@/lib/supabase/server";
import type { WorkScheduleTemplate } from "@/lib/types";

export default async function SchedulesSettingsPage() {
  const supabase = createClient();

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .limit(1)
    .maybeSingle();

  const { data: templates } = await supabase
    .from("work_schedule_templates")
    .select(
      "*, weeks:work_schedule_weeks(*, days:work_schedule_days(*))"
    )
    .eq("company_id", company?.id ?? "")
    .order("name");

  return (
    <div>
      <PageHeader
        title="Horarios"
        eyebrow="Ajustes"
        description="Plantillas de horario laboral para tus empleados."
      />
      <ScheduleSettingsPanel
        templates={templates as never ?? []}
      />
    </div>
  );
}
