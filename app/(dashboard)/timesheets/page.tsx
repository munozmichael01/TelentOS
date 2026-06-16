import { PageHeader } from "@/components/page-header";
import { TimesheetForm } from "@/components/features/timesheet-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export default async function TimesheetsPage() {
  const supabase = createClient();
  const [{ data: employees }, { data: entries }] = await Promise.all([
    supabase.from("employees").select("id, name").eq("status", "active").order("name"),
    supabase
      .from("timesheets")
      .select("*, employees(name)")
      .order("work_date", { ascending: false })
      .limit(50),
  ]);

  return (
    <div>
      <PageHeader title="Registro de horas" description="Registro básico de horas por empleado." />
      <div className="mb-6">
        <TimesheetForm employees={employees ?? []} />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Empleado</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead className="text-right">Horas</TableHead>
            <TableHead>Notas</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(entries ?? []).map((t) => (
            <TableRow key={t.id}>
              <TableCell className="font-medium">{(t.employees as unknown as { name: string } | null)?.name}</TableCell>
              <TableCell>{formatDate(t.work_date)}</TableCell>
              <TableCell className="text-right">{Number(t.hours)}</TableCell>
              <TableCell className="text-muted-foreground">{t.notes ?? "—"}</TableCell>
            </TableRow>
          ))}
          {(entries ?? []).length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">Sin registros.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
