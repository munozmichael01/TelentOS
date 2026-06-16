import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmployeeForm } from "@/components/features/employee-form";
import { OnboardingPanel } from "@/components/features/onboarding-panel";
import { TimesheetForm } from "@/components/features/timesheet-form";
import { TimeOffPanel } from "@/components/features/timeoff-panel";
import { DocumentUploader } from "@/components/features/document-uploader";
import { FileLink } from "@/components/features/file-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import type { Employee, OnboardingTask, TimeOffRequest } from "@/lib/types";

export default async function EmployeePage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: employee } = await supabase.from("employees").select("*").eq("id", params.id).maybeSingle();
  if (!employee) notFound();
  const emp = employee as Employee;

  const [{ data: manager }, { data: all }, { data: tasks }, { data: docs }, { data: hours }, { data: timeoff }] =
    await Promise.all([
      emp.manager_id
        ? supabase.from("employees").select("id, name").eq("id", emp.manager_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("employees").select("id, name").eq("status", "active"),
      supabase.from("onboarding_tasks").select("*").eq("employee_id", params.id).order("order_index"),
      supabase.from("employee_documents").select("*").eq("employee_id", params.id).order("created_at", { ascending: false }),
      supabase.from("timesheets").select("*").eq("employee_id", params.id).order("work_date", { ascending: false }).limit(30),
      supabase.from("time_off_requests").select("*").eq("employee_id", params.id).order("created_at", { ascending: false }),
    ]);

  const approvedDays = (timeoff ?? [])
    .filter((r) => r.type === "vacation" && r.status === "approved")
    .reduce((acc, r) => acc + Number(r.days), 0);
  const balance = emp.vacation_days_total - approvedDays;

  return (
    <div>
      <Link href="/employees" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />
        Empleados
      </Link>
      <PageHeader
        title={emp.name}
        description={[emp.role_title, emp.department, emp.email].filter(Boolean).join(" · ")}
      >
        <EmployeeForm
          employee={emp}
          managers={(all ?? []).map((e) => ({ id: e.id, name: e.name }))}
          trigger={<Button variant="outline"><Pencil />Editar ficha</Button>}
        />
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Incorporación</p><p className="font-medium">{formatDate(emp.start_date)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Contrato</p><p className="font-medium capitalize">{emp.contract_type}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Reporta a</p><p className="font-medium">{manager?.name ?? "—"}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Vacaciones disponibles</p><p className="font-medium">{balance} / {emp.vacation_days_total} días</p></CardContent></Card>
      </div>

      <Tabs defaultValue="onboarding">
        <TabsList>
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
          <TabsTrigger value="documents">Documentos ({(docs ?? []).length})</TabsTrigger>
          <TabsTrigger value="timesheets">Horas</TabsTrigger>
          <TabsTrigger value="timeoff">Vacaciones</TabsTrigger>
        </TabsList>

        <TabsContent value="onboarding">
          <OnboardingPanel employeeId={emp.id} tasks={(tasks ?? []) as OnboardingTask[]} />
        </TabsContent>

        <TabsContent value="documents">
          <div className="space-y-4">
            <DocumentUploader employeeId={emp.id} />
            <div className="space-y-2">
              {(docs ?? []).map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-md border p-3">
                  <FileLink bucket="documents" path={d.file_url} label={d.name} />
                  <span className="text-xs text-muted-foreground">{formatDate(d.created_at)}</span>
                </div>
              ))}
              {(docs ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">Sin documentos adjuntos.</p>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="timesheets">
          <div className="space-y-4">
            <TimesheetForm employees={[]} fixedEmployeeId={emp.id} />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Horas</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(hours ?? []).map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>{formatDate(h.work_date)}</TableCell>
                    <TableCell className="text-right font-medium">{Number(h.hours)}</TableCell>
                    <TableCell className="text-muted-foreground">{h.notes ?? "—"}</TableCell>
                  </TableRow>
                ))}
                {(hours ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={3} className="py-6 text-center text-muted-foreground">Sin registros.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="timeoff">
          <div className="space-y-2">
            <Badge variant="secondary">Saldo disponible: {balance} días</Badge>
            <TimeOffPanel
              requests={(timeoff ?? []) as TimeOffRequest[]}
              employees={[]}
              fixedEmployeeId={emp.id}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
