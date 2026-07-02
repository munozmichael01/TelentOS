import { PageHeader } from "@/components/page-header";
import { ComplianceSettingsPanel } from "@/components/features/compliance-settings-panel";
import { createClient } from "@/lib/supabase/server";
import type { ComplianceConfig, ComplianceViolation } from "@/lib/types";

export default async function CompliancePage() {
  const supabase = createClient();

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .limit(1)
    .maybeSingle();

  const [{ data: config }, { data: violations }] = await Promise.all([
    supabase
      .from("compliance_config")
      .select("*")
      .eq("company_id", company?.id ?? "")
      .maybeSingle(),
    supabase
      .from("compliance_violations")
      .select("*, employees!employee_id(name)")
      .eq("company_id", company?.id ?? "")
      .is("acknowledged_at", null)
      .order("date", { ascending: false })
      .limit(20),
  ]);

  return (
    <div>
      <PageHeader
        title="Compliance"
        description="Reglas de tiempo de trabajo y alertas de incumplimiento"
      />
      <ComplianceSettingsPanel
        config={(config ?? null) as ComplianceConfig | null}
        violations={(violations ?? []) as unknown as ComplianceViolation[]}
        companyId={company?.id ?? ""}
      />
    </div>
  );
}
