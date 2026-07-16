import { PageHeader } from "@/components/page-header";
import { CompensationPanel } from "@/components/features/compensation-panel";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth-guard";
import type { Employee } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CompensacionPage() {
  await requireRole(["owner", "hr_admin"]);
  const supabase = createClient();

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .limit(1)
    .maybeSingle();

  const { data: employees } = await supabase
    .from("employees")
    .select("id, name")
    .eq("status", "active")
    .eq("company_id", company?.id ?? "")
    .order("name");

  return (
    <div>
      <PageHeader
        title="Banco de horas"
        eyebrow="Horas"
        description="Gestión de horas extra y compensaciones."
      />
      <CompensationPanel
        employees={(employees ?? []) as Pick<Employee, "id" | "name">[]}
      />
    </div>
  );
}
