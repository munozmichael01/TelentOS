// scripts/import-turijobs.mjs — importa el feed XML de partner de Turijobs al board.
//
//   node scripts/import-turijobs.mjs <feed-url> [--limit N] [--dry]
//
// Modelo: una empresa MATRIZ "Turijobs" (source=import_turijobs) y cada anunciante del
// feed como empresa HIJA (parent_company_id=Turijobs, source=import_turijobs). Cada oferta
// se inserta bajo su anunciante real. Idempotente: reusa empresas por slug determinista y
// ofertas por (company_id, external_id). Service_role (bypassa RLS) — igual que seed-demo.
//
// Salario: parseo DETERMINISTA del texto "min - max Periodo/Bruto" → min/max + salary_period
// (+ currency EUR). Sin LLM. Lo que no matchee un patrón claro → salario null (no se adivina).

import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(ROOT, "package.json"));
const { createClient } = require("@supabase/supabase-js");
const { XMLParser } = require("fast-xml-parser");

const env = Object.fromEntries(
  readFileSync(join(ROOT, ".env.local"), "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const args = process.argv.slice(2);
const FEED_URL = args.find((a) => a.startsWith("http"));
const LIMIT = args.includes("--limit") ? Number(args[args.indexOf("--limit") + 1]) : Infinity;
const DRY = args.includes("--dry");
if (!FEED_URL) { console.error("Falta la URL del feed."); process.exit(1); }

// ── Crosswalk categoría Turijobs → nuestra category_key canónica ─────────────
const CAT_MAP = {
  "Cocina": "hospitality_food", "Sala": "hospitality_food", "Recepción": "hospitality_food",
  "Pisos y Limpieza": "hospitality_food", "Dirección": "hospitality_food", "Reservas": "hospitality_food",
  "Animación, Entretenimiento y Ocio": "hospitality_food", "Eventos": "hospitality_food",
  "Agencia de viajes": "hospitality_food", "Salud y Bienestar": "hospitality_food",
  "Mantenimiento": "engineering_maintenance", "Comercial": "sales_business_dev",
  "Atención al cliente": "customer_support", "Administración y Finanzas": "finance_accounting",
  "Compras, Logística y Operaciones": "logistics_supply_chain", "RRHH": "hr_recruiting",
  "Tecnología": "software_engineering", "Marketing y RRPP": "marketing_content",
  "Consultoría y Formación": "learning_education", "Seguridad": "office_admin",
};
const catKey = (c) => CAT_MAP[c?.trim()] ?? "hospitality_food"; // el feed es todo hostelería

const COUNTRY = { "40": "ES", "118": "PT", "3": "AD", "71": "IT", "5": "FR", "122": "GB", "120": "US", "68": "MX", "60": "DE", "48": "CH" };

const PERIOD = { hora: "hour", diario: "day", dia: "day", semanal: "week", mensual: "month", mes: "month", anual: "year", año: "year", ano: "year" };
function parseSalary(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return { min: null, max: null, period: "month" };
  const m = s.match(/^\s*([\d.,]+)\s*-\s*([\d.,]+)\s*([A-Za-zñÑáéíóúÁÉÍÓÚ]+)/);
  if (!m) return { min: null, max: null, period: "month" };
  const num = (x) => Math.round(parseFloat(String(x).replace(/\.(?=\d{3}\b)/g, "").replace(",", ".")));
  let min = num(m[1]), max = num(m[2]);
  const period = PERIOD[m[3].toLowerCase()] ?? "month";
  if (!Number.isFinite(min)) min = null; if (!Number.isFinite(max)) max = null;
  // Guardas: placeholders / valores irrisorios → sin salario (no adivinar).
  if (min != null && max != null && max < min) [min, max] = [max, min];
  if (min <= 1 && (max ?? 0) <= 1) return { min: null, max: null, period };            // "1 - 1 Mensual"
  if (period === "month" && (max ?? 0) < 300) return { min: null, max: null, period };  // mensual irreal
  return { min, max, period };
}

const EMP = { "media jornada": "part_time", "jornada completa": "full_time", "completa": "full_time", "prácticas": "internship", "practicas": "internship", "contrato fijo": "full_time" };
const empType = (j) => EMP[String(j ?? "").toLowerCase().trim()] ?? "full_time";

const slugify = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 44) || "empresa";
const stripHtml = (s) => String(s ?? "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\n{3,}/g, "\n\n").trim();
const dedupeHash = (title, loc) => createHash("sha1").update(`${slugify(title)}|${slugify(loc ?? "")}`).digest("hex");
const val = (x) => (x && typeof x === "object" && "#text" in x ? x["#text"] : x);

async function main() {
  console.log("Descargando feed…");
  const xml = await fetch(FEED_URL, { headers: { "User-Agent": "TalentOS-importer" } }).then((r) => r.text());
  const doc = new XMLParser({ ignoreAttributes: false, parseTagValue: false }).parse(xml);
  const jobs = (doc?.jobs?.job ? [].concat(doc.jobs.job) : []).slice(0, LIMIT);
  console.log(`Ofertas en el feed: ${jobs.length}`);

  // Empresa matriz Turijobs
  let parentId;
  {
    const { data: existing } = await db.from("companies").select("id").eq("slug", "turijobs").maybeSingle();
    if (existing) parentId = existing.id;
    else if (!DRY) {
      const { data, error } = await db.from("companies").insert({ name: "Turijobs", slug: "turijobs", source: "import_turijobs", description: "Ofertas de turismo y hostelería importadas del feed de Turijobs." }).select("id").single();
      if (error) throw error; parentId = data.id;
    }
    console.log(`Matriz Turijobs: ${parentId ?? "(dry)"}`);
  }

  const companyCache = new Map(); // companyid → uuid
  let created = 0, skipped = 0, companiesNew = 0, noSalary = 0;

  for (const j of jobs) {
    const cid = String(val(j.companyid) ?? "").trim();
    const cname = String(val(j.company) ?? "").trim() || "Empresa";
    const title = String(val(j.title) ?? "").replace(/\s*-\s*\(\s*\)\s*$/, "").replace(/\s+/g, " ").trim();
    if (!title) { skipped++; continue; }

    // Empresa anunciante (hija de Turijobs), idempotente por slug determinista
    let companyId = companyCache.get(cid);
    if (!companyId) {
      const slug = `${slugify(cname)}-tj${cid}`;
      const { data: ex } = await db.from("companies").select("id").eq("slug", slug).maybeSingle();
      if (ex) companyId = ex.id;
      else if (!DRY) {
        const logo = String(val(j.company_logo_url) ?? ""); const isReal = logo && !/\/company\.png$/.test(logo);
        const { data, error } = await db.from("companies").insert({ name: cname, slug, source: "import_turijobs", parent_company_id: parentId, logo_url: isReal ? logo : null }).select("id").single();
        if (error) { console.error("company insert", slug, error.message); skipped++; continue; }
        companyId = data.id; companiesNew++;
      } else companyId = "(dry)";
      companyCache.set(cid, companyId);
    }

    const city = String(val(j.city) ?? "").trim() || null;
    const region = String(val(j.region) ?? "").trim() || null;
    const country = COUNTRY[String(val(j.idpais) ?? "").trim()] ?? "ES";
    const sal = parseSalary(val(j.salary));
    if (sal.min == null) noSalary++;
    const extId = `turijobs:${String(val(j.id) ?? "").trim()}`;

    if (DRY) { created++; continue; }

    // Dedupe por (company, external_id)
    const { data: dup } = await db.from("jobs").select("id").eq("company_id", companyId).eq("external_id", extId).maybeSingle();
    if (dup) { skipped++; continue; }

    const { error } = await db.from("jobs").insert({
      company_id: companyId, title,
      description: stripHtml(val(j.content)) || null,
      salary_min: sal.min, salary_max: sal.max, salary_currency: "EUR", salary_period: sal.period,
      city, country_code: country, location: region,
      employment_type: empType(val(j.jobtype)),
      category: String(val(j.category) ?? "").trim() || null, category_key: catKey(val(j.category)),
      status: "active", source: "import_xml", external_id: extId,
      dedupe_hash: dedupeHash(title, city ?? region),
    });
    if (error) { console.error("job insert", title.slice(0, 30), error.message); skipped++; continue; }
    created++;
    if (created % 200 === 0) console.log(`  … ${created} ofertas`);
  }

  console.log(`\nListo. Ofertas nuevas: ${created} · saltadas (dup/sin título): ${skipped} · empresas nuevas: ${companiesNew} · sin salario (null): ${noSalary}${DRY ? " · [DRY RUN]" : ""}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
