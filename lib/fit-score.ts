import type { Candidate, Job } from "@/lib/types";

/**
 * Matching candidato ↔ oferta determinista (0–100).
 * Criterio: el score base debe ser explicable y reproducible — el agente de
 * análisis lo complementa con lectura cualitativa, pero el número que ordena
 * el pipeline no depende de un LLM.
 *   - 60% solape de skills — canónico (ids del catálogo, exacto) cuando AMBOS lados
 *     tienen skills estructuradas; si no, texto laxo (legado, transición)
 *   - 25% experiencia vs. mínimo requerido
 *   - 15% encaje de ubicación — country/city estructurados si ambos lados los tienen;
 *     si no, match textual laxo (remoto puntúa siempre)
 */
export type StructuredMatchInput = {
  /** skill_ids canónicos del candidato (candidate_skills) */
  candidateSkillIds?: string[];
  /** skill_ids canónicos de la oferta (job_skills) */
  jobSkillIds?: string[];
  candidateCity?: string | null;
  candidateCountry?: string | null;
  jobCity?: string | null;
  jobCountry?: string | null;
};

export function computeFitScore(
  candidate: Pick<Candidate, "skills" | "experience_years" | "location">,
  job: Pick<Job, "skills" | "experience_min_years" | "location">,
  structured?: StructuredMatchInput
): number {
  // Skills — canónico si ambos lados están estructurados (regla: nunca penalizar
  // por datos aún no migrados; con un lado vacío se cae al texto legado).
  let skillScore = 0;
  const jobIds = structured?.jobSkillIds ?? [];
  const candIds = structured?.candidateSkillIds ?? [];
  if (jobIds.length > 0 && candIds.length > 0) {
    const candSet = new Set(candIds);
    const matched = jobIds.filter((id) => candSet.has(id));
    skillScore = matched.length / jobIds.length;
  } else if (job.skills.length > 0) {
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

  // Ubicación — estructurada si ambos lados la tienen; texto laxo si no.
  let locScore = 0.5;
  const jobLoc = (job.location ?? "").toLowerCase();
  const candLoc = (candidate.location ?? "").toLowerCase();
  const jc = structured?.jobCountry?.toUpperCase() ?? null;
  const cc = structured?.candidateCountry?.toUpperCase() ?? null;
  if (!jobLoc || jobLoc.includes("remoto") || jobLoc.includes("remote")) {
    locScore = 1;
  } else if (jc && cc) {
    if (jc !== cc) {
      locScore = 0.3; // país distinto
    } else {
      const jCity = structured?.jobCity?.toLowerCase().trim();
      const cCity = structured?.candidateCity?.toLowerCase().trim();
      locScore = !jCity || jCity === cCity ? 1 : 0.6; // mismo país; ciudad exacta o no
    }
  } else if (candLoc) {
    const city = jobLoc.split(/[(,/]/)[0].trim();
    locScore = candLoc.includes(city) || city.includes(candLoc) ? 1 : 0.3;
  }

  return Math.round((skillScore * 0.6 + expScore * 0.25 + locScore * 0.15) * 100);
}
