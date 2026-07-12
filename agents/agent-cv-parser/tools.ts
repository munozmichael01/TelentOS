import type { AgentTool } from "@/agents/core";
import { createAdminClient } from "@/lib/supabase/server";
import { extractCvText } from "@/lib/cv-text";

export type CandidateCvContext = {
  candidate_id: string;
  name: string;
  email: string;
  phone: string | null;
  location: string | null;
  city: string | null;
  country_code: string | null;
  skills: string[];
  experience_years: number;
  summary: string | null;
  cv_text: string | null;
  cv_available: boolean;
};

export async function getCandidateCvContext(candidateId: string): Promise<CandidateCvContext | { error: string }> {
  const db = createAdminClient();

  const { data: candidate } = await db
    .from("candidates")
    .select("id, name, email, phone, location, city, country_code, skills, experience_years, summary, cv_url")
    .eq("id", candidateId)
    .maybeSingle();

  if (!candidate) return { error: "Candidato no encontrado" };

  let cvText: string | null = null;

  if (candidate.cv_url) {
    try {
      const { data: signData } = await db.storage
        .from("cvs")
        .createSignedUrl(candidate.cv_url as string, 60);

      if (signData?.signedUrl) {
        const res = await fetch(signData.signedUrl);
        if (res.ok) {
          const buffer = await res.arrayBuffer();
          const raw = await extractCvText(buffer); // PDF real vía unpdf; plain-text si no
          // Trim to 8 000 chars to stay within token budget
          cvText = raw.length > 8000 ? raw.slice(0, 8000) + "…" : raw || null;
        }
      }
    } catch {
      // CV fetch is best-effort; agent falls back to existing profile
    }
  }

  return {
    candidate_id: candidate.id as string,
    name: candidate.name as string,
    email: candidate.email as string,
    phone: (candidate.phone as string | null) ?? null,
    location: (candidate.location as string | null) ?? null,
    city: (candidate.city as string | null) ?? null,
    country_code: (candidate.country_code as string | null) ?? null,
    skills: (candidate.skills as string[]) ?? [],
    experience_years: (candidate.experience_years as number) ?? 0,
    summary: (candidate.summary as string | null) ?? null,
    cv_text: cvText,
    cv_available: Boolean(candidate.cv_url),
  };
}

export const tools: AgentTool[] = [
  {
    definition: {
      type: "function",
      function: {
        name: "get_candidate_cv",
        description:
          "Devuelve el texto extraído del CV (cv_text) y, por separado, el perfil existente marcado como SOLO_FALLBACK. Extrae identidad y datos del cv_text; el perfil existente solo se usa si cv_text es null.",
        parameters: {
          type: "object",
          properties: {
            candidate_id: { type: "string", description: "UUID del candidato" },
          },
          required: ["candidate_id"],
        },
      },
    },
    // La respuesta a la LLM separa cv_text (fuente real) del perfil existente
    // (placeholders del sistema) para evitar que el agente ECO el nombre genérico
    // en vez del extraído del CV — bug dominante del set de evaluación.
    execute: async (args) => {
      const ctx = await getCandidateCvContext(String(args.candidate_id));
      if ("error" in ctx) return ctx;
      return {
        cv_text: ctx.cv_text,
        cv_available: ctx.cv_available,
        instruccion:
          "Extrae name, email, phone, location, city, country_code y todo lo demás EXCLUSIVAMENTE de cv_text. " +
          "existing_profile_SOLO_FALLBACK son placeholders internos — IGNÓRALOS salvo que cv_text sea null.",
        existing_profile_SOLO_FALLBACK: {
          name: ctx.name,
          email: ctx.email,
          phone: ctx.phone,
          location: ctx.location,
          city: ctx.city,
          country_code: ctx.country_code,
          skills: ctx.skills,
          experience_years: ctx.experience_years,
          summary: ctx.summary,
        },
      };
    },
  },
];
