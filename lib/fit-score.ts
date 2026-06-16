import type { Candidate, Job } from "@/lib/types";

/**
 * Matching candidato ↔ oferta determinista (0–100).
 * Criterio: el score base debe ser explicable y reproducible — el agente de
 * análisis lo complementa con lectura cualitativa, pero el número que ordena
 * el pipeline no depende de un LLM.
 *   - 60% solape de skills (case-insensitive, matching parcial por palabra)
 *   - 25% experiencia vs. mínimo requerido
 *   - 15% encaje de ubicación (match textual laxo; remoto puntúa siempre)
 */
export function computeFitScore(
  candidate: Pick<Candidate, "skills" | "experience_years" | "location">,
  job: Pick<Job, "skills" | "experience_min_years" | "location">
): number {
  // Skills
  let skillScore = 0;
  if (job.skills.length > 0) {
    const candNorm = candidate.skills.map((s) => s.toLowerCase().trim());
    const matched = job.skills.filter((req) => {
      const r = req.toLowerCase().trim();
      return candNorm.some((c) => c.includes(r) || r.includes(c));
    });
    skillScore = matched.length / job.skills.length;
  } else {
    skillScore = 0.5; // sin requisitos definidos, neutro
  }

  // Experiencia
  let expScore: number;
  const required = job.experience_min_years ?? 0;
  if (required <= 0) {
    expScore = 1;
  } else if (candidate.experience_years >= required) {
    expScore = 1;
  } else {
    expScore = Math.max(0, candidate.experience_years / required);
  }

  // Ubicación
  let locScore = 0.5;
  const jobLoc = (job.location ?? "").toLowerCase();
  const candLoc = (candidate.location ?? "").toLowerCase();
  if (!jobLoc || jobLoc.includes("remoto") || jobLoc.includes("remote")) {
    locScore = 1;
  } else if (candLoc) {
    const city = jobLoc.split(/[(,/]/)[0].trim();
    locScore = candLoc.includes(city) || city.includes(candLoc) ? 1 : 0.3;
  }

  return Math.round((skillScore * 0.6 + expScore * 0.25 + locScore * 0.15) * 100);
}
