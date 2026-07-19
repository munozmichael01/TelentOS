import { z } from "zod";
import { runAgent, type AgentResult, type AgentTool } from "@/agents/core";

// C2 — Redactor de perfil del candidato para el arranque EN FRÍO del builder (sin CV):
// a partir de rol + experiencia + pitch, propone titular, "Sobre mí" y skills. El agente
// PROPONE; el candidato confirma en la UI (invariante de agentes). Sin CV se apoya solo
// en lo que el usuario tecleó; con CV, el parser ya enriquece (no se usa esto).

const OutputSchema = z.object({
  headline: z.string(),
  about: z.string(),
  skills: z.array(z.string()),
});
export type ProfileWriterOutput = z.infer<typeof OutputSchema>;

const SYSTEM = `Eres un redactor de perfiles profesionales para un job board.
A partir del rol, años de experiencia, modalidad y una frase del candidato, redacta un perfil breve y creíble EN PRIMERA PERSONA, en el idioma del input (español por defecto).
Devuelve SOLO JSON válido, sin markdown, con esta estructura exacta:
{ "headline": string, "about": string, "skills": string[] }
Reglas:
- headline: título profesional pulido (p.ej. "Product Designer Senior"). Ajusta el nivel según los años (5+ → Senior; 8+ → Lead/Staff). Sin inventar cargos.
- about: 2-4 oraciones, primera persona, tono profesional y concreto. NO inventes logros, empresas ni cifras que el usuario no dio; parte solo del rol/experiencia/pitch.
- skills: 5-10 skills típicas y relevantes para ese rol, normalizadas, sin duplicados.
- NUNCA inventes datos personales.`;

export async function runProfileWriter(input: {
  role: string; experienceYears?: number; pitch?: string; modality?: string;
}): Promise<AgentResult<ProfileWriterOutput>> {
  const user = [
    `Rol: ${input.role}`,
    `Años de experiencia: ${input.experienceYears ?? "no indicado"}`,
    `Modalidad preferida: ${input.modality ?? "no indicada"}`,
    `En una frase, qué lo hace bueno: ${input.pitch?.trim() || "—"}`,
  ].join("\n");

  return runAgent<ProfileWriterOutput>({
    agent: "profile-writer",
    model: "gpt-4o-mini",
    maxTokens: 500,
    system: SYSTEM,
    user,
    tools: [] as AgentTool[],
    input,
    validate: (v) => OutputSchema.parse(v),
    // Sin OPENAI: devuelve lo tecleado (comportamiento previo, sin enriquecer).
    fallback: () => ({ headline: input.role || "", about: input.pitch?.trim() || "", skills: [] }),
  });
}
