import { runAgent, type AgentResult, type AgentTool } from "@/agents/core";
import { SYSTEM_PROMPT, SYSTEM_PROMPT_TEXT } from "./prompt";
import { tools, getCandidateCvContext } from "./tools";

export type CvExperience = {
  title: string;
  company: string | null;
  seniority: "junior" | "mid" | "senior" | "lead" | "exec" | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
};

export type CvLanguage = {
  language: string;
  level: "a1" | "a2" | "b1" | "b2" | "c1" | "c2" | "native" | null;
};

export type CvEducation = {
  degree: string;
  institution: string | null;
  field: string | null;
  start_year: number | null;
  end_year: number | null;
};

export type CvProfile = {
  name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  city: string | null;
  country_code: string | null;
  summary: string;
  skills: string[];
  experience_years: number;
  experiences: CvExperience[];
  languages: CvLanguage[];
  education: CvEducation[];
  extracted_source: "cv_text" | "fallback";
};

export type CvParserInput = { candidateId: string };

function isValidCvProfile(v: unknown): v is CvProfile {
  if (typeof v !== "object" || !v) return false;
  const o = v as Record<string, unknown>;
  return (
    Array.isArray(o.skills) &&
    typeof o.experience_years === "number" &&
    typeof o.summary === "string" &&
    Array.isArray(o.experiences) &&
    Array.isArray(o.languages) &&
    Array.isArray(o.education) &&
    (o.extracted_source === "cv_text" || o.extracted_source === "fallback")
  );
}

async function fallbackProfile(input: CvParserInput): Promise<CvProfile> {
  const ctx = await getCandidateCvContext(input.candidateId);
  if ("error" in ctx) {
    return {
      name: null, email: null, phone: null, location: null,
      city: null, country_code: null, summary: "", skills: [],
      experience_years: 0, experiences: [], languages: [], education: [],
      extracted_source: "fallback",
    };
  }
  return {
    name: ctx.name,
    email: ctx.email,
    phone: ctx.phone,
    location: ctx.location,
    city: ctx.city,
    country_code: ctx.country_code,
    summary: ctx.summary ?? "",
    skills: ctx.skills,
    experience_years: ctx.experience_years,
    experiences: [],
    languages: [],
    education: [],
    extracted_source: "fallback",
  };
}

export async function runCvParser(input: CvParserInput): Promise<AgentResult<CvProfile>> {
  // First attempt
  const result = await runAgent<CvProfile>({
    agent: "cv-parser",
    model: "gpt-4o-mini",
    system: SYSTEM_PROMPT,
    user: `Extrae el perfil del candidato con id "${input.candidateId}". Llama primero a get_candidate_cv.`,
    tools,
    input,
    fallback: () => fallbackProfile(input),
  });

  if (isValidCvProfile(result.output)) return result;

  // 1 retry if output shape is invalid
  const retry = await runAgent<CvProfile>({
    agent: "cv-parser",
    model: "gpt-4o-mini",
    system: SYSTEM_PROMPT,
    user: `Extrae el perfil del candidato con id "${input.candidateId}". Llama primero a get_candidate_cv. Devuelve SOLO JSON válido sin markdown.`,
    tools,
    input,
    fallback: () => fallbackProfile(input),
  });

  if (isValidCvProfile(retry.output)) return retry;

  // Both attempts failed — degrade to heuristic
  const fb = await fallbackProfile(input);
  return { output: fb, status: "fallback" };
}

/** Perfil vacío — usado cuando el texto del CV no da para extraer nada. */
export function emptyCvProfile(): CvProfile {
  return {
    name: null, email: null, phone: null, location: null,
    city: null, country_code: null, summary: "", skills: [],
    experience_years: 0, experiences: [], languages: [], education: [],
    extracted_source: "fallback",
  };
}

/**
 * Extracción a partir del texto del CV ya extraído (flujo público de inscripción:
 * el candidato adjunta el CV, se parsea el texto y se corre esto — sin candidato en BD).
 * Mismo contrato, validación y 1 reintento; degrada a perfil vacío si el texto no sirve.
 */
export async function extractProfileFromText(cvText: string): Promise<AgentResult<CvProfile>> {
  const trimmed = (cvText ?? "").trim();
  if (trimmed.length < 50) {
    return { output: emptyCvProfile(), status: "fallback" };
  }

  const user = `Texto del CV a analizar:\n\n"""\n${trimmed.slice(0, 8000)}\n"""`;
  const opts = {
    agent: "cv-parser",
    model: "gpt-4o-mini",
    system: SYSTEM_PROMPT_TEXT,
    user,
    tools: [] as AgentTool[],
    input: { source: "careers-parse", length: trimmed.length },
    fallback: () => emptyCvProfile(),
  };

  const result = await runAgent<CvProfile>(opts);
  if (isValidCvProfile(result.output)) return result;

  const retry = await runAgent<CvProfile>({
    ...opts,
    user: `${user}\n\nDevuelve SOLO JSON válido con la estructura exacta, sin markdown.`,
  });
  if (isValidCvProfile(retry.output)) return retry;

  return { output: emptyCvProfile(), status: "fallback" };
}
