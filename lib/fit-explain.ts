/**
 * Explicación determinista del fit score (misma aritmética que lib/fit-score.ts —
 * el test cruza ambos para garantizar que nunca divergen). Para el candidate-analyzer:
 * el LLM redacta la lectura, este módulo calcula el porqué del número.
 */
import { computeFitScore, type StructuredMatchInput } from "@/lib/fit-score";
import type { Candidate, Job } from "@/lib/types";

export type SkillRef = { id: string; name: string };

export type FitExplanation = {
  score: number; // idéntico a computeFitScore con los mismos inputs
  skills: {
    mode: "canonico" | "texto" | "sin-requisitos";
    matched: string[]; // nombres de skills de la oferta que el candidato tiene
    missing: string[]; // nombres de skills de la oferta que le faltan
    points: number; // sobre 60
  };
  experience: {
    requiredYears: number;
    actualYears: number;
    points: number; // sobre 25
  };
  location: {
    verdict: "remota" | "exacta" | "mismo-pais" | "pais-distinto" | "texto-coincide" | "texto-no-coincide" | "sin-datos";
    points: number; // sobre 15
  };
};

type CandidateInput = Pick<Candidate, "skills" | "experience_years" | "location">;
type JobInput = Pick<Job, "skills" | "experience_min_years" | "location">;

export type ExplainInput = Omit<StructuredMatchInput, "candidateSkillIds" | "jobSkillIds"> & {
  /** skills canónicas con nombre (para poder nombrar matched/missing) */
  candidateSkills?: SkillRef[];
  jobSkills?: SkillRef[];
};

export function explainFitScore(
  candidate: CandidateInput,
  job: JobInput,
  structured?: ExplainInput,
): FitExplanation {
  const candRefs = structured?.candidateSkills ?? [];
  const jobRefs = structured?.jobSkills ?? [];
  const structuredInput: StructuredMatchInput = {
    candidateSkillIds: candRefs.map((s) => s.id),
    jobSkillIds: jobRefs.map((s) => s.id),
    candidateCity: structured?.candidateCity,
    candidateCountry: structured?.candidateCountry,
    jobCity: structured?.jobCity,
    jobCountry: structured?.jobCountry,
  };

  const score = computeFitScore(candidate, job, structuredInput);

  // ── Skills (misma lógica que fit-score) ────────────────────────────────────
  let skills: FitExplanation["skills"];
  if (jobRefs.length > 0 && candRefs.length > 0) {
    const candIds = new Set(candRefs.map((s) => s.id));
    const matched = jobRefs.filter((s) => candIds.has(s.id));
    const missing = jobRefs.filter((s) => !candIds.has(s.id));
    skills = {
      mode: "canonico",
      matched: matched.map((s) => s.name),
      missing: missing.map((s) => s.name),
      points: Math.round((matched.length / jobRefs.length) * 60),
    };
  } else if (job.skills.length > 0) {
    const candNorm = candidate.skills.map((s) => s.toLowerCase().trim());
    const isMatch = (req: string) => {
      const r = req.toLowerCase().trim();
      return candNorm.some((c) => c.includes(r) || r.includes(c));
    };
    const matched = job.skills.filter(isMatch);
    const missing = job.skills.filter((s) => !isMatch(s));
    skills = {
      mode: "texto",
      matched,
      missing,
      points: Math.round((matched.length / job.skills.length) * 60),
    };
  } else {
    skills = { mode: "sin-requisitos", matched: [], missing: [], points: Math.round(0.5 * 60) };
  }

  // ── Experiencia ───────────────────────────────────────────────────────────
  const required = job.experience_min_years ?? 0;
  const expRatio =
    required <= 0 || candidate.experience_years >= required
      ? 1
      : Math.max(0, candidate.experience_years / required);
  const experience = {
    requiredYears: required,
    actualYears: candidate.experience_years,
    points: Math.round(expRatio * 25),
  };

  // ── Ubicación ─────────────────────────────────────────────────────────────
  const jobLoc = (job.location ?? "").toLowerCase();
  const candLoc = (candidate.location ?? "").toLowerCase();
  const jc = structured?.jobCountry?.toUpperCase() ?? null;
  const cc = structured?.candidateCountry?.toUpperCase() ?? null;
  let verdict: FitExplanation["location"]["verdict"];
  let locRatio: number;
  if (!jobLoc || jobLoc.includes("remoto") || jobLoc.includes("remote")) {
    verdict = "remota";
    locRatio = 1;
  } else if (jc && cc) {
    if (jc !== cc) {
      verdict = "pais-distinto";
      locRatio = 0.3;
    } else {
      const jCity = structured?.jobCity?.toLowerCase().trim();
      const cCity = structured?.candidateCity?.toLowerCase().trim();
      if (!jCity || jCity === cCity) {
        verdict = "exacta";
        locRatio = 1;
      } else {
        verdict = "mismo-pais";
        locRatio = 0.6;
      }
    }
  } else if (candLoc) {
    const city = jobLoc.split(/[(,/]/)[0].trim();
    const hit = candLoc.includes(city) || city.includes(candLoc);
    verdict = hit ? "texto-coincide" : "texto-no-coincide";
    locRatio = hit ? 1 : 0.3;
  } else {
    verdict = "sin-datos";
    locRatio = 0.5;
  }
  const location = { verdict, points: Math.round(locRatio * 15) };

  return { score, skills, experience, location };
}
