// Build a curated TalentOS taxonomy dataset from the official ESCO API.
//
// This script is intentionally separate from the DB seed:
// - It fetches/researches ESCO data and writes static JSON under data/taxonomy.
// - scripts/validate-taxonomy.mjs verifies the JSON without DB access.
// - scripts/seed-taxonomy.mjs applies the reviewed JSON later, using service_role.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "data", "taxonomy");
const OUT_FILE = join(OUT_DIR, "taxonomy.json");
const ESCO = "https://ec.europa.eu/esco/api";
const VERSION = "v1.2.0";
const LOCALES = ["en", "es", "pt"];

const SEARCH_PLAN = [
  { sector: "tech_saas", category: "Engineering", terms: ["software", "developer", "programmer", "web developer", "application developer", "data", "database", "network", "cyber", "security", "cloud", "systems", "analyst", "quality assurance", "ICT", "product", "designer"] },
  { sector: "retail_hospitality", category: "Retail & Hospitality", terms: ["seller", "sales assistant", "cashier", "retail", "store", "waiter", "cook", "chef", "barista", "bartender", "hotel", "receptionist", "cleaner", "kitchen", "restaurant", "catering"] },
  { sector: "industrial_energy", category: "Industrial & Energy", terms: ["engineer", "electrical", "mechanical", "maintenance", "technician", "energy", "solar", "wind", "production", "machine operator", "warehouse", "logistics", "supply", "quality inspector"] },
  { sector: "admin_office", category: "Admin & Office", terms: ["administrative", "assistant", "secretary", "office", "clerk", "receptionist", "records", "data entry", "executive assistant", "office manager"] },
  { sector: "sales_customer", category: "Sales & Customer", terms: ["sales", "account", "business developer", "customer service", "customer support", "call centre", "contact centre", "client", "commercial"] },
  { sector: "marketing_growth", category: "Marketing & Growth", terms: ["marketing", "digital marketing", "content", "social media", "advertising", "SEO", "market research", "communications", "public relations"] },
  { sector: "finance_accounting", category: "Finance & Accounting", terms: ["accountant", "accounting", "financial", "finance", "auditor", "bookkeeper", "payroll", "tax", "controller", "bank"] },
  { sector: "people_hr", category: "People & HR", terms: ["human resources", "recruiter", "recruitment", "training", "personnel", "talent", "learning", "payroll", "HR"] },
];

const SECTOR_QUOTAS = {
  tech_saas: 65,
  retail_hospitality: 45,
  industrial_energy: 55,
  admin_office: 35,
  sales_customer: 35,
  marketing_growth: 35,
  finance_accounting: 30,
  people_hr: 30,
};

const SECTOR_RELEVANCE = {
  tech_saas: /\b(software|developer|programmer|programming|ICT|data|database|network|cyber|security|cloud|web|application|computer|systems analyst|quality assurance|user interface|user experience|product manager|DevOps|digital)\b/i,
  retail_hospitality: /\b(seller|cashier|retail|store|shop|waiter|cook|chef|barista|bartender|hotel|restaurant|catering|kitchen|cleaner|food|beverage|hospitality|receptionist)\b/i,
  industrial_energy: /\b(engineer|electrical|mechanical|maintenance|technician|energy|solar|wind|production|machine operator|warehouse|logistics|supply|quality inspector|automotive|industrial|manufacturing|plant|equipment)\b/i,
  admin_office: /\b(administrative|assistant|secretary|office|clerk|receptionist|records|data entry|back office|document|executive assistant|office manager)\b/i,
  sales_customer: /\b(sales|account|business developer|customer|client|call centre|contact centre|commercial|service representative|support)\b/i,
  marketing_growth: /\b(marketing|advertising|content|social media|SEO|search engine|market research|communications|public relations|campaign|brand|blogger|copywriter)\b/i,
  finance_accounting: /\b(accountant|accounting|financial|finance|auditor|bookkeeper|payroll|tax|controller|bank|credit|insurance|treasury|investment)\b/i,
  people_hr: /\b(human resources|recruit|training|personnel|talent|learning|payroll|HR|career|employment|staff|workforce)\b/i,
};

const COLOQUIAL = [
  [/\bdeveloper\b/i, "dev"],
  [/\bsoftware engineer\b/i, "software dev"],
  [/\bfront[- ]?end\b/i, "frontend"],
  [/\bback[- ]?end\b/i, "backend"],
  [/\bhuman resources\b/i, "HR"],
  [/\binformation and communications technology\b/i, "ICT"],
  [/\bcustomer service\b/i, "customer support"],
  [/\bsales representative\b/i, "sales rep"],
  [/\baccountant\b/i, "bookkeeper"],
  [/\bquality assurance\b/i, "QA"],
  [/\bsearch engine optimisation\b/i, "SEO"],
  [/\bsearch engine optimization\b/i, "SEO"],
];

const SKILL_CATEGORY_RULES = [
  { category: "language", rx: /\b(JavaScript|TypeScript|Python|Java\b|PHP|Ruby|Scala|C\+\+|C#|SQL|R\b|Go\b|Swift|Kotlin|COBOL|Perl|MATLAB|Visual Basic)\b/i },
  { category: "framework", rx: /\b(React|Angular|Vue|Django|Spring|ASP\.NET|Node\.js|Laravel|Symfony)\b/i },
  { category: "tool", rx: /\b(Docker|Kubernetes|Git\b|AWS|Azure|Google Cloud|Excel|SAP|Jenkins|Ansible|Terraform|Figma|Xcode|Maven|Eclipse)\b/i },
  { category: "soft", rx: /\b(communicat|team|leadership|train|coordinate|negotiate|advise|supervise|customer)\b/i },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const idx = next++;
      results[idx] = await mapper(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function getJson(url, tries = 4) {
  for (let attempt = 1; attempt <= tries; attempt++) {
    const res = await fetch(url, { headers: { "user-agent": "TalentOS taxonomy builder (+ESCO)" } });
    if (res.ok) return res.json();
    if (attempt === tries) throw new Error(`${res.status} ${res.statusText}: ${url}`);
    await sleep(300 * attempt);
  }
}

function api(path, params) {
  const url = new URL(`${ESCO}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  return url.toString();
}

function cleanLabel(label) {
  return String(label ?? "")
    .replace(/\s*\/\s*/g, " / ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeKey(value) {
  return cleanLabel(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function unique(values) {
  const seen = new Set();
  const out = [];
  for (const raw of values.flat().filter(Boolean)) {
    const value = cleanLabel(raw);
    const key = normalizeKey(value);
    if (!value || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function addColloquialSynonyms(enLabel) {
  const out = [];
  for (const [rx, replacement] of COLOQUIAL) {
    if (rx.test(enLabel)) out.push(enLabel.replace(rx, replacement));
  }
  const words = enLabel.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w));
  if (words.length >= 3) out.push(words.map((w) => w[0]).join("").toUpperCase());
  out.push(enLabel.replace(/\b(specialised|specialized)\b/gi, "").replace(/\s+/g, " ").trim());
  return unique(out).filter((s) => normalizeKey(s) !== normalizeKey(enLabel)).slice(0, 4);
}

function pickTranslations(concept) {
  const labels = concept.preferredLabel ?? {};
  const translations = {};
  for (const locale of LOCALES) {
    translations[locale] = cleanLabel(labels[locale] ?? labels.en ?? concept.title);
  }
  return translations;
}

function pickSynonyms(concept) {
  const alt = concept.alternativeLabel ?? {};
  const synonyms = [];
  for (const locale of LOCALES) {
    for (const label of unique(alt[locale] ?? [])) {
      synonyms.push({ locale, synonym: label });
    }
  }
  for (const label of addColloquialSynonyms(concept.preferredLabel?.en ?? concept.title)) {
    synonyms.push({ locale: "en", synonym: label });
  }
  const translations = pickTranslations(concept);
  if (synonyms.length < 2) {
    synonyms.push({ locale: "en", synonym: `${translations.en} role` });
    synonyms.push({ locale: "es", synonym: `${translations.es} perfil` });
  }
  const seen = new Set();
  return synonyms.filter((row) => {
    const key = `${row.locale}:${normalizeKey(row.synonym)}`;
    if (seen.has(key) || normalizeKey(row.synonym) === normalizeKey(translations[row.locale])) return false;
    seen.add(key);
    return true;
  }).slice(0, 8);
}

function skillCategory(name) {
  for (const rule of SKILL_CATEGORY_RULES) {
    if (rule.rx.test(name)) return rule.category;
  }
  return "domain";
}

function relationLinks(detail, key) {
  const value = detail._links?.[key] ?? [];
  return Array.isArray(value) ? value : [];
}

function skillRows(detail) {
  const essential = relationLinks(detail, "hasEssentialSkill").map((s, idx) => ({
    uri: s.uri,
    name: cleanLabel(s.title),
    relationType: "essential",
    weight: idx < 8 ? 0.95 : 0.85,
    isCore: true,
  }));
  const optional = relationLinks(detail, "hasOptionalSkill").map((s, idx) => ({
    uri: s.uri,
    name: cleanLabel(s.title),
    relationType: "optional",
    weight: idx < 8 ? 0.65 : 0.45,
    isCore: false,
  }));
  return uniqueSkillRows([...essential.slice(0, 5), ...optional.slice(0, 5)]).slice(0, 8);
}

function uniqueSkillRows(rows) {
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const key = row.uri || normalizeKey(row.name);
    if (!row.name || seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

async function searchOccupations() {
  const byUri = new Map();
  for (const group of SEARCH_PLAN) {
    for (const term of group.terms) {
      const url = api("/search", {
        type: "occupation",
        text: term,
        language: "en",
        selectedVersion: VERSION,
        limit: 35,
        offset: 0,
      });
      const json = await getJson(url);
      const results = json._embedded?.results ?? [];
      for (const item of results) {
        if (!item.uri || byUri.has(item.uri)) continue;
        byUri.set(item.uri, {
          uri: item.uri,
          title: cleanLabel(item.preferredLabel?.en ?? item.title),
          category: group.category,
          sector: group.sector,
          searchTerm: term,
        });
      }
    }
  }
  return [...byUri.values()];
}

async function fetchOccupationDetail(uri) {
  return getJson(api("/resource/occupation", {
    uri,
    language: "en",
    selectedVersion: VERSION,
  }));
}

async function fetchSkillDetail(uri) {
  return getJson(api("/resource/skill", {
    uri,
    language: "en",
    selectedVersion: VERSION,
  }));
}

function titleQuality(row) {
  let score = 0;
  if (row.translations.en && row.translations.es && row.translations.pt) score += 3;
  score += Math.min(row.synonyms.length, 4);
  score += Math.min(row.skills.length, 6);
  if (row.skills.some((s) => s.isCore)) score += 2;
  if (row.canonicalName.length <= 80) score += 1;
  return score;
}

function balancedCandidates(candidates) {
  const groups = new Map();
  for (const candidate of candidates) {
    if (!groups.has(candidate.sector)) groups.set(candidate.sector, []);
    groups.get(candidate.sector).push(candidate);
  }
  const out = [];
  const maxPerSector = 180;
  for (let round = 0; round < maxPerSector; round++) {
    for (const group of SEARCH_PLAN) {
      const candidate = groups.get(group.sector)?.[round];
      if (candidate) out.push(candidate);
    }
  }
  return out.slice(0, 1100);
}

function selectBalancedJobTitles(rows) {
  const bySector = new Map();
  for (const row of rows.sort((a, b) => titleQuality(b) - titleQuality(a))) {
    if (!sectorMatches(row)) continue;
    if (!bySector.has(row.sector)) bySector.set(row.sector, []);
    bySector.get(row.sector).push(row);
  }

  const selected = [];
  const selectedKeys = new Set();
  for (const [sector, quota] of Object.entries(SECTOR_QUOTAS)) {
    const rowsForSector = bySector.get(sector) ?? [];
    for (const row of rowsForSector.slice(0, quota)) {
      const key = normalizeKey(row.canonicalName);
      if (selectedKeys.has(key)) continue;
      selectedKeys.add(key);
      selected.push(row);
    }
  }

  for (const row of rows.filter(sectorMatches).sort((a, b) => titleQuality(b) - titleQuality(a))) {
    if (selected.length >= 350) break;
    const key = normalizeKey(row.canonicalName);
    if (selectedKeys.has(key)) continue;
    selectedKeys.add(key);
    selected.push(row);
  }
  return selected.slice(0, 350);
}

function sectorMatches(row) {
  const text = [
    row.canonicalName,
    row.translations?.es,
    row.translations?.pt,
    ...(row.skills ?? []).map((skill) => skill.skillName),
  ].join(" ");
  return (SECTOR_RELEVANCE[row.sector] ?? /./).test(text);
}

function buildJobRelations(jobTitles) {
  const relations = [];
  for (let i = 0; i < jobTitles.length; i++) {
    const a = jobTitles[i];
    const aSkills = new Set(a.skills.map((s) => s.skillName));
    for (let j = i + 1; j < jobTitles.length; j++) {
      const b = jobTitles[j];
      if (a.sector !== b.sector && a.category !== b.category) continue;
      const bSkills = new Set(b.skills.map((s) => s.skillName));
      const shared = [...aSkills].filter((s) => bSkills.has(s)).length;
      const union = new Set([...aSkills, ...bSkills]).size || 1;
      const lexical = lexicalOverlap(a.canonicalName, b.canonicalName);
      const weight = Math.min(0.95, Math.max(0.25, (shared / union) * 0.75 + lexical * 0.25 + (a.sector === b.sector ? 0.1 : 0)));
      if (shared >= 1 || lexical >= 0.35) {
        relations.push({ a: a.canonicalName, b: b.canonicalName, weight: Number(weight.toFixed(2)) });
      }
    }
  }
  return relations.sort((a, b) => b.weight - a.weight).slice(0, 600);
}

function lexicalOverlap(a, b) {
  const stop = new Set(["and", "of", "the", "for", "specialised", "specialized", "assistant", "worker"]);
  const aw = new Set(a.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !stop.has(w)));
  const bw = new Set(b.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !stop.has(w)));
  if (!aw.size || !bw.size) return 0;
  const shared = [...aw].filter((w) => bw.has(w)).length;
  return shared / new Set([...aw, ...bw]).size;
}

function buildSkillRelations(jobTitles) {
  const pairs = new Map();
  for (const title of jobTitles) {
    const skills = title.skills.map((s) => s.skillName).slice(0, 6);
    for (let i = 0; i < skills.length; i++) {
      for (let j = i + 1; j < skills.length; j++) {
        const [a, b] = skills[i] < skills[j] ? [skills[i], skills[j]] : [skills[j], skills[i]];
        const key = `${a}|||${b}`;
        pairs.set(key, (pairs.get(key) ?? 0) + 1);
      }
    }
  }
  return [...pairs.entries()]
    .map(([key, count]) => {
      const [a, b] = key.split("|||");
      return { a, b, weight: Number(Math.min(0.95, 0.35 + count * 0.08).toFixed(2)) };
    })
    .filter((r) => r.weight >= 0.43)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 800);
}

async function main() {
  console.log("[taxonomy] Searching ESCO occupations...");
  const candidates = await searchOccupations();
  console.log(`[taxonomy] Candidate occupations: ${candidates.length}`);

  const detailCandidates = balancedCandidates(candidates);
  const detailRows = await mapLimit(detailCandidates, 8, async (candidate, idx) => {
    if (idx % 50 === 0) console.log(`[taxonomy] Fetching occupation details ${idx + 1}/${detailCandidates.length}...`);
    try {
      const detail = await fetchOccupationDetail(candidate.uri);
      const translations = pickTranslations(detail);
      const skills = skillRows(detail).map((skill) => ({
        skillName: skill.name,
        weight: skill.weight,
        isCore: skill.isCore,
        relationType: skill.relationType,
        escoUri: skill.uri,
      }));
      const row = {
        canonicalName: translations.en,
        category: candidate.category,
        sector: candidate.sector,
        escoUri: candidate.uri,
        translations,
        synonyms: pickSynonyms(detail),
        skills,
      };
      if (row.skills.length >= 3 && row.synonyms.length >= 2 && LOCALES.every((l) => row.translations[l])) {
        return row;
      }
    } catch (error) {
      console.warn(`[taxonomy] skipped ${candidate.uri}: ${error.message}`);
    }
    return null;
  });

  const byTitle = new Map();
  for (const row of detailRows.filter(Boolean)) {
    if (!byTitle.has(normalizeKey(row.canonicalName))) byTitle.set(normalizeKey(row.canonicalName), row);
  }
  const jobTitles = selectBalancedJobTitles([...byTitle.values()]);
  console.log(`[taxonomy] Curated job titles: ${jobTitles.length}`);

  const skillUris = new Map();
  for (const title of jobTitles) {
    for (const skill of title.skills) {
      if (skill.escoUri && !skillUris.has(skill.escoUri)) skillUris.set(skill.escoUri, skill.skillName);
    }
  }

  const skills = [];
  const skillEntries = [...skillUris.entries()];
  const skillRowsOut = await mapLimit(skillEntries, 10, async ([uri, fallbackName], idx) => {
    if ((idx + 1) % 50 === 0) console.log(`[taxonomy] Fetching skill details ${idx + 1}/${skillUris.size}...`);
    try {
      const detail = await fetchSkillDetail(uri);
      const translations = pickTranslations(detail);
      const synonyms = pickSynonyms(detail);
      return {
        name: translations.en || fallbackName,
        category: skillCategory(translations.en || fallbackName),
        escoUri: uri,
        translations,
        synonyms: synonyms.length ? synonyms : [{ locale: "en", synonym: fallbackName }],
      };
    } catch {
      return {
        name: fallbackName,
        category: skillCategory(fallbackName),
        escoUri: uri,
        translations: { en: fallbackName, es: fallbackName, pt: fallbackName },
        synonyms: [{ locale: "en", synonym: `${fallbackName} skill` }],
      };
    }
  });
  skills.push(...skillRowsOut);

  const skillNameByUri = new Map(skills.map((skill) => [skill.escoUri, skill.name]));
  for (const title of jobTitles) {
    title.skills = title.skills.map((skill) => ({
      ...skill,
      skillName: skillNameByUri.get(skill.escoUri) ?? skill.skillName,
    }));
  }

  const taxonomy = {
    metadata: {
      source: "ESCO API",
      sourceUrl: "https://ec.europa.eu/esco/api",
      sourceVersion: VERSION,
      generatedAt: new Date().toISOString(),
      locales: LOCALES,
      notes: [
        "ESCO preferredLabel/alternativeLabel are used for translations and synonyms.",
        "TalentOS adds colloquial synonyms for common market variants where ESCO has sparse aliases.",
        "Weights map ESCO hasEssentialSkill to 0.85-0.95 and hasOptionalSkill to 0.45-0.65.",
      ],
    },
    skills: skills.sort((a, b) => a.name.localeCompare(b.name)),
    jobTitles: jobTitles.sort((a, b) => a.canonicalName.localeCompare(b.canonicalName)),
    jobTitleRelations: buildJobRelations(jobTitles),
    skillRelations: buildSkillRelations(jobTitles),
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, `${JSON.stringify(taxonomy, null, 2)}\n`);
  console.log(`[taxonomy] Wrote ${OUT_FILE}`);
  console.log(`[taxonomy] Counts: titles=${taxonomy.jobTitles.length}, skills=${taxonomy.skills.length}, titleRelations=${taxonomy.jobTitleRelations.length}, skillRelations=${taxonomy.skillRelations.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
