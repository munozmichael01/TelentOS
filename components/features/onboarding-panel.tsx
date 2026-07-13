"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, notifyError } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import { GeneratorBlock } from "@/components/ui/generator-block";
import type { OnboardingTask } from "@/lib/types";

export function OnboardingPanel({ employeeId, tasks }: { employeeId: string; tasks: OnboardingTask[] }) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState("");

  const done = tasks.filter((t) => t.status === "done").length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

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
    try {
      await apiFetch(`/api/onboarding/${task.id}`, {
        method: "PATCH",
        json: { status: task.status === "done" ? "pending" : "done" },
      });
      router.refresh();
    } catch (e) {
      notifyError("No se pudo actualizar la tarea", e);
    }
  }

  async function remove(taskId: string) {
    try {
      await apiFetch(`/api/onboarding/${taskId}`, { method: "DELETE" });
      router.refresh();
    } catch (e) {
      notifyError("No se pudo eliminar la tarea", e);
    }
  }

  async function addTask() {
    if (!newTitle.trim()) return;
    try {
      await apiFetch("/api/onboarding", {
        method: "POST",
        json: { employee_id: employeeId, title: newTitle },
      });
      setNewTitle("");
      router.refresh();
    } catch (e) {
      notifyError("No se pudo crear la tarea", e);
    }
  }

  const hasAgentTasks = tasks.some((t) => t.generated_by === "agent");

  return (
    <div style={{ maxWidth: "680px", display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* Taller del agente — B-6 GeneratorBlock; la checklist aterriza en la card clara de abajo */}
      <GeneratorBlock
        title="Checklist de onboarding"
        hint="Genero una checklist según el rol y el departamento. La editas, marcas tareas o la regeneras — el seguimiento es tuyo."
        idleLabel={hasAgentTasks ? "Regenerar checklist" : "Generar checklist"}
        busyLabel="Generando…"
        busy={generating}
        onGenerate={generate}
      />

      <div style={{ background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "16px", padding: "20px 22px" }}>
        {/* counter */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
          <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "14px" }}>Tareas</span>
          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "11px", color: "#79746B" }}>
            {done}/{tasks.length}
          </span>
        </div>

        {tasks.length === 0 && !generating && (
          <p style={{ fontSize: "12.5px", lineHeight: 1.45, color: "#79746B", marginBottom: "12px" }}>
            Sin tareas aún. Genera la checklist con el agente arriba o añade tareas manualmente.
          </p>
        )}

        {/* progress bar */}
        {tasks.length > 0 && (
          <div style={{ height: "7px", borderRadius: "99px", background: "#F4F0E8", overflow: "hidden", margin: "0 0 16px" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: "#0E5C4A", transition: "width .2s ease" }} />
          </div>
        )}

        {error && <p style={{ fontSize: "13px", color: "#BD4332", marginBottom: "10px" }}>{error}</p>}

        {/* task list */}
        {tasks.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {tasks.map((t) => {
              const isDone = t.status === "done";
              return (
                <div
                  key={t.id}
                  style={{ display: "flex", alignItems: "center", gap: "11px", padding: "10px 12px", background: "#F4F0E8", border: "1px solid #E7E1D4", borderRadius: "11px" }}
                >
                  <button
                    onClick={() => toggle(t)}
                    style={{
                      width: "18px",
                      height: "18px",
                      flexShrink: 0,
                      borderRadius: "6px",
                      border: `2px solid ${isDone ? "#0E5C4A" : "#C2B8A4"}`,
                      background: isDone ? "#0E5C4A" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    {isDone && (
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <path d="M2.5 6.2l2.3 2.3 4.7-5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                  <span style={{ flex: 1, fontSize: "13.5px", fontWeight: 600, color: isDone ? "#79746B" : "#1A1A17", textDecoration: isDone ? "line-through" : "none" }}>
                    {t.title}
                    {t.due_date && (
                      <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", color: "#9C9588", marginLeft: "8px" }}>
                        {formatDate(t.due_date)}
                      </span>
                    )}
                  </span>
                  <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: "#79746B" }}>
                    {t.assignee || ""}
                  </span>
                  <button
                    onClick={() => remove(t.id)}
                    style={{ background: "none", border: "none", padding: "2px", cursor: "pointer", color: "#C2B8A4", display: "flex", flexShrink: 0 }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* add task */}
        <div style={{ display: "flex", gap: "8px", marginTop: tasks.length > 0 ? "12px" : "4px" }}>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTask()}
            placeholder="Nueva tarea manual…"
            style={{ flex: 1, fontFamily: "'Hanken Grotesk',sans-serif", fontSize: "13.5px", color: "#1A1A17", background: "#F4F0E8", border: "1.5px solid #E7E1D4", borderRadius: "10px", padding: "8px 12px", outline: "none" }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "#0E5C4A"; e.currentTarget.style.boxShadow = "0 0 0 3px #DCEFE4"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "#E7E1D4"; e.currentTarget.style.boxShadow = "none"; }}
          />
          <button
            onClick={addTask}
            disabled={!newTitle.trim()}
            style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: "12.5px", color: "#1A1A17", background: "#F4F0E8", border: "1.5px solid #E7E1D4", borderRadius: "10px", padding: "8px 13px", cursor: newTitle.trim() ? "pointer" : "not-allowed", opacity: newTitle.trim() ? 1 : 0.5 }}
          >
            Añadir
          </button>
        </div>
      </div>
    </div>
  );
}
