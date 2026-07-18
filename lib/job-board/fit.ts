// Motor de fit del job board — DETERMINISTA (dos lados + screening). Extiende el
// fit canónico (lib/fit-score.ts, skills/exp/ubicación) con los requisitos
// estructurados de la oferta (educación, seniority, skills excluyente/deseable) y
// añade la señal "match para ti" (preferencias del candidato) y el resultado de
// screening. El agente candidate-analyzer lo explica en cualitativo; el número NO
// depende de un LLM.
import type { EducationLevel, SeniorityLevel, ScreeningQuestion } from "@/lib/types";

const EDU_ORDER: EducationLevel[] = ["none", "secondary", "vocational", "bachelor", "master", "phd"];
const SEN_ORDER: SeniorityLevel[] = ["junior", "mid", "senior", "lead", "principal", "manager", "director"];
const rank = <T,>(order: T[], v: T | null | undefined) => (v == null ? -1 : order.indexOf(v));

// ── Fit del recruiter: ¿encaja el candidato en la oferta? ───────────────────
export type JobSkillReq = { skillId: string; requirement: "excluyente" | "deseable" };

export type RecruiterFitInput = {
  job: {
    skills: JobSkillReq[];
    experienceMinYears: number;
    educationLevel: EducationLevel | null;
    seniorityLevel: SeniorityLevel | null;
    country: string | null;
    city: string | null;
    location: string | null;
  };
  candidate: {
    skillIds: string[];
    experienceYears: number;
    educationLevel: EducationLevel | null;
    seniorityLevel: SeniorityLevel | null;
    country: string | null;
    city: string | null;
    location: string | null;
  };
};

export type RecruiterFit = {
  score: number; // 0–100
  meetsHardRequirements: boolean; // ninguna skill excluyente ausente
  breakdown: {
    skills: { matched: string[]; missing: string[]; missingExcluyente: string[]; pct: number };
    experience: { met: boolean; pct: number };
    education: { met: boolean; applicable: boolean };
    seniority: { met: boolean; applicable: boolean };
    location: { pct: number };
  };
};

// Pesos: skills 50 (excluyente pesa 2×), exp 15, edu 10, seniority 10, ubicación 15.
export function computeRecruiterFit(input: RecruiterFitInput): RecruiterFit {
  const { job, candidate } = input;
  const have = new Set(candidate.skillIds);

  // Skills ponderadas por requirement
  const exc = job.skills.filter((s) => s.requirement === "excluyente");
  const des = job.skills.filter((s) => s.requirement === "deseable");
  const matched: string[] = [];
  const missing: string[] = [];
  const missingExcluyente: string[] = [];
  for (const s of job.skills) {
    if (have.has(s.skillId)) matched.push(s.skillId);
    else {
      missing.push(s.skillId);
      if (s.requirement === "excluyente") missingExcluyente.push(s.skillId);
    }
  }
  // excluyente vale doble en la fracción de skills
  const totalWeight = exc.length * 2 + des.length;
  const gotWeight =
    exc.filter((s) => have.has(s.skillId)).length * 2 + des.filter((s) => have.has(s.skillId)).length;
  const skillPct = totalWeight > 0 ? gotWeight / totalWeight : 0.5; // sin skills → neutro

  // Experiencia
  const req = job.experienceMinYears ?? 0;
  const expPct = req <= 0 ? 1 : Math.min(1, candidate.experienceYears / req);
  const expMet = req <= 0 || candidate.experienceYears >= req;

  // Educación (aplica solo si la oferta define nivel)
  const eduApplicable = job.educationLevel != null;
  const eduMet = !eduApplicable || rank(EDU_ORDER, candidate.educationLevel) >= rank(EDU_ORDER, job.educationLevel);

  // Seniority (aplica solo si la oferta define nivel)
  const senApplicable = job.seniorityLevel != null;
  const senMet = !senApplicable || rank(SEN_ORDER, candidate.seniorityLevel) >= rank(SEN_ORDER, job.seniorityLevel);

  // Ubicación (remoto siempre 1; mismo país 1/0.6; distinto país 0.3; texto laxo)
  const locPct = locationScore(job, candidate);

  const score = Math.round(
    (skillPct * 0.5 + expPct * 0.15 + (eduMet ? 1 : 0) * 0.1 + (senMet ? 1 : 0) * 0.1 + locPct * 0.15) * 100
  );

  return {
    score,
    meetsHardRequirements: missingExcluyente.length === 0,
    breakdown: {
      skills: { matched, missing, missingExcluyente, pct: skillPct },
      experience: { met: expMet, pct: expPct },
      education: { met: eduMet, applicable: eduApplicable },
      seniority: { met: senMet, applicable: senApplicable },
      location: { pct: locPct },
    },
  };
}

function locationScore(
  job: RecruiterFitInput["job"],
  cand: RecruiterFitInput["candidate"]
): number {
  const jobLoc = (job.location ?? "").toLowerCase();
  if (!jobLoc || jobLoc.includes("remoto") || jobLoc.includes("remote")) return 1;
  const jc = job.country?.toUpperCase() ?? null;
  const cc = cand.country?.toUpperCase() ?? null;
  if (jc && cc) {
    if (jc !== cc) return 0.3;
    const jCity = job.city?.toLowerCase().trim();
    const cCity = cand.city?.toLowerCase().trim();
    return !jCity || jCity === cCity ? 1 : 0.6;
  }
  const candLoc = (cand.location ?? "").toLowerCase();
  if (candLoc) {
    const city = jobLoc.split(/[(,/]/)[0].trim();
    return candLoc.includes(city) || city.includes(candLoc) ? 1 : 0.3;
  }
  return 0.5;
}

// ── "Match para ti": ¿la oferta cumple las preferencias del candidato? ──────
export type CandidateMatchInput = {
  job: {
    salaryMax: number | null;
    salaryCurrency: string | null;
    modality: string | null; // presencial|hibrido|remoto
    country: string | null;
    city: string | null;
    employmentType: string | null;
  };
  prefs: {
    salaryMin: number | null;
    currency: string | null;
    modality: string[];
    locations: string[]; // ciudades/países que acepta
    contract: string[];
  };
};

export type CandidateMatch = {
  met: number;
  total: number; // preferencias que el candidato definió
  details: { salary: boolean | null; modality: boolean | null; location: boolean | null; contract: boolean | null };
};

// Solo cuenta las preferencias que el candidato REALMENTE fijó (total = las definidas).
export function computeCandidateMatch(input: CandidateMatchInput): CandidateMatch {
  const { job, prefs } = input;
  const norm = (s: string) => s.toLowerCase().trim();

  const salary =
    prefs.salaryMin == null
      ? null
      : job.salaryMax != null && (!prefs.currency || !job.salaryCurrency || prefs.currency === job.salaryCurrency)
        ? job.salaryMax >= prefs.salaryMin
        : false;

  const modality = prefs.modality.length === 0 ? null : job.modality != null && prefs.modality.map(norm).includes(norm(job.modality));

  const location =
    prefs.locations.length === 0
      ? null
      : prefs.locations.map(norm).some((l) => norm(job.city ?? "") === l || norm(job.country ?? "") === l);

  const contract =
    prefs.contract.length === 0 ? null : job.employmentType != null && prefs.contract.map(norm).includes(norm(job.employmentType));

  const flags = [salary, modality, location, contract];
  return {
    met: flags.filter((f) => f === true).length,
    total: flags.filter((f) => f !== null).length,
    details: { salary, modality, location, contract },
  };
}

// ── Screening: filtro duro (regla del humano) + ajuste ponderado ────────────
export type ScreeningOutcome = {
  autoDiscard: boolean;
  discardReasons: string[]; // ids de preguntas que descartan
  weightedDelta: number; // ± a sumar al fit del recruiter
};

// filter_rule = { match: <valor esperado> }. Para `filter`: si la respuesta coincide →
// descarte automático (regla configurada por el humano, no decisión de IA). Para
// `weighted`: si coincide → +weight. Coincidencia por igualdad laxa; para text/url,
// `match: null` = cuenta cualquier respuesta no vacía.
export function computeScreeningOutcome(
  questions: Pick<ScreeningQuestion, "id" | "mode" | "weight" | "filter_rule">[],
  answers: Record<string, unknown>
): ScreeningOutcome {
  let weightedDelta = 0;
  let autoDiscard = false;
  const discardReasons: string[] = [];

  for (const q of questions) {
    const ans = answers[q.id];
    const rule = (q.filter_rule ?? {}) as { match?: unknown };
    const matches =
      "match" in rule && rule.match != null
        ? String(ans).toLowerCase().trim() === String(rule.match).toLowerCase().trim()
        : ans != null && String(ans).trim() !== "";

    if (q.mode === "filter") {
      if (matches) {
        autoDiscard = true;
        discardReasons.push(q.id);
      }
    } else if (matches) {
      weightedDelta += q.weight;
    }
  }

  return { autoDiscard, discardReasons, weightedDelta };
}
