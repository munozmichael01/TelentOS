"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { CandidateAnalysis } from "@/agents/agent-candidate-analyzer";

type SubScores = {
  skills?: number;
  experience?: number;
  leadership?: number;
};

type ExtendedAnalysis = CandidateAnalysis & { sub_scores?: SubScores };

function ScoreBar({ label, score }: { label: string; score: number }) {
  const pct = Math.round((score / 10) * 100);
  const color = score >= 8 ? "#C6F24E" : score >= 6 ? "#E0A23C" : "#F1543F";
  return (
    <div style={{ marginBottom: "14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", marginBottom: "5px" }}>
        <span style={{ color: "#E4E0D7" }}>{label}</span>
        <span style={{ fontWeight: 700, color }}>{score}/10</span>
      </div>
      <div style={{ height: "7px", borderRadius: "99px", background: "#38352E", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color }} />
      </div>
    </div>
  );
}

export function CandidateAnalyzerPanel({ applicationId, fitScore: initialFit }: { applicationId: string; fitScore?: number | null }) {
  const [analysis, setAnalysis] = useState<ExtendedAnalysis | null>(null);
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

  const fitScore = initialFit ?? null;
  const subScores = analysis?.sub_scores;

  return (
    <div
      style={{
        background: "#1A1A17",
        color: "#F4F0E8",
        borderRadius: "18px",
        padding: "24px",
      }}
    >
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
        <span style={{ width: "30px", height: "30px", borderRadius: "9px", background: "rgba(198,242,78,.16)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M5 19l1-4 9-9 3 3-9 9-4 1ZM14 6l3 3" stroke="#C6F24E" strokeWidth="2" strokeLinejoin="round"/>
          </svg>
        </span>
        <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "17px" }}>Agente de análisis</span>
        {mode === "fallback" && (
          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: "#E0A23C", background: "rgba(224,162,60,.12)", border: "1px solid rgba(224,162,60,.3)", borderRadius: "999px", padding: "3px 10px", marginLeft: "auto" }}>
            heurístico
          </span>
        )}
        {fitScore != null && (
          <span style={{ fontSize: "12px", fontWeight: 800, color: "#0E5C4A", background: "#C6F24E", borderRadius: "999px", padding: "3px 11px", marginLeft: mode === "fallback" ? "0" : "auto", whiteSpace: "nowrap" }}>
            Fit {fitScore}
          </span>
        )}
      </div>

      {error && <p style={{ fontSize: "13px", color: "#F1543F", marginBottom: "12px" }}>{error}</p>}

      {!analysis && !loading && !error && (
        <p style={{ fontSize: "14px", lineHeight: 1.6, color: "#8C877E", marginBottom: "16px" }}>
          El agente resume el perfil, contrasta gaps con los requisitos de la oferta y sugiere preguntas de entrevista. La decisión sigue siendo tuya.
        </p>
      )}

      {analysis && (
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "22px" }}>
          {/* left: text analysis */}
          <div>
            <p style={{ fontSize: "14.5px", lineHeight: 1.6, color: "#E4E0D7", margin: "0 0 16px" }}>
              {analysis.summary}
            </p>
            {analysis.gaps.length > 0 && (
              <>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", textTransform: "uppercase", letterSpacing: ".5px", color: "#E0A23C", marginBottom: "8px" }}>
                  Gaps detectados
                </div>
                {analysis.gaps.map((g, i) => (
                  <div key={i} style={{ background: "#26241F", border: "1px solid #38352E", borderRadius: "11px", padding: "10px 13px", fontSize: "13px", lineHeight: 1.45, marginBottom: "7px" }}>
                    {g}
                  </div>
                ))}
              </>
            )}
            {analysis.interview_questions.length > 0 && (
              <>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", textTransform: "uppercase", letterSpacing: ".5px", color: "#C6F24E", margin: "14px 0 10px" }}>
                  Preguntas sugeridas
                </div>
                {analysis.interview_questions.map((q, i) => (
                  <div key={i} style={{ background: "#26241F", border: "1px solid #38352E", borderRadius: "11px", padding: "11px 13px", fontSize: "13px", lineHeight: 1.45, marginBottom: "7px" }}>
                    {q}
                  </div>
                ))}
              </>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "16px" }}>
              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: "#8C877E" }}>
                El agente propone · tú decides
              </span>
            </div>
          </div>

          {/* right: sub-scores */}
          <div style={{ background: "#26241F", border: "1px solid #38352E", borderRadius: "14px", padding: "18px" }}>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", textTransform: "uppercase", letterSpacing: ".5px", color: "#8C877E", marginBottom: "14px" }}>
              Desglose de fit
            </div>
            {subScores ? (
              <>
                {subScores.skills != null && <ScoreBar label="Skills" score={subScores.skills} />}
                {subScores.experience != null && <ScoreBar label="Experiencia" score={subScores.experience} />}
                {subScores.leadership != null && <ScoreBar label="Liderazgo" score={subScores.leadership} />}
              </>
            ) : fitScore != null ? (
              <>
                <ScoreBar label="Skills" score={Math.round(fitScore / 10)} />
                <ScoreBar label="Experiencia" score={Math.round(fitScore / 10)} />
                <ScoreBar label="Liderazgo" score={Math.round(fitScore / 10)} />
              </>
            ) : (
              <p style={{ fontSize: "13px", color: "#8C877E" }}>Ejecuta el análisis para ver el desglose.</p>
            )}
          </div>
        </div>
      )}

      {/* analyze button */}
      <div style={{ marginTop: analysis ? "20px" : "0", display: "flex" }}>
        <button
          onClick={analyze}
          disabled={loading}
          style={{
            fontFamily: "'Archivo',sans-serif",
            fontWeight: 800,
            fontSize: "12px",
            color: "#1A1A17",
            background: "#C6F24E",
            border: "none",
            borderRadius: "9px",
            padding: "8px 14px",
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading && <Loader2 size={13} className="animate-spin" />}
          {analysis ? "Reanalizar perfil" : "Analizar perfil"}
        </button>
      </div>
    </div>
  );
}
