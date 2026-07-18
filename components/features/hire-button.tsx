"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateField } from "@/components/ui/date-field";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

/** Contratar = promover candidato → empleado sin reintroducir datos. */
export function HireButton({
  applicationId,
  candidateName,
  managers,
  disabled,
}: {
  applicationId: string;
  candidateName: string;
  managers: { id: string; name: string }[];
  disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [contractType, setContractType] = useState("indefinido");
  const [managerId, setManagerId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function hire() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/applications/${applicationId}/hire`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_date: startDate,
          contract_type: contractType,
          manager_id: managerId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al contratar");
      router.push(`/app/employees/${data.employee_id}`);
      router.refresh();
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
      setSaving(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={disabled}>
        <UserCheck />
        Contratar
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contratar a {candidateName}</DialogTitle>
            <DialogDescription>
              Se creará la ficha de empleado con los datos del candidato (continuidad ATS → HRIS) y la candidatura pasará a “Contratado”.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Fecha de incorporación</Label>
              <DateField value={startDate} onChange={setStartDate} />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de contrato</Label>
              <Select value={contractType} onValueChange={setContractType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="indefinido">Indefinido</SelectItem>
                  <SelectItem value="temporal">Temporal</SelectItem>
                  <SelectItem value="practicas">Prácticas</SelectItem>
                  <SelectItem value="freelance">Freelance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Manager (reporta a)</Label>
              <Select value={managerId} onValueChange={setManagerId}>
                <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                <SelectContent>
                  {managers.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={hire} disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              Confirmar contratación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
