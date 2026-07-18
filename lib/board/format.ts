// Helpers de presentación del job board (deterministas, compartidos por SSR y cliente).
import type { BoardJob } from "@/lib/job-board/search";

// Estilo por modalidad (identidad visual del board — mockup Board público).
const MODALITY_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  remoto: { color: "#0E5C4A", bg: "#DCEFE4", border: "#BEE0CE" },
  hibrido: { color: "#5A4C86", bg: "#E7E0F2", border: "#D3C7EC" },
  presencial: { color: "#946312", bg: "#F8E7C4", border: "#EBD4A0" },
};
export function modalityStyle(modality: string | null) {
  return (modality && MODALITY_STYLE[modality]) || { color: "#54504A", bg: "#F4F0E8", border: "#E7E1D4" };
}

// Paleta determinista para el logotipo de empresa (sin logo_url → iniciales + color).
const LOGO_PALETTE = [
  { bg: "#DCEFE4", color: "#0E5C4A" },
  { bg: "#F8E7C4", color: "#946312" },
  { bg: "#E7E0F2", color: "#5A4C86" },
  { bg: "#F6E0D9", color: "#C7402E" },
  { bg: "#EAF7C4", color: "#46540F" },
];
export function logoFor(name: string | null | undefined) {
  const n = (name ?? "?").trim();
  const initials = n.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
  let h = 0;
  for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0;
  return { initials, ...LOGO_PALETTE[h % LOGO_PALETTE.length] };
}

// Salario "$1.800–2.400" (o "Desde $X" / "Hasta $X"); null → cadena vacía.
export function formatSalary(job: Pick<BoardJob, "salary_min" | "salary_max" | "salary_currency">, locale: string) {
  const { salary_min: min, salary_max: max, salary_currency: cur } = job;
  if (min == null && max == null) return "";
  const sym = cur === "USD" || cur == null ? "$" : `${cur} `;
  const fmt = (n: number) => new Intl.NumberFormat(locale).format(n);
  if (min != null && max != null) return `${sym}${fmt(min)}–${fmt(max)}`;
  const one = (min ?? max)!;
  return `${sym}${fmt(one)}`;
}

// Fecha relativa corta ("hoy", "hace 3 d") con Intl.RelativeTimeFormat.
export function relativeDate(iso: string, locale: string) {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" });
  const diffMs = new Date(iso).getTime() - Date.now();
  const days = Math.round(diffMs / 86_400_000);
  if (days === 0) {
    const hours = Math.round(diffMs / 3_600_000);
    return hours === 0 ? rtf.format(0, "day") : rtf.format(hours, "hour");
  }
  if (Math.abs(days) < 30) return rtf.format(days, "day");
  return rtf.format(Math.round(days / 30), "month");
}

export function isNew(iso: string) {
  return Date.now() - new Date(iso).getTime() < 3 * 86_400_000; // < 3 días
}

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}
// Slug SEO de la oferta: titulo-empresa-<uuid>. El uuid al final permite resolver la
// oferta sin columna de slug (idFromSlug lo extrae).
export function jobSlug(job: Pick<BoardJob, "id" | "title"> & { company?: { name?: string | null } | null }) {
  const parts = [slugify(job.title), job.company?.name ? slugify(job.company.name) : "", job.id].filter(Boolean);
  return parts.join("-");
}
export function idFromSlug(slug: string): string | null {
  return slug.match(UUID_RE)?.[0] ?? null;
}
