// Applies the TalentOS taxonomy quality pass requested after the first ESCO seed.
//
// Scope:
// - Remove fabricated autocomplete synonyms created by the first generator pass.
// - Re-check Spanish skill labels against ESCO. If ESCO does not provide a
//   Spanish label distinct from English, keep the gap explicit with es: null.
// - Produce review artifacts without changing title sector assignment.

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TAXONOMY = join(ROOT, "data", "taxonomy", "taxonomy.json");
const SECTOR_REVIEW = join(ROOT, "data", "taxonomy", "sector-review.md");
const LIGHTCAST_CROSSWALK = join(ROOT, "data", "taxonomy", "lightcast-crosswalk.json");
const ESCO = "https://ec.europa.eu/esco/api";
const VERSION = "v1.2.0";

const FABRICATED_SUFFIX_RE = /\b(role|effect|perfil|profile|función|funcion|papel)\s*$/i;

function cleanLabel(label) {
  return String(label ?? "")
    .replace(/\s*\/\s*/g, " / ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(value) {
  return cleanLabel(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

async function getJson(url) {
  const res = await fetch(url, { headers: { "user-agent": "TalentOS taxonomy quality pass (+ESCO)" } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
  return res.json();
}

async function fetchSkillDetail(uri, language) {
  const url = new URL(`${ESCO}/resource/skill`);
  url.searchParams.set("uri", uri);
  url.searchParams.set("language", language);
  url.searchParams.set("selectedVersion", VERSION);
  return getJson(url);
}

function bestSpanishLabel(detail, englishLabel) {
  const en = normalize(englishLabel);
  const preferred = cleanLabel(detail?.preferredLabel?.es);
  if (preferred && normalize(preferred) !== en) return preferred;

  for (const label of detail?.alternativeLabel?.es ?? []) {
    const value = cleanLabel(label);
    if (value && normalize(value) !== en) return value;
  }

  return null;
}

function removeFabricatedSynonyms(rows) {
  let removed = 0;
  for (const row of rows) {
    const before = row.synonyms?.length ?? 0;
    row.synonyms = (row.synonyms ?? []).filter((item) => !FABRICATED_SUFFIX_RE.test(item.synonym));
    removed += before - row.synonyms.length;
  }
  return removed;
}

function needsSpanishSkillTranslation(skill) {
  const es = skill.translations?.es;
  const en = skill.translations?.en;
  return typeof es !== "string" || es.trim().length === 0 || normalize(es) === normalize(en);
}

function reviewScore(title) {
  const text = [
    title.canonicalName,
    title.translations?.es,
    title.translations?.pt,
    ...(title.synonyms ?? []).map((row) => row.synonym),
  ].join(" ");

  let score = 0;
  if (["tech_saas", "retail_hospitality", "industrial_energy"].includes(title.sector)) score += 4;
  if (/\b(software|developer|programmer|data|database|security|cloud|network|retail|store|sales|cashier|warehouse|logistics|maintenance|technician|industrial|manufacturing|energy|electrical|mechanical|production)\b/i.test(text)) score += 3;
  if (/\b(academic|university|school|student|museum|library|art|artist|music|dance|theatre|religious|animal|sport|airport|aircraft|marine|forestry|archaeology|journalist|political|public administration)\b/i.test(text)) score -= 5;
  if (["people_hr", "admin_office", "finance_accounting", "marketing_growth", "sales_customer"].includes(title.sector)) score -= 1;
  return score;
}

function reviewReason(title) {
  const text = `${title.canonicalName} ${title.translations?.es ?? ""}`.toLowerCase();
  if (/academic|university|school|student/.test(text)) return "Education/academic role; likely lower ICP fit unless Pista A wants education customers.";
  if (/museum|library|art|music|dance|theatre/.test(text)) return "Cultural/arts role; narrower demand for VE/LatAm tech/retail/industrial ICP.";
  if (/airport|aircraft|marine/.test(text)) return "Highly regulated transport niche; keep only if industrial scope includes it.";
  if (/religious|political|public administration/.test(text)) return "Public/institutional niche outside current ICP.";
  if (/animal|sport|forestry|archaeology/.test(text)) return "Specialized sector outside current ICP.";
  return "Lower keyword alignment with VE/LatAm tech, retail, or industrial hiring.";
}

function writeSectorReview(jobTitles) {
  const rows = [...jobTitles]
    .map((title) => ({ title, score: reviewScore(title) }))
    .sort((a, b) => a.score - b.score || a.title.canonicalName.localeCompare(b.title.canonicalName))
    .slice(0, 20);

  const lines = [
    "# Sector review candidates",
    "",
    "These are the lowest-relevance titles for the current TalentOS ICP (VE/LatAm tech, retail, industrial). No title was dropped or reassigned in this pass; this file is only a review queue for Pista A.",
    "",
    "| # | Title | Sector | ES | Reason | ESCO URI |",
    "|---:|---|---|---|---|---|",
  ];

  rows.forEach(({ title }, index) => {
    lines.push(`| ${index + 1} | ${title.canonicalName} | ${title.sector} | ${title.translations?.es ?? ""} | ${reviewReason(title)} | ${title.escoUri} |`);
  });

  lines.push("");
  writeFileSync(SECTOR_REVIEW, `${lines.join("\n")}\n`);
  return rows.length;
}

function writeLightcastCrosswalk(skills) {
  const generatedAt = new Date().toISOString();
  const items = skills.map((skill) => ({
    skillName: skill.name,
    escoUri: skill.escoUri,
    lightcastId: null,
    match: "none",
    reason: "official_lightcast_esco_crosswalk_unavailable_without_lightcast_api_access",
  }));

  const payload = {
    generatedAt,
    source: "TalentOS taxonomy skills with ESCO URIs",
    externalReference: "Lightcast Open Skills / Classification API",
    coverage: {
      totalSkills: skills.length,
      mapped: 0,
      exact: 0,
      nearest: 0,
      none: skills.length,
      coveragePercent: 0,
    },
    notes: [
      "Lightcast API access requires credentials/license approval.",
      "No public official ESCO-to-Lightcast crosswalk file was found during this pass.",
      "No fuzzy or inferred Lightcast IDs were generated because the task requires official crosswalk mapping.",
    ],
    items,
  };

  writeFileSync(LIGHTCAST_CROSSWALK, `${JSON.stringify(payload, null, 2)}\n`);
}

const data = JSON.parse(readFileSync(TAXONOMY, "utf8"));

const removedTitleSynonyms = removeFabricatedSynonyms(data.jobTitles ?? []);
const removedSkillSynonyms = removeFabricatedSynonyms(data.skills ?? []);

const skillsNeedingEs = (data.skills ?? []).filter(needsSpanishSkillTranslation);
let filledSpanish = 0;
let nullSpanish = 0;

for (const [index, skill] of skillsNeedingEs.entries()) {
  const detail = await fetchSkillDetail(skill.escoUri, "es");
  const spanish = bestSpanishLabel(detail, skill.translations?.en ?? skill.name);
  skill.translations = { ...(skill.translations ?? {}), es: spanish };
  if (spanish) filledSpanish += 1;
  else nullSpanish += 1;
  if ((index + 1) % 10 === 0 || index + 1 === skillsNeedingEs.length) {
    console.log(`[taxonomy] Spanish skill labels checked ${index + 1}/${skillsNeedingEs.length}`);
  }
}

const reviewCount = writeSectorReview(data.jobTitles ?? []);
writeLightcastCrosswalk(data.skills ?? []);
writeFileSync(TAXONOMY, `${JSON.stringify(data, null, 2)}\n`);

console.log("[taxonomy] Quality pass complete", {
  removedTitleSynonyms,
  removedSkillSynonyms,
  skillsNeedingEs: skillsNeedingEs.length,
  filledSpanish,
  nullSpanish,
  sectorReviewTitles: reviewCount,
  lightcastMapped: 0,
});
