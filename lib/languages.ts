/**
 * Catálogo de idiomas comunes para formularios (modal de CV, editor admin).
 * El select ofrece estos; el campo admite texto libre para el resto (el parser
 * puede extraer cualquier idioma). Los niveles son los del modelo de datos
 * (candidate_languages.level): CEFR + nativo.
 */
export const COMMON_LANGUAGES = [
  "Español",
  "Inglés",
  "Portugués",
  "Francés",
  "Alemán",
  "Italiano",
  "Catalán",
  "Euskera",
  "Gallego",
  "Chino",
  "Árabe",
  "Ruso",
  "Japonés",
  "Neerlandés",
  "Polaco",
  "Rumano",
] as const;

export const LANGUAGE_LEVELS = [
  { value: "a1", label: "A1 · Principiante" },
  { value: "a2", label: "A2 · Básico" },
  { value: "b1", label: "B1 · Intermedio" },
  { value: "b2", label: "B2 · Intermedio alto" },
  { value: "c1", label: "C1 · Avanzado" },
  { value: "c2", label: "C2 · Dominio" },
  { value: "native", label: "Nativo" },
] as const;

/** Etiqueta legible del nivel ("b2" → "B2 · Intermedio alto"). */
export function languageLevelLabel(level: string | null | undefined): string | null {
  if (!level) return null;
  return LANGUAGE_LEVELS.find((l) => l.value === level.toLowerCase())?.label ?? level;
}

// El parser puede devolver el idioma en el idioma del CV ("English", "Spanish");
// el catálogo de la UI está en español. Sin esta normalización el select cae a
// "Otro…" y se pierde el match visual con el catálogo.
const LANGUAGE_ALIASES: Record<string, (typeof COMMON_LANGUAGES)[number]> = {
  english: "Inglés",
  spanish: "Español",
  castellano: "Español",
  portuguese: "Portugués",
  french: "Francés",
  german: "Alemán",
  italian: "Italiano",
  catalan: "Catalán",
  basque: "Euskera",
  galician: "Gallego",
  chinese: "Chino",
  mandarin: "Chino",
  arabic: "Árabe",
  russian: "Ruso",
  japanese: "Japonés",
  dutch: "Neerlandés",
  polish: "Polaco",
  romanian: "Rumano",
};

/** Normaliza al nombre del catálogo (case-insensitive + alias EN→ES); si no está, devuelve el original limpio. */
export function normalizeLanguageName(raw: string): string {
  const s = raw.trim();
  if (!s) return s;
  const key = s.toLowerCase();
  const catalogHit = COMMON_LANGUAGES.find((l) => l.toLowerCase() === key);
  if (catalogHit) return catalogHit;
  return LANGUAGE_ALIASES[key] ?? s;
}
