import { runAgent, type AgentResult } from "@/agents/core";
import { SYSTEM_PROMPT } from "./prompt";
import { tools, getCandidateCvContext } from "./tools";

export type CvProfile = {
  name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  summary: string;
  skills: string[];
  experience_years: number;
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
    (o.extracted_source === "cv_text" || o.extracted_source === "fallback")
  );
}

async function fallbackProfile(input: CvParserInput): Promise<CvProfile> {
  const ctx = await getCandidateCvContext(input.candidateId);
  if ("error" in ctx) {
    return { name: null, email: null, phone: null, location: null, summary: "", skills: [], experience_years: 0, extracted_source: "fallback" };
  }
  return {
    name: ctx.name,
    email: ctx.email,
    phone: ctx.phone,
    location: ctx.location,
    summary: ctx.summary ?? "",
    skills: ctx.skills,
    experience_years: ctx.experience_years,
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
