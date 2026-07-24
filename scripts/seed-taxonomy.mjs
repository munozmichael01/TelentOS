// Seed the reviewed taxonomy JSON into Supabase.
//
// Contract:
// - Pista A creates/reviews the schema before running this script.
// - This script uses service_role and is idempotent by lookup/upsert semantics.
// - It does not run migrations and does not touch production unless explicitly run there.
//
//   node scripts/seed-taxonomy.mjs

import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(ROOT, "package.json"));
const { createClient } = require("@supabase/supabase-js");

const env = Object.fromEntries(
  readFileSync(join(ROOT, ".env.local"), "utf8")
    .split("\n")
    .filter((line) => line.includes("=") && !line.startsWith("#"))
    .map((line) => [line.slice(0, line.indexOf("=")).trim(), line.slice(line.indexOf("=") + 1).trim()]),
);

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const taxonomy = JSON.parse(readFileSync(join(ROOT, "data", "taxonomy", "taxonomy.json"), "utf8"));

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function chunk(items, size = 500) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function mergeAliases(existing, additions) {
  const seen = new Set();
  const out = [];
  for (const value of [...(existing ?? []), ...(additions ?? [])]) {
    const trimmed = String(value ?? "").trim();
    const key = normalize(trimmed);
    if (!trimmed || seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

async function must(label, promise) {
  const { data, error } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

async function seedSkills() {
  const existing = await must("read skills", db.from("skills").select("id, name, aliases, category"));
  const byName = new Map((existing ?? []).map((row) => [normalize(row.name), row]));
  const newRows = [];
  const updates = [];

  for (const skill of taxonomy.skills) {
    const aliases = mergeAliases([], skill.synonyms.map((row) => row.synonym));
    const hit = byName.get(normalize(skill.name));
    if (hit) {
      updates.push({
        id: hit.id,
        name: hit.name,
        category: hit.category ?? skill.category,
        aliases: mergeAliases(hit.aliases, aliases),
        esco_uri: skill.escoUri ?? null,
      });
    } else {
      newRows.push({ name: skill.name, category: skill.category, aliases, esco_uri: skill.escoUri ?? null });
    }
  }

  for (const rows of chunk(newRows)) {
    if (!rows.length) continue;
    const { error } = await db.from("skills").insert(rows);
    // Idempotente: en re-runs las skills ya existen (unique lower(name)); ignorar el dup.
    if (error && !/duplicate key/i.test(error.message)) throw new Error(`insert skills: ${error.message}`);
  }
  for (const rows of chunk(updates)) {
    if (rows.length) await must("update skills", db.from("skills").upsert(rows));
  }

  const after = await must("read skills after seed", db.from("skills").select("id, name"));
  return new Map((after ?? []).map((row) => [normalize(row.name), row.id]));
}

async function seedJobTitles() {
  const existing = await must("read job_titles", db.from("job_titles").select("id, canonical_name"));
  const byName = new Map((existing ?? []).map((row) => [normalize(row.canonical_name), row.id]));
  const rows = [];
  const updates = [];

  for (const title of taxonomy.jobTitles) {
    const hit = byName.get(normalize(title.canonicalName));
    const row = {
      canonical_name: title.canonicalName,
      category: title.category,
      sector: title.sector,
      esco_uri: title.escoUri,
    };
    if (hit) updates.push({ id: hit, ...row });
    else rows.push(row);
  }

  for (const part of chunk(rows)) {
    if (part.length) await must("insert job_titles", db.from("job_titles").insert(part));
  }
  for (const part of chunk(updates)) {
    if (part.length) await must("update job_titles", db.from("job_titles").upsert(part));
  }

  const after = await must("read job_titles after seed", db.from("job_titles").select("id, canonical_name"));
  return new Map((after ?? []).map((row) => [normalize(row.canonical_name), row.id]));
}

async function replaceByTable(table, rows) {
  for (const part of chunk(rows)) {
    if (part.length) await must(`upsert ${table}`, db.from(table).upsert(part));
  }
}

async function seedTranslationsAndSynonyms(titleIds, skillIds) {
  const jobTitleTranslations = [];
  const jobTitleSynonyms = [];
  const skillTranslations = [];
  const skillSynonyms = [];

  for (const title of taxonomy.jobTitles) {
    const id = titleIds.get(normalize(title.canonicalName));
    if (!id) continue;
    for (const [locale, name] of Object.entries(title.translations)) {
      if (name) jobTitleTranslations.push({ job_title_id: id, locale, name });
    }
    for (const row of title.synonyms) {
      if (row.synonym) jobTitleSynonyms.push({ job_title_id: id, locale: row.locale, synonym: row.synonym });
    }
  }

  for (const skill of taxonomy.skills) {
    const id = skillIds.get(normalize(skill.name));
    if (!id) continue;
    for (const [locale, name] of Object.entries(skill.translations)) {
      if (name) skillTranslations.push({ skill_id: id, locale, name });
    }
    for (const row of skill.synonyms) {
      if (row.synonym) skillSynonyms.push({ skill_id: id, locale: row.locale, synonym: row.synonym });
    }
  }

  await replaceByTable("job_title_translations", jobTitleTranslations);
  await replaceByTable("skill_translations", skillTranslations);

  await insertMissing("job_title_synonyms", ["job_title_id", "locale", "synonym"], jobTitleSynonyms);
  await insertMissing("skill_synonyms", ["skill_id", "locale", "synonym"], skillSynonyms);
}

async function insertMissing(table, keyFields, rows) {
  const existing = await must(`read ${table}`, db.from(table).select(keyFields.join(",")));
  const seen = new Set((existing ?? []).map((row) => keyFields.map((field) => normalize(row[field])).join("|||")));
  const missing = rows.filter((row) => {
    const key = keyFields.map((field) => normalize(row[field])).join("|||");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  for (const part of chunk(missing)) {
    if (part.length) await must(`insert ${table}`, db.from(table).insert(part));
  }
}

async function seedRelations(titleIds, skillIds) {
  const titleSkills = [];
  const titleRelations = [];
  const skillRelations = [];

  for (const title of taxonomy.jobTitles) {
    const titleId = titleIds.get(normalize(title.canonicalName));
    if (!titleId) continue;
    for (const skill of title.skills) {
      const skillId = skillIds.get(normalize(skill.skillName));
      if (!skillId) continue;
      titleSkills.push({
        job_title_id: titleId,
        skill_id: skillId,
        weight: skill.weight,
        is_core: Boolean(skill.isCore),
      });
    }
  }

  for (const rel of taxonomy.jobTitleRelations) {
    const a = titleIds.get(normalize(rel.a));
    const b = titleIds.get(normalize(rel.b));
    if (!a || !b) continue;
    titleRelations.push({ a_id: a < b ? a : b, b_id: a < b ? b : a, weight: rel.weight });
  }

  for (const rel of taxonomy.skillRelations) {
    const a = skillIds.get(normalize(rel.a));
    const b = skillIds.get(normalize(rel.b));
    if (!a || !b) continue;
    skillRelations.push({ a_id: a < b ? a : b, b_id: a < b ? b : a, weight: rel.weight });
  }

  await replaceByTable("job_title_skills", titleSkills);
  await insertMissing("job_title_relations", ["a_id", "b_id"], titleRelations);
  await insertMissing("skill_relations", ["a_id", "b_id"], skillRelations);
}

async function main() {
  console.log("[taxonomy seed] Reading reviewed JSON...");
  const skillIds = await seedSkills();
  const titleIds = await seedJobTitles();
  await seedTranslationsAndSynonyms(titleIds, skillIds);
  await seedRelations(titleIds, skillIds);

  console.log("[taxonomy seed] Done", {
    jobTitles: taxonomy.jobTitles.length,
    skills: taxonomy.skills.length,
    jobTitleRelations: taxonomy.jobTitleRelations.length,
    skillRelations: taxonomy.skillRelations.length,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
