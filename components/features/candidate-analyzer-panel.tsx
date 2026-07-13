"use client";

import { useState } from "react";
import { AgentActionButton } from "@/components/ui/agent-action-button";
import { AgentBadge } from "@/components/ui/agent-badge";
import { IconSparkle } from "@/components/ui/icons";
import type { CandidateAnalysis } from "@/agents/agent-candidate-analyzer";

type SubScores = {
  skills?: number;
  experience?: number;
  leadership?: number;
};

type ExtendedAnalysis = CandidateAnalysis & { sub_scores?: SubScores };

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  const pct = Math.round((score / 10) * 100);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", marginBottom: "5px" }}>
        <span style={{ color: "#E4E0D7" }}>{label}</span>
        <span style={{ fontWeight: 700, color }}>{score}/10</span>
      </div>
      <div style={{ height: "7px", borderRadius: "99px", background: "#38352E", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, transition: "width .4s ease" }} />
      </div>
    </div>
  );
}

function scoreColor(s: number) {
  return s >= 8 ? "#C6F24E" : s >= 6 ? "#E0A23C" : "#F1543F";
}

export function CandidateAnalyzerPanel({
  applicationId,
  fitScore: initialFit,
  savedAnalysis,
}: {
  applicationId: string;
  fitScore?: number | null;
  savedAnalysis?: ExtendedAnalysis | null;
}) {
  const [analysis, setAnalysis] = useState<ExtendedAnalysis | null>(savedAnalysis ?? null);
  const [mode, setMode] = useState<"ok" | "fallback" | null>(savedAnalysis ? "ok" : null);
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

  const fitScore = initialFit ?? null;
  const subScores = analysis?.sub_scores;

  // Derive bars: use sub_scores if available, otherwise derive from fitScore
  const bars: { label: string; score: number }[] = subScores
    ? [
        ...(subScores.skills != null ? [{ label: "Skills", score: subScores.skills }] : []),
        ...(subScores.experience != null ? [{ label: "Experiencia", score: subScores.experience }] : []),
        ...(subScores.leadership != null ? [{ label: "Liderazgo", score: subScores.leadership }] : []),
      ]
    : fitScore != null
    ? [
        { label: "Skills", score: Math.round(fitScore / 10) },
        { label: "Experiencia", score: Math.round(fitScore / 10) },
        { label: "Liderazgo", score: Math.round(fitScore / 10) },
      ]
    : [];

  return (
    <div
      style={{
        background: "#1A1A17",
        color: "#F4F0E8",
        borderRadius: "18px",
        padding: "22px",
      }}
    >
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
        <span style={{ width: "30px", height: "30px", borderRadius: "9px", background: "rgba(198,242,78,.16)", color: "#C6F24E", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <IconSparkle className="size-4" />
        </span>
        <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "17px" }}>Agente de análisis</span>
        {/* Procedencia visible sobre panel oscuro (invariante #7): solo tras correr el agente. */}
        {mode && (
          <span style={{ marginLeft: "auto" }}>
            <AgentBadge kind={mode === "ok" ? "ia" : "heuristica"} onDark />
          </span>
        )}
        {fitScore != null && (
          <span style={{ fontSize: "12px", fontWeight: 800, color: "#0E5C4A", background: "#C6F24E", borderRadius: "999px", padding: "3px 11px", marginLeft: mode ? "0" : "auto", whiteSpace: "nowrap" }}>
            Fit {fitScore}
          </span>
        )}
      </div>

      {error && <p style={{ fontSize: "13px", color: "#F1543F", marginBottom: "12px" }}>{error}</p>}

      {/* score bars — shown before the text analysis */}
      {bars.length > 0 && (
        <div style={{ background: "#26241F", border: "1px solid #38352E", borderRadius: "13px", padding: "16px 18px", marginBottom: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", textTransform: "uppercase", letterSpacing: ".5px", color: "#8C877E", marginBottom: "2px" }}>
            Desglose de fit
          </div>
          {bars.map((b) => (
            <ScoreBar key={b.label} label={b.label} score={b.score} color={scoreColor(b.score)} />
          ))}
        </div>
      )}

      {!analysis && !loading && !error && (
        <p style={{ fontSize: "14px", lineHeight: 1.6, color: "#8C877E", marginBottom: "16px" }}>
          El agente resume el perfil, contrasta gaps con los requisitos de la oferta y sugiere preguntas de entrevista. La decisión sigue siendo tuya.
        </p>
      )}

      {analysis && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
          <p style={{ fontSize: "14px", lineHeight: 1.6, color: "#E4E0D7", margin: "0 0 16px" }}>
            {analysis.summary}
          </p>

          {analysis.gaps.length > 0 && (
            <>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", textTransform: "uppercase", letterSpacing: ".5px", color: "#E0A23C", marginBottom: "8px" }}>
                Gaps detectados
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "7px", marginBottom: "16px" }}>
                {analysis.gaps.map((g, i) => (
                  <div key={i} style={{ background: "#26241F", border: "1px solid #38352E", borderRadius: "11px", padding: "10px 13px", fontSize: "13px", lineHeight: 1.45 }}>
                    {g}
                  </div>
                ))}
              </div>
            </>
          )}

          {analysis.interview_questions.length > 0 && (
            <>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", textTransform: "uppercase", letterSpacing: ".5px", color: "#C6F24E", marginBottom: "10px" }}>
                Preguntas sugeridas
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                {analysis.interview_questions.map((q, i) => (
                  <div key={i} style={{ background: "#26241F", border: "1px solid #38352E", borderRadius: "11px", padding: "11px 13px", fontSize: "13px", lineHeight: 1.45 }}>
                    {q}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* footer + button */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "18px", gap: "10px" }}>
        <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: "#8C877E" }}>
          El agente propone · tú decides
        </span>
        <AgentActionButton
          idleLabel={analysis ? "Reanalizar" : "Analizar perfil"}
          busyLabel="Analizando…"
          busy={loading}
          onClick={analyze}
        />
      </div>
    </div>
  );
}
