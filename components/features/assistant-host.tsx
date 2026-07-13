"use client";

/**
 * Host del Asistente de plataforma (S4): estado del hilo, contexto por pantalla,
 * sugerencias por módulo, invocación (sparkle topbar + ⌘J) y render de burbujas.
 * Burbujas: agente en tinta (la voz), usuario en papel (blueprint B-4).
 */

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AssistantDrawer } from "@/components/ui/assistant-drawer";
import { AgentBadge } from "@/components/ui/agent-badge";
import { IconSparkle } from "@/components/ui/icons";
import { apiFetch } from "@/lib/api-client";

type Msg = {
  role: "user" | "assistant";
  content: string;
  links?: { label: string; href: string }[];
  source?: "ok" | "fallback";
};

type AssistantReply = {
  answer: string;
  links: { label: string; href: string }[];
  suggested_questions: string[];
  _status: "ok" | "fallback";
};

/** Contexto y sugerencias por módulo (el vertical es un chip, no otro chat). */
function moduleContext(pathname: string): { label: string | null; suggestions: string[] } {
  if (pathname.startsWith("/payroll"))
    return {
      label: "Payroll",
      suggestions: ["¿Cómo va la nómina de este mes?", "¿Quién está activo sin perfil salarial?"],
    };
  if (pathname.startsWith("/employees") || pathname.startsWith("/org"))
    return {
      label: "Personas",
      suggestions: ["¿Cuántos empleados activos hay por departamento?", "¿Quién está de vacaciones esta semana?"],
    };
  if (pathname.startsWith("/timeoff"))
    return {
      label: "Ausencias",
      suggestions: ["¿Qué ausencias se solapan este mes?", "¿Quién falta hoy?"],
    };
  if (pathname.startsWith("/canales"))
    return {
      label: "Canales",
      suggestions: ["¿Qué canal trae más candidaturas?", "¿Hay campañas estancadas?"],
    };
  if (pathname.startsWith("/jobs") || pathname.startsWith("/candidates"))
    return {
      label: "Reclutamiento",
      suggestions: ["¿Cómo va el pipeline?", "¿Quiénes son los mejores candidatos por fit?"],
    };
  return {
    label: null,
    suggestions: ["¿Cuántos empleados activos hay?", "¿Cómo va el pipeline de reclutamiento?", "¿Cómo va la nómina?"],
  };
}

/** Botón de topbar (estilo campana/ayuda) que invoca el asistente. */
export function AssistantTrigger() {
  return (
    <button
      onClick={() => window.dispatchEvent(new Event("assistant:toggle"))}
      aria-label="Abrir asistente (⌘J)"
      title="Asistente · ⌘J"
      style={{ width: "36px", height: "36px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", color: "#0E5C4A", background: "none", border: "none", cursor: "pointer" }}
    >
      <IconSparkle />
    </button>
  );
}

export function AssistantHost() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [context, setContext] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const threadRef = useRef<HTMLDivElement>(null);

  // ⌘J abre/cierra; Esc cierra; el trigger de la topbar dispara "assistant:toggle"
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    function onToggle() {
      setOpen((o) => !o);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("assistant:toggle", onToggle);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("assistant:toggle", onToggle);
    };
  }, []);

  // Al abrir, precarga el contexto del módulo actual (descartable)
  useEffect(() => {
    if (open) {
      const ctx = moduleContext(pathname);
      setContext((c) => c ?? ctx.label);
      if (msgs.length === 0) setSuggestions(ctx.suggestions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pathname]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy]);

  async function ask(q: string) {
    const query = q.trim();
    if (!query || busy) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", content: query }]);
    setBusy(true);
    try {
      const res = await apiFetch<AssistantReply>("/api/agents/assistant", {
        method: "POST",
        json: {
          query,
          context,
          history: msgs.map((m) => ({ role: m.role, content: m.content })),
        },
      });
      setMsgs((m) => [...m, { role: "assistant", content: res.answer, links: res.links, source: res._status }]);
      if (res.suggested_questions?.length) setSuggestions(res.suggested_questions);
    } catch {
      setMsgs((m) => [
        ...m,
        { role: "assistant", content: "No pude responder ahora mismo. Inténtalo de nuevo.", source: "fallback" },
      ]);
    } finally {
      setBusy(false);
    }
  }

  // El trigger vive en la topbar del AppShell (nunca burbuja flotante — anti-patrón #1)
  return (
    <>
      <AssistantDrawer
        open={open}
        context={context}
        onClose={() => setOpen(false)}
        onDismissContext={() => setContext(null)}
        footer={
          <div style={{ padding: "12px 14px", borderTop: "1px solid #E7E1D4" }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void ask(input);
              }}
              style={{ display: "flex", alignItems: "center", gap: "8px", background: "#F4F0E8", border: "1px solid #E7E1D4", borderRadius: "11px", padding: "9px 12px" }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={context ? `Pregunta sobre ${context.toLowerCase()}…` : "Pregunta sobre tu empresa…"}
                aria-label="Pregunta al asistente"
                style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: "13px", color: "#1A1A17", fontFamily: "'Hanken Grotesk',sans-serif" }}
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                aria-label="Enviar"
                style={{ background: "none", border: "none", color: busy || !input.trim() ? "#B4B0A6" : "#0E5C4A", cursor: busy ? "default" : "pointer", display: "inline-flex", fontWeight: 800 }}
              >
                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden>
                  <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </form>
          </div>
        }
      >
        <div ref={threadRef} style={{ display: "flex", flexDirection: "column", gap: "10px", overflowY: "auto", flex: 1 }}>
          {msgs.length === 0 && (
            <p style={{ fontSize: "12.5px", color: "#79746B", lineHeight: 1.5, margin: 0 }}>
              Pregunta sobre tu equipo, ausencias, reclutamiento, canales o nómina. Solo verás datos que tu rol permite.
            </p>
          )}
          {msgs.map((m, i) =>
            m.role === "user" ? (
              <div
                key={i}
                style={{ alignSelf: "flex-end", maxWidth: "88%", background: "#F4F0E8", border: "1px solid #E7E1D4", borderRadius: "12px 12px 4px 12px", padding: "8px 11px", fontSize: "13px" }}
              >
                {m.content}
              </div>
            ) : (
              <div
                key={i}
                style={{ alignSelf: "flex-start", maxWidth: "94%", background: "#1A1A17", color: "#F4F0E8", borderRadius: "12px 12px 12px 4px", padding: "10px 12px" }}
              >
                <div style={{ fontSize: "13px", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{m.content}</div>
                {(m.links?.length || m.source === "fallback") && (
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px", marginTop: "8px" }}>
                    {m.links?.map((l) => (
                      <button
                        key={l.href}
                        onClick={() => router.push(l.href)}
                        style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: "#C6F24E", background: "rgba(198,242,78,.1)", border: "1px solid rgba(198,242,78,.3)", borderRadius: "999px", padding: "3px 10px", cursor: "pointer" }}
                      >
                        {l.label} →
                      </button>
                    ))}
                    {m.source === "fallback" && <AgentBadge kind="heuristica" onDark />}
                  </div>
                )}
              </div>
            ),
          )}
          {busy && (
            <div style={{ alignSelf: "flex-start", background: "#1A1A17", color: "#8C877E", borderRadius: "12px 12px 12px 4px", padding: "10px 14px", fontSize: "12.5px" }}>
              Consultando…
            </div>
          )}
          {!busy && suggestions.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "2px" }}>
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => void ask(s)}
                  style={{ fontSize: "11px", padding: "4px 10px", border: "1px dashed #CFC7B5", borderRadius: "999px", color: "#79746B", background: "none", cursor: "pointer" }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </AssistantDrawer>
    </>
  );
}
