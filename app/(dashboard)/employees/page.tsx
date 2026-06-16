import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { EmployeeForm } from "@/components/features/employee-form";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import type { Employee } from "@/lib/types";

export default async function EmployeesPage() {
  const supabase = createClient();
  const { data: employees } = await supabase
    .from("employees")
    .select("*")
    .order("name");

  const list = (employees ?? []) as Employee[];
  const byId = new Map(list.map((e) => [e.id, e]));

  return (
    <div>
      <PageHeader title="Empleados" description="Directorio del equipo. Los contratados desde el ATS llegan aquí automáticamente.">
        <EmployeeForm managers={list.map((e) => ({ id: e.id, name: e.name }))} />
      </PageHeader>

      {list.length === 0 ? (
        <EmptyState
          title="Sin empleados"
          description="Contrata desde el pipeline de una oferta o da de alta manualmente."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead>Incorporación</TableHead>
              <TableHead>Contrato</TableHead>
              <TableHead>Reporta a</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((e) => (
              <TableRow key={e.id}>
                <TableCell>
                  <Link href={`/employees/${e.id}`} className="font-medium hover:underline">{e.name}</Link>
                  {e.candidate_id && <Badge variant="outline" className="ml-2 text-[10px]">vía ATS</Badge>}
                </TableCell>
                <TableCell>{e.role_title ?? "—"}</TableCell>
                <TableCell>{e.department ?? "—"}</TableCell>
                <TableCell>{formatDate(e.start_date)}</TableCell>
                <TableCell className="capitalize">{e.contract_type}</TableCell>
                <TableCell className="text-muted-foreground">
                  {e.manager_id ? byId.get(e.manager_id)?.name ?? "—" : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
