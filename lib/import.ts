import { XMLParser } from "fast-xml-parser";
import * as XLSX from "xlsx";
import { createHash } from "crypto";
import type { EmploymentType } from "@/lib/types";

/**
 * Importación de ofertas: cualquier fuente (CSV, XML, Excel, JSON de API, URL)
 * se normaliza al schema interno antes de tocar la base de datos.
 * Decisión: el mapeo de columnas es por alias conocidos (title/titulo/puesto…)
 * en lugar de un mapper configurable — suficiente para el eMVP y cubre los
 * feeds reales más comunes (XML tipo Indeed/Jooble, CSV exports de ATS).
 */

export type NormalizedJob = {
  title: string;
  description: string | null;
  skills: string[];
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  location: string | null;
  employment_type: EmploymentType;
  sector: string | null;
  department: string | null;
  category: string | null;
  experience_min_years: number;
  external_id: string | null;
  dedupe_hash: string;
};

const ALIASES: Record<keyof Omit<NormalizedJob, "dedupe_hash">, string[]> = {
  title: ["title", "titulo", "título", "puesto", "job_title", "jobtitle", "name", "position"],
  description: ["description", "descripcion", "descripción", "body", "job_description", "snippet", "summary"],
  skills: ["skills", "competencias", "requirements", "requisitos", "tags", "keywords"],
  salary_min: ["salary_min", "salario_min", "min_salary", "salaryminimum", "salary_from"],
  salary_max: ["salary_max", "salario_max", "max_salary", "salarymaximum", "salary_to"],
  salary_currency: ["salary_currency", "currency", "moneda"],
  location: ["location", "ubicacion", "ubicación", "city", "ciudad", "lugar", "site"],
  employment_type: ["employment_type", "type", "tipo", "tipo_contrato", "jobtype", "contract_type"],
  sector: ["sector", "industry", "industria"],
  department: ["department", "departamento", "area", "área"],
  category: ["category", "categoria", "categoría", "occupation"],
  experience_min_years: ["experience_min_years", "experience", "experiencia", "años_experiencia", "min_experience"],
  external_id: ["external_id", "id", "reference", "referencia", "ref", "job_id", "guid"],
};

const TYPE_MAP: Record<string, EmploymentType> = {
  full_time: "full_time", "full-time": "full_time", fulltime: "full_time",
  completa: "full_time", "jornada completa": "full_time", indefinido: "full_time",
  part_time: "part_time", "part-time": "part_time", parcial: "part_time",
  "jornada parcial": "part_time",
  contract: "contract", temporal: "contract", freelance: "contract", obra: "contract",
  internship: "internship", practicas: "internship", "prácticas": "internship", beca: "internship",
};

export function dedupeHash(title: string, location?: string | null) {
  const norm = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  return createHash("sha256")
    .update(`${norm(title)}|${norm(location ?? "")}`)
    .digest("hex")
    .slice(0, 32);
}

function pick(row: Record<string, unknown>, field: keyof typeof ALIASES): unknown {
  const keys = Object.keys(row);
  for (const alias of ALIASES[field]) {
    const k = keys.find((key) => key.toLowerCase().trim() === alias);
    if (k != null && row[k] != null && row[k] !== "") return row[k];
  }
  return null;
}

function toInt(v: unknown): number | null {
  if (v == null) return null;
  const n = parseInt(String(v).replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

function toSkills(v: unknown): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean);
  return String(v)
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 15);
}

export function normalizeRow(row: Record<string, unknown>): NormalizedJob | null {
  const title = pick(row, "title");
  if (!title || !String(title).trim()) return null;

  const location = pick(row, "location");
  const rawType = String(pick(row, "employment_type") ?? "").toLowerCase().trim();

  return {
    title: String(title).trim(),
    description: pick(row, "description") ? String(pick(row, "description")).trim() : null,
    skills: toSkills(pick(row, "skills")),
    salary_min: toInt(pick(row, "salary_min")),
    salary_max: toInt(pick(row, "salary_max")),
    salary_currency: String(pick(row, "salary_currency") ?? "EUR").toUpperCase(),
    location: location ? String(location).trim() : null,
    employment_type: TYPE_MAP[rawType] ?? "full_time",
    sector: pick(row, "sector") ? String(pick(row, "sector")).trim() : null,
    department: pick(row, "department") ? String(pick(row, "department")).trim() : null,
    category: pick(row, "category") ? String(pick(row, "category")).trim() : null,
    experience_min_years: toInt(pick(row, "experience_min_years")) ?? 0,
    external_id: pick(row, "external_id") ? String(pick(row, "external_id")) : null,
    dedupe_hash: dedupeHash(String(title), location ? String(location) : null),
  };
}

// ── Parsers por formato ──────────────────────────────────────────────────────

export function parseCsv(text: string): Record<string, unknown>[] {
  // Parser CSV propio (soporta comillas y comas embebidas) para no añadir
  // dependencia; los feeds reales de export de ATS caben en este subset.
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); if (row.some((f) => f.trim() !== "")) rows.push(row); }
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""])));
}

export function parseXml(text: string): Record<string, unknown>[] {
  const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: true });
  const doc = parser.parse(text);
  // Busca el primer array de nodos del documento (jobs/job, rss/channel/item, …)
  const findArray = (node: unknown, depth = 0): Record<string, unknown>[] | null => {
    if (depth > 6 || node == null || typeof node !== "object") return null;
    if (Array.isArray(node)) return node as Record<string, unknown>[];
    for (const v of Object.values(node as Record<string, unknown>)) {
      const found = findArray(v, depth + 1);
      if (found && found.length && typeof found[0] === "object") return found;
    }
    return null;
  };
  const items = findArray(doc) ?? [];
  // Aplana valores tipo {#text: "..."} de los CDATA
  return items.map((item) =>
    Object.fromEntries(
      Object.entries(item).map(([k, v]) => [
        k,
        v != null && typeof v === "object" && "#text" in (v as object)
          ? (v as Record<string, unknown>)["#text"]
          : v,
      ])
    )
  );
}

export function parseXlsx(buffer: ArrayBuffer): Record<string, unknown>[] {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
}

export function parseJson(text: string): Record<string, unknown>[] {
  const data = JSON.parse(text);
  if (Array.isArray(data)) return data;
  // Respuestas de API tipo {jobs: [...]} / {results: [...]} / {data: [...]}
  for (const key of ["jobs", "results", "data", "items", "ofertas"]) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [data];
}

/** Extracción best-effort de una página HTML de oferta (modo URL). */
export function parseHtmlJob(html: string, url: string): Record<string, unknown>[] {
  // 1) JSON-LD JobPosting (estándar de Google for Jobs) si existe
  const ldMatches = html.match(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) ?? [];
  for (const m of ldMatches) {
    try {
      const json = JSON.parse(m.replace(/<script[^>]*>|<\/script>/gi, ""));
      const posting = Array.isArray(json)
        ? json.find((j) => j["@type"] === "JobPosting")
        : json["@type"] === "JobPosting" ? json : null;
      if (posting) {
        return [{
          title: posting.title,
          description: String(posting.description ?? "").replace(/<[^>]+>/g, "\n").trim(),
          location: posting.jobLocation?.address?.addressLocality ?? posting.jobLocation?.name,
          salary_min: posting.baseSalary?.value?.minValue,
          salary_max: posting.baseSalary?.value?.maxValue,
          employment_type: posting.employmentType,
          sector: posting.industry,
          external_id: url,
        }];
      }
    } catch { /* sigue con el fallback */ }
  }
  // 2) Fallback: <title> + texto plano
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();
  const body = html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 4000);
  if (!title) return [];
  return [{ title, description: body, external_id: url }];
}
