// Validates data/taxonomy/taxonomy.json without DB access.
// This is the delegated task acceptance gate for the taxonomy data package.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TAXONOMY = join(ROOT, "data", "taxonomy", "taxonomy.json");
const LOCALES = ["en", "es", "pt"];

const data = JSON.parse(readFileSync(TAXONOMY, "utf8"));
const failures = [];
const warnings = [];

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

function inRange(value) {
  return typeof value === "number" && value >= 0 && value <= 1;
}

function hasLocales(translations) {
  return LOCALES.every((locale) => typeof translations?.[locale] === "string" && translations[locale].trim().length > 0);
}

const jobTitles = data.jobTitles ?? [];
const skills = data.skills ?? [];
const jobTitleRelations = data.jobTitleRelations ?? [];
const skillRelations = data.skillRelations ?? [];

if (jobTitles.length < 300) fail(`Expected >=300 job_titles, got ${jobTitles.length}`);
if (jobTitleRelations.length < 200) fail(`Expected >=200 job_title_relations, got ${jobTitleRelations.length}`);
if (skillRelations.length === 0) fail("Expected skill_relations to be populated");

const titleNames = new Set();
const skillNames = new Set();
const sectorCounts = new Map();
const skillUseCounts = new Map();

for (const skill of skills) {
  if (!skill.name) fail("Skill without name");
  if (skillNames.has(skill.name)) fail(`Duplicate skill name: ${skill.name}`);
  skillNames.add(skill.name);
  if (!hasLocales(skill.translations)) fail(`Skill missing es/en/pt translations: ${skill.name}`);
  if (!Array.isArray(skill.synonyms) || skill.synonyms.length < 1) fail(`Skill missing >=1 synonym: ${skill.name}`);
}

for (const title of jobTitles) {
  if (!title.canonicalName) fail("Job title without canonicalName");
  if (titleNames.has(title.canonicalName)) fail(`Duplicate job title: ${title.canonicalName}`);
  titleNames.add(title.canonicalName);
  sectorCounts.set(title.sector ?? "unknown", (sectorCounts.get(title.sector ?? "unknown") ?? 0) + 1);

  if (!hasLocales(title.translations)) fail(`Title missing es/en/pt translations: ${title.canonicalName}`);
  if (!Array.isArray(title.synonyms) || title.synonyms.length < 2) fail(`Title missing >=2 synonyms: ${title.canonicalName}`);
  if (!Array.isArray(title.skills) || title.skills.length < 3) fail(`Title missing >=3 skills: ${title.canonicalName}`);
  if (!title.skills?.some((skill) => skill.isCore)) fail(`Title missing >=1 core skill: ${title.canonicalName}`);

  for (const row of title.skills ?? []) {
    if (!skillNames.has(row.skillName)) fail(`Title references missing skill: ${title.canonicalName} -> ${row.skillName}`);
    if (!inRange(row.weight)) fail(`Title skill weight out of [0,1]: ${title.canonicalName} -> ${row.skillName} (${row.weight})`);
    skillUseCounts.set(row.skillName, (skillUseCounts.get(row.skillName) ?? 0) + 1);
  }
}

for (const relation of jobTitleRelations) {
  if (!titleNames.has(relation.a)) fail(`Job title relation missing a: ${relation.a}`);
  if (!titleNames.has(relation.b)) fail(`Job title relation missing b: ${relation.b}`);
  if (relation.a === relation.b) fail(`Self job title relation: ${relation.a}`);
  if (!inRange(relation.weight)) fail(`Job title relation weight out of [0,1]: ${relation.a} -> ${relation.b}`);
}

for (const relation of skillRelations) {
  if (!skillNames.has(relation.a)) fail(`Skill relation missing a: ${relation.a}`);
  if (!skillNames.has(relation.b)) fail(`Skill relation missing b: ${relation.b}`);
  if (relation.a === relation.b) fail(`Self skill relation: ${relation.a}`);
  if (!inRange(relation.weight)) fail(`Skill relation weight out of [0,1]: ${relation.a} -> ${relation.b}`);
}

for (const [sector, count] of sectorCounts.entries()) {
  if (count < 10) warn(`Low sector coverage for ${sector}: ${count}`);
}

const unusedSkills = [...skillNames].filter((name) => !skillUseCounts.has(name));
if (unusedSkills.length > 0) fail(`Unused skills present: ${unusedSkills.slice(0, 10).join(", ")}${unusedSkills.length > 10 ? "..." : ""}`);

console.log("\n[taxonomy] Coverage by sector");
console.table([...sectorCounts.entries()].map(([sector, count]) => ({ sector, count })));

console.log("[taxonomy] Counts", {
  jobTitles: jobTitles.length,
  skills: skills.length,
  jobTitleRelations: jobTitleRelations.length,
  skillRelations: skillRelations.length,
});

if (warnings.length > 0) {
  console.warn("\n[taxonomy] Warnings");
  for (const message of warnings) console.warn(`- ${message}`);
}

if (failures.length > 0) {
  console.error("\n[taxonomy] FAIL");
  for (const message of failures.slice(0, 80)) console.error(`- ${message}`);
  if (failures.length > 80) console.error(`... ${failures.length - 80} more`);
  process.exit(1);
}

console.log("\n[taxonomy] PASS");
