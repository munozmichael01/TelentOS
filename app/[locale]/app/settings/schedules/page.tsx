import { PageHeader } from "@/components/page-header";
import { ScheduleSettingsPanel } from "@/components/features/schedule-settings-panel";
import { createClient } from "@/lib/supabase/server";
import type { WorkScheduleTemplate } from "@/lib/types";
import { setRequestLocale, getTranslations } from "next-intl/server";

export default async function SchedulesSettingsPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const supabase = createClient();
  const t = await getTranslations({ locale: params.locale, namespace: "Settings" });

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
        title={t("schedules.title")}
        eyebrow={t("eyebrow")}
        description={t("schedules.description")}
      />
      <ScheduleSettingsPanel
        templates={templates as never ?? []}
      />
    </div>
  );
}
