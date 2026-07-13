/**
 * Modelo editable compartido del perfil de CV. Lo usan tanto el panel admin
 * ("Extraer del CV" en la ficha de candidato) como la modal de validación del
 * candidato en la inscripción del career site. Una sola forma → un solo editor
 * (components/features/cv-profile-fields.tsx) → un solo contrato con el endpoint.
 */
import type { CvProfile, CvExperience, CvLanguage, CvEducation } from "@/agents/agent-cv-parser";
import { normalizeLanguageName } from "@/lib/languages";

export type EditableCvProfile = {
  name: string;
  email: string;
  phone: string;
  location: string;
  city: string;
  country_code: string;
  summary: string;
  experience_years: number;
  skills: string[];
  experiences: CvExperience[];
  languages: CvLanguage[];
  education: CvEducation[];
};

export function emptyEditableProfile(): EditableCvProfile {
  return {
    name: "", email: "", phone: "", location: "", city: "", country_code: "",
    summary: "", experience_years: 0, skills: [], experiences: [], languages: [], education: [],
  };
}

/** Normaliza la salida del agente (nullable) al modelo editable (strings vacíos). */
export function fromCvProfile(p: CvProfile): EditableCvProfile {
  return {
    name: p.name ?? "",
    email: p.email ?? "",
    phone: p.phone ?? "",
    location: p.location ?? "",
    city: p.city ?? "",
    country_code: p.country_code ?? "",
    summary: p.summary ?? "",
    experience_years: p.experience_years ?? 0,
    skills: p.skills ?? [],
    experiences: p.experiences ?? [],
    // Nombre de idioma al catálogo de la UI ("English" → "Inglés"): sin esto el
    // select cae a "Otro…" aunque el idioma sea común.
    languages: (p.languages ?? []).map((l) => ({ ...l, language: normalizeLanguageName(l.language) })),
    education: p.education ?? [],
  };
}

/** Cuerpo para el endpoint de persistencia (strings vacíos → null). */
export function toProfilePayload(p: EditableCvProfile) {
  return {
    name: p.name || null,
    email: p.email || null,
    phone: p.phone || null,
    location: p.location || null,
    city: p.city || null,
    country_code: p.country_code || null,
    summary: p.summary,
    experience_years: p.experience_years,
    skills: p.skills,
    experiences: p.experiences,
    languages: p.languages,
    education: p.education,
  };
}
