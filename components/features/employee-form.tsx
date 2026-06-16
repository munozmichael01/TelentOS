"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { Employee } from "@/lib/types";

/** Alta manual de empleado, o edición de ficha si recibe `employee`. */
export function EmployeeForm({
  managers,
  employee,
  trigger,
}: {
  managers: { id: string; name: string }[];
  employee?: Employee;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: employee?.name ?? "",
    email: employee?.email ?? "",
    role_title: employee?.role_title ?? "",
    department: employee?.department ?? "",
    start_date: employee?.start_date ?? new Date().toISOString().slice(0, 10),
    contract_type: employee?.contract_type ?? "indefinido",
    manager_id: employee?.manager_id ?? "",
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(employee ? `/api/employees/${employee.id}` : "/api/employees", {
        method: employee ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, manager_id: form.manager_id || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al guardar");
      setOpen(false);
      router.refresh();
      if (!employee) router.push(`/employees/${data.employee.id}`);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>
        {trigger ?? (
          <Button>
            <Plus />
            Nuevo empleado
          </Button>
        )}
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{employee ? "Editar ficha" : "Nuevo empleado"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Cargo</Label>
                <Input value={form.role_title} onChange={(e) => set("role_title", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Departamento</Label>
                <Input value={form.department} onChange={(e) => set("department", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Incorporación</Label>
                <Input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Contrato</Label>
                <Select value={form.contract_type} onValueChange={(v) => set("contract_type", v)}>
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
                <Label>Reporta a</Label>
                <Select value={form.manager_id} onValueChange={(v) => set("manager_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Nadie" /></SelectTrigger>
                  <SelectContent>
                    {managers
                      .filter((m) => m.id !== employee?.id)
                      .map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={!form.name.trim() || saving}>
              {saving && <Loader2 className="animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
