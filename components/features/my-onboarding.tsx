"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { OnboardingTask } from "@/lib/types";

/**
 * Las tareas de incorporación del empleado, en su portal: puede marcarlas hechas.
 *
 * Solo cambia el estado — crear, editar el enunciado y borrar sigue siendo de RR.HH., y la RLS
 * (migr. 0078) lo sostiene aunque alguien llame al endpoint a mano.
 *
 * Se renderiza únicamente si tiene tareas: la incorporación se acaba, y una sección vacía
 * permanente en el portal de un veterano es ruido.
 */
export function MyOnboarding({ tasks }: { tasks: OnboardingTask[] }) {
  const t = useTranslations("Portal.onboarding");
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  // El servidor tarda ~2,5 s en devolver la lista repintada. Sin marcar la casilla al instante,
  // ese hueco se lee como "no ha pasado nada" y la gente vuelve a pulsar.
  const [optimistic, setOptimistic] = useState<Record<string, string>>({});

  const statusOf = (task: OnboardingTask) => optimistic[task.id] ?? task.status;
  const done = tasks.filter((task) => statusOf(task) === "done").length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  async function toggle(task: OnboardingTask) {
    const next = statusOf(task) === "done" ? "pending" : "done";
    setBusy(task.id);
    setError("");
    setOptimistic((o) => ({ ...o, [task.id]: next }));
    const res = await fetch(`/api/onboarding/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    }).catch(() => null);
    setBusy(null);
    if (!res?.ok) {
      // Se deshace la marca: dejarla puesta mentiría sobre lo que hay guardado.
      setOptimistic((o) => { const c = { ...o }; delete c[task.id]; return c; });
      setError(t("failed"));
      return;
    }
    router.refresh();
  }

  return (
    <div style={{ background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "16px", padding: "22px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px", marginBottom: "12px" }}>
        <h2 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "16px", letterSpacing: "-.3px", margin: 0 }}>
          {t("title")}
        </h2>
        <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: "#79746B" }}>
          {t("done", { done, total: tasks.length })}
        </span>
      </div>

      <div style={{ height: "8px", background: "#E7E1D4", borderRadius: "999px", overflow: "hidden", border: "1px solid #1A1A17", marginBottom: "16px" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "#0E5C4A", borderRadius: "999px", transition: "width .3s" }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {tasks.map((task) => {
          const isDone = statusOf(task) === "done";
          return (
            <button
              key={task.id}
              onClick={() => toggle(task)}
              disabled={busy === task.id}
              title={isDone ? t("markPending") : t("markDone")}
              style={{ display: "flex", alignItems: "flex-start", gap: "10px", textAlign: "left", background: "transparent", border: "none", padding: 0, cursor: "pointer", opacity: busy === task.id ? .6 : 1 }}
            >
              <span style={{ flexShrink: 0, width: "17px", height: "17px", marginTop: "1px", borderRadius: "5px", border: `1.5px solid ${isDone ? "#0E5C4A" : "#CFC7B5"}`, background: isDone ? "#0E5C4A" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {isDone && (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                )}
              </span>
              <span>
                <span style={{ display: "block", fontSize: "13.5px", fontWeight: 600, color: isDone ? "#79746B" : "#1A1A17", textDecoration: isDone ? "line-through" : "none" }}>
                  {task.title}
                </span>
                {task.description && (
                  <span style={{ display: "block", fontSize: "12.5px", color: "#79746B", marginTop: "2px" }}>{task.description}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {error && <p style={{ fontSize: "13px", color: "#BD4332", margin: "12px 0 0" }}>{error}</p>}
    </div>
  );
}
