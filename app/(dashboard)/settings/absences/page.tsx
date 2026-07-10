import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { AbsenceSettingsPanel } from "@/components/features/absence-settings-panel";

export default async function AbsencesSettingsPage() {
  const supabase = createClient();

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
        title="Ausencias"
        eyebrow="Tipos, políticas y festivos de empresa"
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
