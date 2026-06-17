import { cn } from "@/lib/utils";

/** Affordance inline "esto lo propone un agente; tú decides" — fondo claro. */
export function AgentHint({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-[16px]", className)}
      style={{ background: "#1A1A17", color: "#F4F0E8", padding: "18px 20px" }}
    >
      {children}
    </div>
  );
}

/** Panel oscuro estándar de agente — igual que AgentHint pero nominalmente distinto para evitar ambigüedad. */
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
