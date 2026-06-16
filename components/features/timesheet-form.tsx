"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export function TimesheetForm({
  employees,
  fixedEmployeeId,
}: {
  employees: { id: string; name: string }[];
  fixedEmployeeId?: string;
}) {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState(fixedEmployeeId ?? "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [hours, setHours] = useState("8");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/timesheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_id: employeeId, work_date: date, hours: Number(hours), notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al registrar");
      setNotes("");
      router.refresh();
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {!fixedEmployeeId && (
          <Select value={employeeId} onValueChange={setEmployeeId}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Empleado" /></SelectTrigger>
            <SelectContent>
              {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Input type="date" className="w-40" value={date} onChange={(e) => setDate(e.target.value)} />
        <Input type="number" step="0.5" min="0.5" max="24" className="w-24" value={hours} onChange={(e) => setHours(e.target.value)} />
        <Input className="w-56 flex-1" placeholder="Notas (proyecto, tarea…)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <Button onClick={save} disabled={!employeeId || !date || saving}>
          {saving ? <Loader2 className="animate-spin" /> : <Plus />}
          Registrar
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
