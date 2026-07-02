"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
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
    if (!newTitle.trim()) return;
    await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employee_id: employeeId, title: newTitle }),
    });
    setNewTitle("");
    router.refresh();
  }

  return (
    <div style={{ maxWidth: "680px" }}>
      <div style={{ background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "16px", padding: "20px 22px" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
          <span style={{ width: "24px", height: "24px", borderRadius: "7px", background: "#1A1A17", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M5 19l1-4 9-9 3 3-9 9-4 1ZM14 6l3 3" stroke="#C6F24E" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
          </span>
          <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "15px" }}>Onboarding</span>
          <span style={{ marginLeft: "auto", fontFamily: "'Space Mono',monospace", fontSize: "11px", color: "#79746B" }}>
            {done}/{tasks.length}
          </span>
          <button
            onClick={generate}
            disabled={generating}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: "12px", color: "#0E5C4A", background: "#DCEFE4", border: "1px solid #BFE0D2", borderRadius: "9px", padding: "6px 11px", cursor: generating ? "not-allowed" : "pointer" }}
          >
            {generating ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M5 19l1-4 9-9 3 3-9 9-4 1ZM14 6l3 3" stroke="#0E5C4A" strokeWidth="2" strokeLinejoin="round"/>
              </svg>
            )}
            Regenerar con IA
          </button>
        </div>

        {/* agent hint banner */}
        {tasks.some((t) => t.generated_by === "agent") && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: "9px", background: "#DCEFE4", border: "1px solid #BFE0D2", borderRadius: "11px", padding: "10px 12px", margin: "12px 0 4px" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: "1px" }}>
              <path d="M5 19l1-4 9-9 3 3-9 9-4 1ZM14 6l3 3" stroke="#0E5C4A" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: "12px", lineHeight: 1.45, color: "#2C5247" }}>
              El <b>agente de onboarding</b> propuso esta checklist según el rol y departamento. Edítala, marca tareas o regenérala — el seguimiento es tuyo.
            </span>
          </div>
        )}

        {tasks.length === 0 && !generating && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: "9px", background: "#DCEFE4", border: "1px solid #BFE0D2", borderRadius: "11px", padding: "10px 12px", margin: "12px 0 4px" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: "1px" }}>
              <path d="M5 19l1-4 9-9 3 3-9 9-4 1ZM14 6l3 3" stroke="#0E5C4A" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: "12px", lineHeight: 1.45, color: "#2C5247" }}>
              Sin tareas aún. Pulsa <b>Regenerar con IA</b> para que el agente genere la checklist según el rol y departamento, o añade tareas manualmente.
            </span>
          </div>
        )}

        {/* progress bar */}
        {tasks.length > 0 && (
          <div style={{ height: "7px", borderRadius: "99px", background: "#F4F0E8", overflow: "hidden", margin: "10px 0 16px" }}>
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
