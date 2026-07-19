import type { EducationLevel } from "@/lib/types";

// Orden canónico de niveles educativos (bajo → alto). Compartido por el fit,
// el cv-parser y los endpoints de inscripción.
export const EDUCATION_RANK: Record<EducationLevel, number> = {
  none: 0, secondary: 1, vocational: 2, bachelor: 3, master: 4, phd: 5,
};

/** Nivel más alto de una lista de formaciones (null si ninguna trae nivel). */
export function highestEducationLevel(
  levels: Array<EducationLevel | null | undefined>,
): EducationLevel | null {
  let best: EducationLevel | null = null;
  for (const l of levels) {
    if (!l) continue;
    if (best === null || EDUCATION_RANK[l] > EDUCATION_RANK[best]) best = l;
  }
  return best;
}
