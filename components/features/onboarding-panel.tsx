"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatDate } from "@/lib/utils";
import type { OnboardingTask } from "@/lib/types";

/**
 * Checklist de onboarding. El agente genera la propuesta inicial según rol y
 * departamento; cada tarea es editable/eliminable y el seguimiento es humano.
 */
export function OnboardingPanel({ employeeId, tasks }: { employeeId: string; tasks: OnboardingTask[] }) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState("");

  const done = tasks.filter((t) => t.status === "done").length;
  const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  async function generate() {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/agents/onboarding-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, persist: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error del agente");
      router.refresh();
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setGenerating(false);
    }
  }

  async function toggle(task: OnboardingTask) {
    await fetch(`/api/onboarding/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: task.status === "done" ? "pending" : "done" }),
    });
    router.refresh();
  }

  async function remove(taskId: string) {
    await fetch(`/api/onboarding/${taskId}`, { method: "DELETE" });
    router.refresh();
  }

  async function addTask() {
    await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employee_id: employeeId, title: newTitle }),
    });
    setNewTitle("");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-48 flex-1 items-center gap-3">
          <Progress value={progress} className="max-w-xs" />
          <span className="text-sm text-muted-foreground">{done}/{tasks.length} completadas</span>
        </div>
        <Button size="sm" variant="outline" className="border-primary/40 text-primary hover:text-primary" onClick={generate} disabled={generating}>
          {generating ? <Loader2 className="animate-spin" /> : <Sparkles />}
          Generar checklist con IA
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="space-y-2">
        {tasks.map((t) => (
          <div key={t.id} className="flex items-start gap-3 rounded-md border p-3">
            <input type="checkbox" className="mt-1" checked={t.status === "done"} onChange={() => toggle(t)} />
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium ${t.status === "done" ? "text-muted-foreground line-through" : ""}`}>
                {t.title}
              </p>
              {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {t.assignee && <span>Responsable: {t.assignee}</span>}
                {t.due_date && <span>· {formatDate(t.due_date)}</span>}
                {t.generated_by === "agent" && <Badge variant="outline" className="h-4 px-1 text-[10px]">IA</Badge>}
              </div>
            </div>
            <button onClick={() => remove(t.id)} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {tasks.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Sin tareas de onboarding. Genera el checklist con el agente o añade tareas manualmente.
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Nueva tarea manual…"
          onKeyDown={(e) => e.key === "Enter" && newTitle.trim() && addTask()}
        />
        <Button variant="secondary" onClick={addTask} disabled={!newTitle.trim()}>
          <Plus />
          Añadir
        </Button>
      </div>
    </div>
  );
}
