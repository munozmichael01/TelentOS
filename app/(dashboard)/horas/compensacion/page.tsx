import { PageHeader } from "@/components/page-header";
import { CompensationPanel } from "@/components/features/compensation-panel";
import { createClient } from "@/lib/supabase/server";
import type { CompensationRecord, Employee } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CompensacionPage() {
  const supabase = createClient();

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .limit(1)
    .maybeSingle();

  const [{ data: records }, { data: employees }] = await Promise.all([
    supabase
      .from("compensation_records")
      .select("*, employees(name, role_title)")
      .eq("company_id", company?.id ?? "")
      .order("period_end", { ascending: false }),
    supabase
      .from("employees")
      .select("id, name")
      .eq("status", "active")
      .eq("company_id", company?.id ?? "")
      .order("name"),
  ]);

  return (
    <div>
      <PageHeader
        title="Banco de horas"
        description="Gestión de horas extra y compensaciones"
      />
      <CompensationPanel
        records={(records ?? []) as unknown as CompensationRecord[]}
        employees={(employees ?? []) as Pick<Employee, "id" | "name">[]}
      />
    </div>
  );
}
