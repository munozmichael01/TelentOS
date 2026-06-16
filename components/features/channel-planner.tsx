"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AgentHint } from "@/components/agent-hint";
import { formatMoney } from "@/lib/utils";
import type { Campaign } from "@/lib/types";
import type { ChannelPlan } from "@/agents/agent-channel-optimizer";

/**
 * Distribución de la oferta: el agente propone el plan (canales, presupuesto,
 * copy por canal) y el humano selecciona qué activar. Las campañas activas se
 * monitorizan con métricas simuladas (mock de integraciones reales).
 */
export function ChannelPlanner({ jobId, campaigns }: { jobId: string; campaigns: Campaign[] }) {
  const router = useRouter();
  const [objective, setObjective] = useState<"volume" | "quality" | "cpa">("volume");
  const [budget, setBudget] = useState("500");
  const [plan, setPlan] = useState<ChannelPlan | null>(null);
  const [planMode, setPlanMode] = useState<"ok" | "fallback" | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [activating, setActivating] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState("");

  async function optimize() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/agents/channel-optimizer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, objective, budget: Number(budget) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error del agente");
      setPlan(data.output);
      setPlanMode(data.status);
      setSelected(new Set(data.output.recommendations.map((r: { channel_id: string }) => r.channel_id)));
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setLoading(false);
    }
  }

  async function activate() {
    if (!plan) return;
    setActivating(true);
    setError("");
    try {
      const selections = plan.recommendations
        .filter((r) => selected.has(r.channel_id))
        .map((r) => ({ channel_id: r.channel_id, budget: r.budget, priority: r.priority, copy: r.copy }));
      const res = await fetch(`/api/jobs/${jobId}/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selections, objective }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al activar canales");
      setPlan(null);
      router.refresh();
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setActivating(false);
    }
  }

  async function simulate() {
    setSimulating(true);
    await fetch("/api/campaigns/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId }),
    });
    setSimulating(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Agente de optimización de canales
          </CardTitle>
          <CardDescription>
            Define objetivo y presupuesto; el agente recomienda canales, reparto y copy según la performance histórica.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label>Objetivo</Label>
              <Select value={objective} onValueChange={(v) => setObjective(v as typeof objective)}>
                <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="volume">Volumen de candidatos</SelectItem>
                  <SelectItem value="quality">Calidad de candidatos</SelectItem>
                  <SelectItem value="cpa">Minimizar coste por aplicación</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Presupuesto (€)</Label>
              <Input type="number" className="w-32" value={budget} onChange={(e) => setBudget(e.target.value)} />
            </div>
            <Button onClick={optimize} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
              Optimizar
            </Button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {plan && (
            <AgentHint>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">Plan recomendado</span>
                  {planMode === "fallback" && <Badge variant="warning">modo heurístico</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{plan.rationale}</p>
                <div className="space-y-2">
                  {plan.recommendations.map((r) => (
                    <label
                      key={r.channel_id}
                      className="flex cursor-pointer items-start gap-3 rounded-md border bg-background p-3"
                    >
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={selected.has(r.channel_id)}
                        onChange={(e) => {
                          const next = new Set(selected);
                          e.target.checked ? next.add(r.channel_id) : next.delete(r.channel_id);
                          setSelected(next);
                        }}
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{r.channel_name}</span>
                          <Badge variant="outline">prioridad {r.priority}</Badge>
                          <Badge variant="secondary">{formatMoney(r.budget)}</Badge>
                          <span className="text-xs text-muted-foreground">
                            ~{r.expected_applications} aplicaciones · CPA est. {formatMoney(r.expected_cpa)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{r.reason}</p>
                        <p className="rounded bg-muted px-2 py-1 text-xs italic">“{r.copy}”</p>
                      </div>
                    </label>
                  ))}
                </div>
                <Button onClick={activate} disabled={activating || selected.size === 0}>
                  {activating && <Loader2 className="animate-spin" />}
                  Activar {selected.size} canales
                </Button>
              </div>
            </AgentHint>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-base">Campañas y resultados por canal</CardTitle>
            <CardDescription>Views, aplicaciones, coste por aplicación y conversión.</CardDescription>
          </div>
          {campaigns.length > 0 && (
            <Button variant="outline" size="sm" onClick={simulate} disabled={simulating}>
              {simulating ? <Loader2 className="animate-spin" /> : <TrendingUp />}
              Simular 1 día
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Sin campañas activas. Usa el agente para generar un plan de distribución.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Canal</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Presupuesto</TableHead>
                  <TableHead className="text-right">Gasto</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                  <TableHead className="text-right">Aplicaciones</TableHead>
                  <TableHead className="text-right">CPA</TableHead>
                  <TableHead className="text-right">Conversión</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.channels?.name}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "active" ? "success" : "secondary"}>{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatMoney(c.budget)}</TableCell>
                    <TableCell className="text-right">{formatMoney(c.spend)}</TableCell>
                    <TableCell className="text-right">{c.views.toLocaleString("es-ES")}</TableCell>
                    <TableCell className="text-right">{c.applications}</TableCell>
                    <TableCell className="text-right">
                      {c.applications > 0 ? formatMoney(Number(c.spend) / c.applications) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {c.views > 0 ? `${((c.applications / c.views) * 100).toFixed(1)}%` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
