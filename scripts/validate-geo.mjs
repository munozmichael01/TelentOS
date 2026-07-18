// Validates board geo datasets and proposed taxonomy categories without DB access.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const GEO = join(ROOT, "data", "geo", "cities.json");
const TAXONOMY = join(ROOT, "data", "taxonomy", "taxonomy.json");
const CATEGORIES = join(ROOT, "data", "taxonomy", "categories.json");
const COUNTRIES = ["VE", "BR", "ES", "US"];
const MIN_POPULATION = 15000;

const geo = JSON.parse(readFileSync(GEO, "utf8"));
const taxonomy = JSON.parse(readFileSync(TAXONOMY, "utf8"));
const categories = JSON.parse(readFileSync(CATEGORIES, "utf8"));
const failures = [];
const warnings = [];

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const countrySet = new Set(COUNTRIES);
const adminByCountry = geo.admin1 ?? {};
const cityRows = geo.cities ?? [];

if (!Array.isArray(cityRows) || cityRows.length === 0) fail("cities.json must include non-empty cities[]");
for (const country of COUNTRIES) {
  const admins = adminByCountry[country];
  if (!Array.isArray(admins) || admins.length === 0) fail(`Missing admin1 list for ${country}`);
}

const geonameIds = new Set();
const cityCounts = new Map(COUNTRIES.map((country) => [country, 0]));
for (const city of cityRows) {
  if (typeof city.name !== "string" || city.name.trim().length === 0) fail("City without name");
  if (typeof city.admin1 !== "string" || city.admin1.trim().length === 0) fail(`City without admin1: ${city.name ?? "unknown"}`);
  if (!countrySet.has(city.country)) fail(`Unexpected country: ${city.country}`);
  if (typeof city.population !== "number" || city.population < MIN_POPULATION) fail(`City below population threshold: ${city.name} (${city.population})`);
  if (!Number.isInteger(city.geonameId)) fail(`Invalid geonameId for city: ${city.name}`);
  if (geonameIds.has(city.geonameId)) fail(`Duplicate city geonameId: ${city.geonameId}`);
  geonameIds.add(city.geonameId);

  const admins = new Set((adminByCountry[city.country] ?? []).map((row) => row.name));
  if (!admins.has(city.admin1)) fail(`City admin1 not listed for ${city.country}: ${city.name} -> ${city.admin1}`);
  cityCounts.set(city.country, (cityCounts.get(city.country) ?? 0) + 1);
}

for (const [country, count] of cityCounts.entries()) {
  if (count === 0) fail(`No cities for ${country}`);
}

const cats = categories.categories ?? [];
if (!Array.isArray(cats)) fail("categories.json must include categories[]");
if (cats.length < 20 || cats.length > 25) fail(`Expected 20-25 categories, got ${cats.length}`);

const titleKeys = new Set((taxonomy.jobTitles ?? []).map((title) => slugify(title.canonicalName)));
const assigned = new Map();
for (const category of cats) {
  if (typeof category.key !== "string" || !/^[a-z0-9_]+$/.test(category.key)) fail(`Invalid category key: ${category.key}`);
  for (const locale of ["es", "en", "pt"]) {
    if (typeof category[locale] !== "string" || category[locale].trim().length === 0) fail(`Category ${category.key} missing ${locale}`);
  }
  if (!Array.isArray(category.titleKeys) || category.titleKeys.length === 0) warn(`Category without titleKeys: ${category.key}`);
  for (const key of category.titleKeys ?? []) {
    if (!titleKeys.has(key)) fail(`Category references unknown title key: ${category.key} -> ${key}`);
    if (assigned.has(key)) fail(`Title assigned to multiple categories: ${key} (${assigned.get(key)}, ${category.key})`);
    assigned.set(key, category.key);
  }
}

const missing = [...titleKeys].filter((key) => !assigned.has(key));
if (missing.length > 0) fail(`Unassigned title keys: ${missing.slice(0, 10).join(", ")}${missing.length > 10 ? "..." : ""}`);

console.log("\n[geo] City counts by country");
console.table([...cityCounts.entries()].map(([country, cities]) => ({
  country,
  cities,
  admin1: (adminByCountry[country] ?? []).length,
})));

console.log("[taxonomy] Category counts");
console.table(cats.map((category) => ({ key: category.key, titles: category.titleKeys.length })));

if (warnings.length > 0) {
  console.warn("\n[validate-geo] Warnings");
  for (const message of warnings) console.warn(`- ${message}`);
}

if (failures.length > 0) {
  console.error("\n[validate-geo] FAIL");
  for (const message of failures.slice(0, 80)) console.error(`- ${message}`);
  if (failures.length > 80) console.error(`... ${failures.length - 80} more`);
  process.exit(1);
}

console.log("\n[validate-geo] PASS");
