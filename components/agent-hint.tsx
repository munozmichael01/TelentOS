import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/** Marca visual común de "esto lo propone un agente; tú decides". */
export function AgentHint({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm", className)}>
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
