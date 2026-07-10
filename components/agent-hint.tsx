import { cn } from "@/lib/utils";

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
