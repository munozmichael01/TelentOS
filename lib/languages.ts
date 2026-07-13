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
