import { runAgent, type AgentResult } from "@/agents/core";
import { getMarketSalary, suggestSkills } from "@/lib/data/market";
import { SYSTEM_PROMPT } from "./prompt";
import { tools } from "./tools";

export type JobDraft = {
  title: string;
  description: string;
  skills: string[];
  salary_min: number;
  salary_max: number;
  salary_currency: string;
  location: string | null;
  employment_type: "full_time" | "part_time" | "contract" | "internship";
  sector: string;
  category: string;
  experience_min_years: number;
  rationale: string;
};

export type JobWriterInput = {
  /** Brief libre ("necesito un SDR junior para Barcelona") o vacío si hay draft */
  brief?: string;
  /** Estado actual del formulario para el modo asistencia */
  draft?: Partial<{
    title: string;
    description: string;
    skills: string[];
    location: string;
    salary_min: number;
    salary_max: number;
    sector: string;
  }>;
};

/** Heurística sin LLM: arma un borrador correcto con los datos de mercado. */
function fallbackDraft(input: JobWriterInput): JobDraft {
  const title = input.draft?.title || input.brief?.slice(0, 80) || "Nueva posición";
  const location = input.draft?.location ?? null;
  const salary = getMarketSalary(title, location ?? undefined);
  const { skills, sector } = suggestSkills(title);
  return {
    title,
    description:
      input.draft?.description ||
      `## Sobre el rol\nBuscamos ${title} para incorporarse a nuestro equipo${location ? ` en ${location}` : ""}.\n\n## Responsabilidades\n- Ejecutar las funciones principales del puesto con autonomía\n- Colaborar con el resto del equipo en los objetivos del área\n- Proponer mejoras en procesos y herramientas\n\n## Requisitos\n${skills.slice(0, 4).map((s) => `- Experiencia demostrable en ${s}`).join("\n")}\n\n## Qué ofrecemos\n- Banda salarial transparente\n- Desarrollo profesional y formación continua`,
    skills: input.draft?.skills?.length ? input.draft.skills : skills,
    salary_min: input.draft?.salary_min ?? salary.min,
    salary_max: input.draft?.salary_max ?? salary.max,
    salary_currency: "EUR",
    location,
    employment_type: "full_time",
    sector: input.draft?.sector || sector,
    category: sector,
    experience_min_years: /senior|lead/i.test(title) ? 5 : /junior|trainee/i.test(title) ? 0 : 2,
    rationale: `Borrador generado en modo heurístico (sin OPENAI_API_KEY): banda salarial de mercado ${salary.min}–${salary.max} € para "${title}".`,
  };
}

export async function runJobWriter(input: JobWriterInput): Promise<AgentResult<JobDraft>> {
  const user = input.brief
    ? `Brief del recruiter: "${input.brief}"\n\nGenera un borrador completo de la oferta.`
    : `Estado actual del borrador del recruiter:\n${JSON.stringify(input.draft ?? {}, null, 2)}\n\nCompleta y mejora la oferta manteniendo la intención del usuario. Sugiere salario de mercado y skills.`;

  return runAgent<JobDraft>({
    agent: "job-writer",
    system: SYSTEM_PROMPT,
    user,
    tools,
    input,
    fallback: () => fallbackDraft(input),
  });
}
