import { z } from "zod";
import { runAgent, type AgentResult, type AgentTool } from "@/agents/core";
import { SYSTEM_PROMPT, SYSTEM_PROMPT_TEXT } from "./prompt";
import { tools, getCandidateCvContext } from "./tools";

// Schema zod = contrato del agente (validado en core con 1 reintento in-conversation).
// Robustez barata donde no cambia el significado: enums case-insensitive, números coercidos.
const lower = (v: unknown) => (typeof v === "string" ? v.toLowerCase() : v);

export const CvExperienceSchema = z.object({
  title: z.string(),
  company: z.string().nullable().default(null),
  seniority: z.preprocess(lower, z.enum(["junior", "mid", "senior", "lead", "exec"]).nullable().default(null)),
  start_date: z.string().nullable().default(null),
  end_date: z.string().nullable().default(null),
  is_current: z.boolean().default(false),
});

export const CvLanguageSchema = z.object({
  language: z.string(),
  level: z.preprocess(lower, z.enum(["a1", "a2", "b1", "b2", "c1", "c2", "native"]).nullable().default(null)),
});

export const CvEducationSchema = z.object({
  degree: z.string(),
  institution: z.string().nullable().default(null),
  field: z.string().nullable().default(null),
  level: z.preprocess(lower, z.enum(["none", "secondary", "vocational", "bachelor", "master", "phd"]).nullable().default(null)),
  start_year: z.coerce.number().int().nullable().default(null),
  end_year: z.coerce.number().int().nullable().default(null),
});

export const CvProfileSchema = z.object({
  name: z.string().nullable().default(null),
  first_name: z.string().nullable().default(null),
  last_name: z.string().nullable().default(null),
  email: z.string().nullable().default(null),
  phone: z.string().nullable().default(null),
  location: z.string().nullable().default(null),
  city: z.string().nullable().default(null),
  country_code: z.string().nullable().default(null),
  summary: z.string().default(""),
  skills: z.array(z.string()),
  experience_years: z.coerce.number(),
  experiences: z.array(CvExperienceSchema),
  languages: z.array(CvLanguageSchema),
  education: z.array(CvEducationSchema),
  extracted_source: z.enum(["cv_text", "fallback"]),
});

export type CvExperience = z.infer<typeof CvExperienceSchema>;
export type CvLanguage = z.infer<typeof CvLanguageSchema>;
export type CvEducation = z.infer<typeof CvEducationSchema>;
export type CvProfile = z.infer<typeof CvProfileSchema>;

export type CvParserInput = { candidateId: string };

async function fallbackProfile(input: CvParserInput): Promise<CvProfile> {
  const ctx = await getCandidateCvContext(input.candidateId);
  if ("error" in ctx) {
    return {
      name: null, first_name: null, last_name: null, email: null, phone: null, location: null,
      city: null, country_code: null, summary: "", skills: [],
      experience_years: 0, experiences: [], languages: [], education: [],
      extracted_source: "fallback",
    };
  }
  return {
    name: ctx.name,
    first_name: ctx.name ? ctx.name.split(" ")[0] : null,
    last_name: ctx.name && ctx.name.includes(" ") ? ctx.name.slice(ctx.name.indexOf(" ") + 1).trim() : null,
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
  // Validación + 1 reintento los hace el core in-conversation (más barato que
  // re-invocar: no repaga el contexto completo); doble fallo → fallback.
  return runAgent<CvProfile>({
    agent: "cv-parser",
    model: "gpt-4o-mini",
    maxTokens: 1200,
    system: SYSTEM_PROMPT,
    user: `Extrae el perfil del candidato con id "${input.candidateId}". Llama primero a get_candidate_cv.`,
    tools,
    input,
    validate: (v) => CvProfileSchema.parse(v),
    fallback: () => fallbackProfile(input),
  });
}

/** Perfil vacío — usado cuando el texto del CV no da para extraer nada. */
export function emptyCvProfile(): CvProfile {
  return {
    name: null, first_name: null, last_name: null, email: null, phone: null, location: null,
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
  return runAgent<CvProfile>({
    agent: "cv-parser",
    model: "gpt-4o-mini",
    maxTokens: 1200,
    system: SYSTEM_PROMPT_TEXT,
    user,
    tools: [] as AgentTool[],
    input: { source: "careers-parse", length: trimmed.length },
    validate: (v) => CvProfileSchema.parse(v),
    fallback: () => emptyCvProfile(),
  });
}
