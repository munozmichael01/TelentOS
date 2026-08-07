import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { AbsenceSettingsPanel } from "@/components/features/absence-settings-panel";
import { setRequestLocale, getTranslations } from "next-intl/server";

export default async function AbsencesSettingsPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const supabase = createClient();
  const t = await getTranslations({ locale: params.locale, namespace: "Settings" });

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .limit(1)
    .maybeSingle();

  const [
    { data: absenceTypes },
    { data: allowanceTypes },
    { data: allowancePolicies },
    { data: holidays },
  ] = await Promise.all([
    supabase
      .from("absence_types")
      .select("*, allowance_types(name)")
      .eq("company_id", company?.id ?? "")
      .order("name"),
    supabase
      .from("allowance_types")
      .select("*")
      .eq("company_id", company?.id ?? "")
      .order("name"),
    supabase
      .from("allowance_policies")
      .select("*, allowance_types(name)")
      .eq("company_id", company?.id ?? "")
      .order("name"),
    supabase
      .from("company_holidays")
      .select("*")
      .eq("company_id", company?.id ?? "")
      .order("date"),
  ]);

  return (
    <div>
      <PageHeader
        title={t("absences.title")}
        eyebrow={t("eyebrow")}
        description={t("absences.description")}
      />
      <AbsenceSettingsPanel
        absenceTypes={absenceTypes ?? []}
        allowanceTypes={allowanceTypes ?? []}
        allowancePolicies={allowancePolicies ?? []}
        holidays={holidays ?? []}
      />
    </div>
  );
}
