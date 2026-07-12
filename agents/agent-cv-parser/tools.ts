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
          "Obtiene el perfil actual del candidato y el texto extraído del CV adjunto (si existe). Úsala siempre como primer paso.",
        parameters: {
          type: "object",
          properties: {
            candidate_id: { type: "string", description: "UUID del candidato" },
          },
          required: ["candidate_id"],
        },
      },
    },
    execute: (args) => getCandidateCvContext(String(args.candidate_id)),
  },
];
