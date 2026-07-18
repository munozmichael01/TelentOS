// Completitud del perfil de candidato — DETERMINISTA. Define el gate del "1-toque":
// un perfil COMPLETO permite aplicar de un toque; uno incompleto abre el formulario
// con los huecos señalados. Distinto de "existe perfil" (identidad mínima presente).
//
// Definición de completo (acordada con producto):
//   CV subido o perfil generado · nombre · email · teléfono · ≥3 skills ·
//   ≥1 experiencia o formación · ubicación · ≥1 idioma · preferencias.

export type ProfileForCompleteness = {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  about: string | null;
  hasCv: boolean; // cv_url presente en alguna ficha ATS del candidato
  city: string | null;
  country_code: string | null;
  experience_years: number | null;
  education: unknown[]; // jsonb del cv-parser
  languages: unknown[]; // jsonb del cv-parser (CEFR)
  pref_salary_min: number | null;
  pref_modality: string[];
  pref_locations: string[];
  pref_contract: string[];
  skillCount: number;
};

export type CompletenessCheck = { key: string; label: string; ok: boolean };
export type Completeness = {
  pct: number; // 0–100
  complete: boolean; // todos los checks en verde → 1-toque
  hasProfile: boolean; // identidad mínima (nombre + email) → la cuenta "existe"
  missing: string[]; // keys de los checks pendientes
  checks: CompletenessCheck[];
};

const has = (s: string | null | undefined) => !!s && s.trim().length > 0;

export function computeProfileCompleteness(p: ProfileForCompleteness): Completeness {
  const checks: CompletenessCheck[] = [
    { key: "identity", label: "Nombre y email", ok: has(p.full_name) && has(p.email) },
    { key: "phone", label: "Teléfono", ok: has(p.phone) },
    { key: "profile", label: "CV o perfil generado", ok: p.hasCv || has(p.about) },
    { key: "skills", label: "Al menos 3 skills", ok: p.skillCount >= 3 },
    {
      key: "background",
      label: "Experiencia o formación",
      ok: (p.experience_years ?? 0) > 0 || (Array.isArray(p.education) && p.education.length > 0),
    },
    { key: "location", label: "Ubicación", ok: has(p.city) || has(p.country_code) },
    { key: "language", label: "Al menos un idioma", ok: Array.isArray(p.languages) && p.languages.length > 0 },
    {
      key: "preferences",
      label: "Preferencias",
      ok:
        p.pref_salary_min != null ||
        p.pref_modality.length > 0 ||
        p.pref_locations.length > 0 ||
        p.pref_contract.length > 0,
    },
  ];

  const passed = checks.filter((c) => c.ok).length;
  return {
    pct: Math.round((passed / checks.length) * 100),
    complete: passed === checks.length,
    hasProfile: has(p.full_name) && has(p.email),
    missing: checks.filter((c) => !c.ok).map((c) => c.key),
    checks,
  };
}
