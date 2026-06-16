"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import type { TimeOffRequest } from "@/lib/types";

const STATUS_BADGE: Record<string, "secondary" | "success" | "destructive"> = {
  pending: "secondary",
  approved: "success",
  rejected: "destructive",
};
const STATUS_LABEL: Record<string, string> = {
  pending: "pendiente",
  approved: "aprobada",
  rejected: "rechazada",
};
const TYPE_LABEL: Record<string, string> = { vacation: "Vacaciones", sick: "Baja médica", other: "Otro" };

/** Solicitud + aprobación de ausencias. Aprobar/rechazar es siempre humano. */
export function TimeOffPanel({
  requests,
  employees,
  fixedEmployeeId,
}: {
  requests: TimeOffRequest[];
  employees: { id: string; name: string }[];
  fixedEmployeeId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState(fixedEmployeeId ?? "");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [type, setType] = useState("vacation");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function request() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/timeoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_id: employeeId, start_date: start, end_date: end, type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al solicitar");
      setOpen(false);
      setStart(""); setEnd("");
      router.refresh();
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setSaving(false);
    }
  }

  async function resolve(id: string, status: "approved" | "rejected") {
    await fetch(`/api/timeoff/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus />
          Solicitar ausencia
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            {!fixedEmployeeId && <TableHead>Empleado</TableHead>}
            <TableHead>Tipo</TableHead>
            <TableHead>Fechas</TableHead>
            <TableHead className="text-right">Días</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acción</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((r) => (
            <TableRow key={r.id}>
              {!fixedEmployeeId && <TableCell className="font-medium">{r.employees?.name ?? "—"}</TableCell>}
              <TableCell>{TYPE_LABEL[r.type] ?? r.type}</TableCell>
              <TableCell>{formatDate(r.start_date)} → {formatDate(r.end_date)}</TableCell>
              <TableCell className="text-right">{Number(r.days)}</TableCell>
              <TableCell>
                <Badge variant={STATUS_BADGE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                {r.approver && <span className="ml-2 text-xs text-muted-foreground">{r.approver}</span>}
              </TableCell>
              <TableCell className="text-right">
                {r.status === "pending" && (
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600" onClick={() => resolve(r.id, "approved")} title="Aprobar">
                      <Check />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => resolve(r.id, "rejected")} title="Rechazar">
                      <X />
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
          {requests.length === 0 && (
            <TableRow>
              <TableCell colSpan={fixedEmployeeId ? 5 : 6} className="py-6 text-center text-muted-foreground">
                Sin solicitudes.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar ausencia</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {!fixedEmployeeId && (
              <div className="space-y-1.5">
                <Label>Empleado</Label>
                <Select value={employeeId} onValueChange={setEmployeeId}>
                  <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Desde</Label>
                <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Hasta</Label>
                <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacation">Vacaciones</SelectItem>
                  <SelectItem value="sick">Baja médica</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={request} disabled={!employeeId || !start || !end || saving}>
              {saving && <Loader2 className="animate-spin" />}
              Enviar solicitud
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
