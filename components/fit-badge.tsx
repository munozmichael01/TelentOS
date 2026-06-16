import { cn } from "@/lib/utils";

/** Score de fit 0–100 con semáforo de color. */
export function FitBadge({ score }: { score: number | null }) {
  if (score == null) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span
      className={cn(
        "inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-xs font-bold",
        score >= 75
          ? "bg-emerald-100 text-emerald-700"
          : score >= 50
            ? "bg-amber-100 text-amber-700"
            : "bg-red-100 text-red-700"
      )}
      title={`Fit score: ${score}/100`}
    >
      {score}
    </span>
  );
}
