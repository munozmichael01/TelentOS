"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FitBadge } from "@/components/fit-badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { initials } from "@/lib/utils";
import type { Application, JobStage } from "@/lib/types";

/**
 * Kanban del pipeline. Mover de etapa exige un motivo (trazabilidad): el
 * movimiento abre un diálogo y queda registrado quién/cuándo/por qué.
 */
export function PipelineBoard({
  stages,
  applications,
}: {
  stages: JobStage[];
  applications: Application[];
}) {
  const router = useRouter();
  const [moving, setMoving] = useState<Application | null>(null);
  const [targetStage, setTargetStage] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function confirmMove() {
    if (!moving || !targetStage) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/applications/${moving.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage_id: targetStage, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al mover");
      setMoving(null);
      setReason("");
      router.refresh();
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const apps = applications.filter((a) => a.stage_id === stage.id);
          return (
            <div key={stage.id} className="w-60 shrink-0 rounded-lg bg-muted/60 p-2">
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-sm font-semibold">{stage.name}</span>
                <span className="rounded-full bg-background px-2 text-xs text-muted-foreground">{apps.length}</span>
              </div>
              <div className="space-y-2">
                {apps.map((app) => (
                  <div key={app.id} className="rounded-md border bg-card p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/applications/${app.id}`} className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                            {initials(app.candidates?.name ?? "?")}
                          </span>
                          <span className="truncate text-sm font-medium hover:underline">
                            {app.candidates?.name}
                          </span>
                        </div>
                      </Link>
                      <FitBadge score={app.fit_score} />
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">
                        {app.utm?.utm_source === "career_site" ? "Career site" : app.utm?.utm_source || app.source}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => {
                          setMoving(app);
                          setTargetStage("");
                        }}
                      >
                        Mover →
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!moving} onOpenChange={(open) => !open && setMoving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mover a {moving?.candidates?.name}</DialogTitle>
            <DialogDescription>
              El cambio queda registrado en el historial con tu usuario y el motivo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Etapa destino</Label>
              <Select value={targetStage} onValueChange={setTargetStage}>
                <SelectTrigger><SelectValue placeholder="Selecciona etapa" /></SelectTrigger>
                <SelectContent>
                  {stages
                    .filter((s) => s.id !== moving?.stage_id)
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Motivo</Label>
              <Textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ej.: screening superado, encaje salarial confirmado"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoving(null)}>Cancelar</Button>
            <Button onClick={confirmMove} disabled={!targetStage || saving}>
              {saving && <Loader2 className="animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
