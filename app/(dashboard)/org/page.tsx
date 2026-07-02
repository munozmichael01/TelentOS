import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { createClient } from "@/lib/supabase/server";
import { OrgChart } from "./OrgChart";
import type { OrgEmployee } from "./OrgChart";

export default async function OrgPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("employees")
    .select("id, name, role_title, department, manager_id")
    .eq("status", "active")
    .order("name");

  const employees = (data ?? []) as OrgEmployee[];

  return (
    <div>
      <PageHeader title="Organigrama" description="Personas" />
      {employees.length === 0 ? (
        <EmptyState
          title="Sin empleados"
          description="Da de alta empleados y asigna managers para ver el organigrama."
        />
      ) : (
        <div style={{ background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: 16, padding: "32px 16px", overflowX: "auto" }}>
          <OrgChart employees={employees} />
        </div>
      )}
    </div>
  );
}
