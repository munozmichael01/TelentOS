"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AgentHint } from "@/components/agent-hint";
import type { CandidateAnalysis } from "@/agents/agent-candidate-analyzer";

/** Análisis bajo demanda: resumen, gaps vs. requisitos y preguntas sugeridas. */
export function CandidateAnalyzerPanel({ applicationId }: { applicationId: string }) {
  const [analysis, setAnalysis] = useState<CandidateAnalysis | null>(null);
  const [mode, setMode] = useState<"ok" | "fallback" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function analyze() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/agents/candidate-analyzer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error del agente");
      setAnalysis(data.output);
      setMode(data.status);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-primary/30">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          Análisis del agente
        </CardTitle>
        <Button size="sm" variant="outline" onClick={analyze} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {analysis ? "Reanalizar" : "Analizar perfil"}
        </Button>
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!analysis && !loading && !error && (
          <p className="text-sm text-muted-foreground">
            El agente resume el perfil, contrasta gaps con los requisitos de la oferta y sugiere preguntas de entrevista. La decisión sigue siendo tuya.
          </p>
        )}
        {analysis && (
          <AgentHint>
            <div className="space-y-3 text-sm">
              {mode === "fallback" && <Badge variant="warning">modo heurístico</Badge>}
              <p>{analysis.summary}</p>
              <div>
                <p className="font-semibold text-emerald-700">Fortalezas</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                  {analysis.strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
              <div>
                <p className="font-semibold text-amber-700">Gaps</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                  {analysis.gaps.length ? analysis.gaps.map((g, i) => <li key={i}>{g}</li>) : <li>Sin gaps relevantes detectados</li>}
                </ul>
              </div>
              <div>
                <p className="font-semibold">Preguntas de entrevista sugeridas</p>
                <ol className="mt-1 list-decimal space-y-0.5 pl-5">
                  {analysis.interview_questions.map((q, i) => <li key={i}>{q}</li>)}
                </ol>
              </div>
              <p className="italic text-muted-foreground">{analysis.fit_assessment}</p>
            </div>
          </AgentHint>
        )}
      </CardContent>
    </Card>
  );
}
