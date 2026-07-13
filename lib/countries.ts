/**
 * Catálogo de países para formularios (modal de CV, editor admin, ofertas).
 * El usuario ve el NOMBRE; el dato persistido es el código ISO 3166-1 alpha-2
 * (candidates.country_code / jobs.country_code — lo que consume el matching).
 * Orden: mercados core primero, resto alfabético.
 */
export type Country = { code: string; name: string };

export const COUNTRIES: Country[] = [
  { code: "ES", name: "España" },
  { code: "VE", name: "Venezuela" },
  { code: "MX", name: "México" },
  { code: "CO", name: "Colombia" },
  { code: "AR", name: "Argentina" },
  { code: "CL", name: "Chile" },
  { code: "PE", name: "Perú" },
  { code: "BR", name: "Brasil" },
  { code: "EC", name: "Ecuador" },
  { code: "UY", name: "Uruguay" },
  { code: "PY", name: "Paraguay" },
  { code: "BO", name: "Bolivia" },
  { code: "CR", name: "Costa Rica" },
  { code: "PA", name: "Panamá" },
  { code: "DO", name: "República Dominicana" },
  { code: "GT", name: "Guatemala" },
  { code: "HN", name: "Honduras" },
  { code: "SV", name: "El Salvador" },
  { code: "NI", name: "Nicaragua" },
  { code: "CU", name: "Cuba" },
  { code: "PR", name: "Puerto Rico" },
  { code: "US", name: "Estados Unidos" },
  { code: "CA", name: "Canadá" },
  { code: "GB", name: "Reino Unido" },
  { code: "PT", name: "Portugal" },
  { code: "FR", name: "Francia" },
  { code: "DE", name: "Alemania" },
  { code: "IT", name: "Italia" },
  { code: "NL", name: "Países Bajos" },
  { code: "BE", name: "Bélgica" },
  { code: "CH", name: "Suiza" },
  { code: "IE", name: "Irlanda" },
  { code: "PL", name: "Polonia" },
  { code: "RO", name: "Rumanía" },
  { code: "MA", name: "Marruecos" },
  { code: "CN", name: "China" },
  { code: "IN", name: "India" },
  { code: "PH", name: "Filipinas" },
  { code: "AU", name: "Australia" },
];

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c.name]));

/** Nombre legible desde el ISO-2 ("ES" → "España"); devuelve el código si no está en el catálogo. */
export function countryName(code: string | null | undefined): string | null {
  if (!code) return null;
  return BY_CODE.get(code.toUpperCase()) ?? code;
}
