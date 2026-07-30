// Poblado de job titles desde la API REAL de ESCO. Trae ocupaciones con escoUri +
// traducciones es/en/pt + sinónimos (alternativeLabel) + skills (essential/optional con peso)
// y las inserta en la taxonomía oficial. Nunca con el LLM (regla 2 de CLAUDE.md).
// Generalizado desde el seeder de hostelería: mismo pipeline probado, con presets de SECTOR
// para no clonar el script por cada sector que haga falta abrir.
//
// Dos modos:
//   · IMPORT   trae ocupaciones nuevas de los sectores indicados.
//   · --enrich completa lo que el builder truncó en los títulos QUE YA EXISTEN: el
//              `build-taxonomy-from-esco.mjs` recorta sinónimos y skills a 8, y ahí se
//              perdieron los acrónimos de ESCO (CEO, QA…) y skills core. Solo añade, no borra.
//
//   node scripts/seed-titles-from-esco.mjs --sector=software,people_hr [--dry]
//   node scripts/seed-titles-from-esco.mjs --sector=all --dry
//   node scripts/seed-titles-from-esco.mjs --enrich [--dry]
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(ROOT, "package.json"));
const { createClient } = require("@supabase/supabase-js");
const env = Object.fromEntries(readFileSync(join(ROOT, ".env.local"), "utf8").split("\n")
  .filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const DRY = process.argv.includes("--dry");
const ENRICH = process.argv.includes("--enrich");
const argOf = (name) => (process.argv.find((a) => a.startsWith(`--${name}=`)) ?? "").split("=")[1] ?? "";

const ESCO = "https://ec.europa.eu/esco/api", VERSION = "v1.2.0", LOCALES = ["en", "es", "pt"];
// Cuántas etiquetas/skills se guardan por ocupación. Por encima del cap de 8 del builder:
// los acrónimos (CEO, QA) viven al final de la lista de alternativeLabel de ESCO.
const MAX_SYNONYMS = 30, MAX_ESSENTIAL = 10, MAX_OPTIONAL = 8;

// Presets de sector: términos de búsqueda en ESCO + a qué categoría nuestra se mapean
// (category_key de data/taxonomy/categories.json). Abrir un sector nuevo = una entrada aquí.
const SECTORS = {
  hospitality: {
    category: "Retail & Hospitality", sector: "hospitality_food", categoryKey: "hospitality_food",
    terms: ["cook", "chef", "waiter", "waitress", "bartender", "barista", "hotel receptionist", "kitchen assistant",
      "kitchen porter", "housekeeper", "chambermaid", "restaurant manager", "hotel manager", "sommelier", "head waiter",
      "food and beverage manager", "room attendant", "concierge", "pastry chef", "commis chef", "catering manager", "host"],
  },
  software: {
    category: "Engineering", sector: "tech_saas", categoryKey: "software_engineering",
    terms: ["software developer", "front-end developer", "back-end developer", "mobile application developer",
      "software architect", "software tester", "web developer", "user interface developer"],
  },
  it_ops: {
    category: "Engineering", sector: "tech_saas", categoryKey: "it_ops_security",
    terms: ["ICT system administrator", "ICT network administrator", "cloud engineer", "ICT security manager",
      "ICT operations manager", "database administrator"],
  },
  product_design: {
    category: "Engineering", sector: "tech_saas", categoryKey: "product_design",
    terms: ["product designer", "user experience designer", "user interface designer", "industrial designer",
      "product development manager"],
  },
  exec: {
    category: "Admin & Office", sector: "admin_office", categoryKey: "office_admin",
    terms: ["chief executive officer", "managing director", "chief operating officer", "chief technology officer",
      "business manager", "operations manager", "chief information officer"],
  },
  people_hr: {
    category: "People & HR", sector: "people_hr", categoryKey: "hr_recruiting",
    terms: ["human resources manager", "human resources officer", "recruitment consultant", "recruiter",
      "human resources assistant", "training manager", "payroll clerk"],
  },
  finance: {
    category: "Finance & Accounting", sector: "finance_accounting", categoryKey: "finance_accounting",
    terms: ["financial analyst", "accountant", "financial manager", "controller", "accounting assistant"],
  },
  marketing: {
    category: "Marketing & Growth", sector: "marketing_growth", categoryKey: "marketing_content",
    terms: ["marketing manager", "marketing specialist", "digital marketing manager", "content manager",
      "communications manager"],
  },
  customer: {
    category: "Sales & Customer", sector: "sales_customer", categoryKey: "customer_support",
    terms: ["customer service manager", "customer service representative", "client relations manager",
      "call centre manager", "account manager"],
  },
  logistics: {
    category: "Industrial & Energy", sector: "industrial_energy", categoryKey: "logistics_supply_chain",
    terms: ["logistics coordinator", "supply chain manager", "purchasing manager", "warehouse manager",
      "procurement specialist"],
  },
  maintenance: {
    category: "Industrial & Energy", sector: "industrial_energy", categoryKey: "engineering_maintenance",
    terms: ["maintenance technician", "field service technician", "maintenance manager", "project engineer",
      "engineering manager"],
  },
  retail: {
    category: "Retail & Hospitality", sector: "retail_hospitality", categoryKey: "retail_store",
    terms: ["cashier", "shop assistant", "store manager", "shop supervisor"],
  },
  data_ai: {
    category: "Engineering", sector: "tech_saas", categoryKey: "data_ai_analytics",
    terms: ["data scientist", "data analyst", "data engineer", "business intelligence manager", "statistician"],
  },
  banking: {
    category: "Finance & Accounting", sector: "finance_accounting", categoryKey: "banking_insurance",
    terms: ["bank teller", "insurance broker", "investment analyst", "credit analyst", "insurance underwriter"],
  },
  comms_pr: {
    category: "Marketing & Growth", sector: "marketing_growth", categoryKey: "communications_pr",
    // "press officer" se descartó como término: en ESCO arrastra operarios de prensa industrial.
    terms: ["public relations officer", "spokesperson", "communications officer", "journalist", "publications coordinator"],
  },
  construction: {
    category: "Industrial & Energy", sector: "industrial_energy", categoryKey: "construction_facilities",
    terms: ["civil engineer", "construction manager", "architect", "facilities manager", "quantity surveyor"],
  },
  electrical: {
    category: "Industrial & Energy", sector: "industrial_energy", categoryKey: "electrical_electronics",
    terms: ["electrician", "electrical engineer", "electronics engineer", "electrical mechanic"],
  },
  energy: {
    category: "Industrial & Energy", sector: "industrial_energy", categoryKey: "energy_utilities",
    terms: ["energy engineer", "power plant operator", "wind turbine technician", "solar energy technician"],
  },
  education: {
    category: "Admin & Office", sector: "admin_office", categoryKey: "learning_education",
    terms: ["teacher", "trainer", "lecturer", "school principal", "instructional designer"],
  },
  // Mantenimiento GENÉRICO de edificios/instalaciones. Las búsquedas por "maintenance
  // technician" solo devolvían las especializadas (aeronáutica, microelectrónica), y el
  // mantenimiento de hotel/instalaciones es la familia más frecuente de nuestras ofertas.
  facility_maintenance: {
    category: "Industrial & Energy", sector: "industrial_energy", categoryKey: "engineering_maintenance",
    terms: ["maintenance", "building caretaker", "facilities", "handyman", "building technician"],
  },
  mechanical: {
    category: "Industrial & Energy", sector: "industrial_energy", categoryKey: "mechanical_automotive",
    terms: ["mechanical engineer", "car mechanic", "automotive engineer", "vehicle technician"],
  },
};

/** Presets que cubren un área (category_key) concreta — para curar POR ÁREA, que es el orden
 *  correcto: se mira la cobertura por área y se siembra la que esté flaca. */
const sectorsForArea = (areaKey) => Object.entries(SECTORS).filter(([, s]) => s.categoryKey === areaKey).map(([k]) => k);
// La búsqueda de ESCO es difusa: para "human resources manager" devuelve también "human rights
// officer", "library manager" o "court clerk". Importarlas metería ocupaciones en categorías que
// no les corresponden (taxonomía sucia). Se exige que la ocupación comparta con el término
// buscado su token ESPECÍFICO — los genéricos de cargo no bastan para considerarlo un match.
const GENERIC_TOKENS = new Set(["manager", "officer", "chief", "assistant", "consultant", "clerk",
  "director", "engineer", "specialist", "coordinator", "developer", "technician", "operator",
  "administrator", "analyst", "designer", "executive", "general", "senior", "junior", "head",
  "supervisor", "representative", "and", "the", "for", "with"]);

// Cola larga de ESCO que la búsqueda difusa arrastra a cualquier área: ocupaciones de
// distribución/maquinaria del tipo "wholesale merchant in mining, construction and civil
// engineering machinery" (aparece al buscar "civil engineer") o "punch press operator" (al
// buscar "press officer"). Son ocupaciones reales pero de otro dominio, y ninguna empresa de
// nuestro ICP publica esos puestos. Descarte deliberado y documentado.
const NOISE_PATTERNS = [/wholesale merchant/i, /import export/i, /rental service/i,
  /distribution manager/i, /machinery/i, /press operator/i];

const clean = (s) => String(s ?? "").replace(/\s*\/\s*/g, " / ").replace(/\s+/g, " ").trim();
const nkey = (s) => clean(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const tokens = (s) => nkey(s).split(/[^a-z0-9]+/).filter(Boolean);
/** ¿La ocupación devuelta por ESCO corresponde de verdad al término buscado? */
function isRelevant(term, label) {
  const nt = nkey(term), nl = nkey(label);
  if (NOISE_PATTERNS.some((re) => re.test(label))) return false;
  if (nl === nt) return true;
  const spec = tokens(term).filter((w) => w.length > 2 && !GENERIC_TOKENS.has(w));
  // Términos hechos solo de genéricos ("chief executive officer"): se exige el término completo.
  if (!spec.length) return nl.includes(nt);
  const lt = new Set(tokens(label));
  return spec.every((w) => lt.has(w));
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

async function getJson(url, tries = 4) {
  for (let i = 1; i <= tries; i++) {
    const res = await fetch(url, { headers: { "user-agent": "TalentOS taxonomy builder (+ESCO)" } });
    if (res.ok) return res.json();
    if (i === tries) throw new Error(`${res.status} ${url}`);
    await sleep(300 * i);
  }
}
const api = (path, params) => { const u = new URL(`${ESCO}${path}`); Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, String(v))); return u.toString(); };

/** Detalle de una ocupación de ESCO → forma normalizada que persistimos. */
async function occupationDetail(uri) {
  const d = await getJson(api("/resource/occupation", { uri, language: "en", selectedVersion: VERSION }));
  const pref = d.preferredLabel ?? {}, alt = d.alternativeLabel ?? {};
  const canonicalName = clean(pref.en ?? d.title);
  if (!canonicalName) return null;
  const translations = {};
  for (const loc of LOCALES) translations[loc] = clean(pref[loc] ?? pref.en ?? d.title);
  const synonyms = [];
  for (const loc of LOCALES) {
    for (const s of (alt[loc] ?? []).slice(0, MAX_SYNONYMS)) {
      const v = clean(s);
      if (v && nkey(v) !== nkey(translations[loc])) synonyms.push({ locale: loc, synonym: v });
    }
  }
  const links = (k) => (Array.isArray(d._links?.[k]) ? d._links[k] : []);
  const skills = [
    ...links("hasEssentialSkill").slice(0, MAX_ESSENTIAL).map((s, i) => ({ uri: s.uri, name: clean(s.title), weight: i < 5 ? 0.95 : 0.85, isCore: true })),
    ...links("hasOptionalSkill").slice(0, MAX_OPTIONAL).map((s, i) => ({ uri: s.uri, name: clean(s.title), weight: i < 5 ? 0.65 : 0.45, isCore: false })),
  ].filter((s) => s.name);
  return { canonicalName, escoUri: uri, translations, synonyms, skills };
}

/** Traducciones, sinónimos (dedup contra la BBDD) y skills de un conjunto de títulos ya resueltos a id. */
async function persistLabelsAndSkills(titles, idFor) {
  const ids = titles.map((t) => idFor(t)).filter(Boolean);

  // Traducciones (upsert por PK job_title_id+locale).
  const tr = [];
  for (const t of titles) {
    const id = idFor(t); if (!id) continue;
    for (const loc of LOCALES) if (t.translations[loc]) tr.push({ job_title_id: id, locale: loc, name: t.translations[loc] });
  }
  for (const part of chunk(tr, 500)) { const { error } = await db.from("job_title_translations").upsert(part, { onConflict: "job_title_id,locale" }); if (error) throw error; }

  // Sinónimos: el índice único es sobre lower(synonym) (expresión), así que PostgREST no puede
  // hacer onConflict por columnas → se deduplica en cliente contra lo ya guardado.
  // OJO: hay que PAGINAR la lectura. Supabase corta la respuesta a 1.000 filas, y con ~15
  // sinónimos por título un lote de 300 títulos devolvía la mitad → el set quedaba incompleto y
  // el insert violaba el índice único (fue exactamente el fallo del primer --enrich).
  const seen = new Set();
  for (const part of chunk(ids, 200)) {
    const P = 1000;
    for (let from = 0; ; from += P) {
      const { data, error } = await db.from("job_title_synonyms")
        .select("job_title_id, locale, synonym").in("job_title_id", part).range(from, from + P - 1);
      if (error) throw error;
      for (const r of data ?? []) seen.add(`${r.job_title_id}|${r.locale}|${nkey(r.synonym)}`);
      if (!data || data.length < P) break;
    }
  }
  const syn = [];
  for (const t of titles) {
    const id = idFor(t); if (!id) continue;
    for (const s of t.synonyms) {
      const key = `${id}|${s.locale}|${nkey(s.synonym)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      syn.push({ job_title_id: id, locale: s.locale, synonym: s.synonym });
    }
  }
  // Si otro seeder escribió entremedias (no conviene correr dos a la vez, pero pasa), el lote
  // choca con el índice único: se reintenta fila a fila y se ignoran solo los duplicados, en vez
  // de tirar todo el proceso.
  for (const part of chunk(syn, 500)) {
    const { error } = await db.from("job_title_synonyms").insert(part);
    if (!error) continue;
    if (!/duplicate key/i.test(error.message)) throw error;
    for (const row of part) {
      const { error: e1 } = await db.from("job_title_synonyms").insert(row);
      if (e1 && !/duplicate key/i.test(e1.message)) throw e1;
    }
  }

  // Skills: resolver por esco_uri o nombre, insertar las nuevas, enlazar JT↔skill.
  const allSkills = new Map();
  for (const t of titles) for (const s of t.skills) if (!allSkills.has(s.uri)) allSkills.set(s.uri, s);
  // PAGINADO obligatorio: Supabase corta a 1.000 filas y el catálogo pasa de 1.800. Sin esto el
  // mapa de skills existentes llegaba a medias, las ya presentes se intentaban reinsertar (error
  // de duplicado, silenciado) y **el enlace cargo↔skill se descartaba sin avisar**: `cook` acabó
  // con 2 competencias cuando ESCO le da 15 esenciales + 35 opcionales.
  const byUriS = new Map(), byNameS = new Map();
  {
    const P = 1000;
    for (let from = 0; ; from += P) {
      const { data, error } = await db.from("skills").select("id, name, esco_uri").range(from, from + P - 1);
      if (error) throw error;
      for (const r of data ?? []) { if (r.esco_uri) byUriS.set(r.esco_uri, r.id); byNameS.set(nkey(r.name), r.id); }
      if (!data || data.length < P) break;
    }
  }
  const toInsert = [];
  for (const s of allSkills.values()) if (!byUriS.has(s.uri) && !byNameS.has(nkey(s.name))) toInsert.push({ name: s.name, esco_uri: s.uri, category: "domain" });
  for (const part of chunk(toInsert, 500)) {
    const { data, error } = await db.from("skills").insert(part).select("id, name, esco_uri");
    if (error && !/duplicate/i.test(error.message)) throw error;
    for (const r of data ?? []) { if (r.esco_uri) byUriS.set(r.esco_uri, r.id); byNameS.set(nkey(r.name), r.id); }
  }
  const skillId = (s) => byUriS.get(s.uri) ?? byNameS.get(nkey(s.name));
  // Red de seguridad: si alguna skill sigue sin resolverse (choque de duplicado al insertar),
  // se busca por esco_uri antes de rendirse. Un enlace perdido aquí es una competencia que
  // desaparece del módulo de Desempeño, así que no puede fallar en silencio.
  const unresolved = [...allSkills.values()].filter((s) => !skillId(s));
  for (const part of chunk(unresolved.map((s) => s.uri), 100)) {
    const { data } = await db.from("skills").select("id, name, esco_uri").in("esco_uri", part);
    for (const r of data ?? []) { if (r.esco_uri) byUriS.set(r.esco_uri, r.id); byNameS.set(nkey(r.name), r.id); }
  }
  const links = [];
  let dropped = 0;
  for (const t of titles) {
    const jid = idFor(t); if (!jid) continue;
    for (const s of t.skills) {
      const sid = skillId(s);
      if (sid) links.push({ job_title_id: jid, skill_id: sid, weight: s.weight, is_core: s.isCore });
      else dropped++;
    }
  }
  if (dropped) console.warn(`  ⚠ ${dropped} enlaces cargo↔skill descartados por no resolver la skill`);
  for (const part of chunk(links, 500)) { const { error } = await db.from("job_title_skills").upsert(part, { onConflict: "job_title_id,skill_id" }); if (error) throw error; }
  console.log(`traducciones: ${tr.length} · sinónimos nuevos: ${syn.length} · skills nuevas: ${toInsert.length} · enlaces JT↔skill: ${links.length}`);
}

/** Completa lo que el builder truncó (sinónimos y skills) en los títulos que YA existen. */
async function enrich() {
  const { data: rows, error } = await db.from("job_titles").select("id, canonical_name, esco_uri").not("esco_uri", "is", null);
  if (error) throw error;
  console.log(`Títulos con esco_uri a enriquecer: ${rows.length}`);
  const titles = [];
  const idByUri = new Map();
  for (const [i, r] of rows.entries()) {
    const d = await occupationDetail(r.esco_uri).catch(() => null);
    if (!d) continue;
    idByUri.set(d.escoUri, r.id);
    titles.push(d);
    if ((i + 1) % 25 === 0) console.log(`  … ${i + 1}/${rows.length}`);
  }
  console.log(`Detalles obtenidos: ${titles.length}`);
  if (DRY) {
    const sample = titles.slice(0, 3).map((t) => ({ t: t.canonicalName, syn: t.synonyms.length, skills: t.skills.length }));
    console.log(sample); return;
  }
  await persistLabelsAndSkills(titles, (t) => idByUri.get(t.escoUri));
  console.log("Enriquecido.");
}

/** Importa ocupaciones nuevas de los sectores indicados. */
async function importSectors(names) {
  const perUri = new Map(); // uri → meta del sector (el primero que lo encuentra)
  const dropped = []; // descartes del filtro de relevancia, para poder auditarlos en --dry
  for (const name of names) {
    const s = SECTORS[name];
    if (!s) { console.error(`Sector desconocido: ${name}. Disponibles: ${Object.keys(SECTORS).join(", ")}`); process.exit(1); }
    for (const term of s.terms) {
      const json = await getJson(api("/search", { type: "occupation", text: term, language: "en", selectedVersion: VERSION, limit: 8, offset: 0 }));
      for (const it of json._embedded?.results ?? []) {
        if (!it.uri || perUri.has(it.uri)) continue;
        const label = it.preferredLabel?.en ?? it.title ?? "";
        if (!isRelevant(term, label)) { dropped.push(`${label} ← "${term}"`); continue; }
        perUri.set(it.uri, s);
      }
    }
    console.log(`· ${name}: acumuladas ${perUri.size} ocupaciones únicas`);
  }

  const titles = [];
  const metaByUri = new Map();
  for (const [uri, meta] of perUri) {
    const d = await occupationDetail(uri).catch(() => null);
    if (!d) continue;
    titles.push(d);
    metaByUri.set(d.escoUri, meta);
  }
  console.log(`Títulos con detalle: ${titles.length}`);
  if (DRY) {
    console.log("Ocupaciones que se importarían (revisar antes de aplicar):");
    for (const t of titles) console.log(`  · ${t.canonicalName}  [${metaByUri.get(t.escoUri).categoryKey}]  syn:${t.synonyms.length} skills:${t.skills.length}`);
    if (dropped.length) {
      console.log(`\nDescartadas por el filtro de relevancia (${dropped.length}):`);
      for (const d of dropped.slice(0, 40)) console.log(`  ✗ ${d}`);
    }
    return;
  }

  const idByName = new Map();
  const rows = titles.map((t) => {
    const m = metaByUri.get(t.escoUri);
    return { canonical_name: t.canonicalName, esco_uri: t.escoUri, category: m.category, sector: m.sector, category_key: m.categoryKey, source: "esco" };
  });
  for (const part of chunk(rows, 200)) {
    const { data, error } = await db.from("job_titles").upsert(part, { onConflict: "canonical_name" }).select("id, canonical_name");
    if (error) throw error;
    for (const r of data) idByName.set(nkey(r.canonical_name), r.id);
  }
  console.log(`job_titles insertados/actualizados: ${idByName.size}`);
  await persistLabelsAndSkills(titles, (t) => idByName.get(nkey(t.canonicalName)));
  console.log("Importación completa.");
}

async function main() {
  if (ENRICH) return enrich();
  const areaArg = argOf("area");
  const arg = argOf("sector");
  if (!arg && !areaArg) {
    console.error(`Uso: --area=<category_key,…>   ·   --sector=<${Object.keys(SECTORS).join("|")}|all>   ·   --enrich    [--dry]`);
    process.exit(1);
  }
  // --area recibe claves de job_categories (la forma correcta de pedirlo) y las traduce a los
  // presets que cubren esa área.
  const names = areaArg
    ? areaArg.split(",").map((a) => a.trim()).filter(Boolean).flatMap((a) => {
        const found = sectorsForArea(a);
        if (!found.length) { console.error(`Área sin preset de términos: ${a}. Añádela al mapa SECTORS.`); process.exit(1); }
        return found;
      })
    : arg === "all" ? Object.keys(SECTORS) : arg.split(",").map((s) => s.trim()).filter(Boolean);
  console.log(`Sectores: ${names.join(", ")}`);
  return importSectors(names);
}
main().catch((e) => { console.error(e); process.exit(1); });
