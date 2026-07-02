import { cn } from "@/lib/utils";

/** Affordance inline clara — "esto lo propone un agente; tú decides". Fondo brand-soft. */
export function AgentHint({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-[16px]", className)}
      style={{ background: "#EAF4EF", color: "#1A1A17", border: "1px solid #A8D9BC", padding: "16px 18px" }}
    >
      {children}
    </div>
  );
}

/** Panel oscuro de agente — para planes, rationale y contenido generado por IA. */
export function AgentPanel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-[16px]", className)}
      style={{ background: "#1A1A17", color: "#F4F0E8", padding: "18px 20px" }}
    >
      {children}
    </div>
  );
}
