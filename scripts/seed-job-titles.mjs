// Seed de la taxonomía de job titles: data/taxonomy/taxonomy.json (export ESCO reducido)
// → tablas job_titles / job_title_aliases / job_title_relations. Idempotente: borra el
// seed source='esco' y reinserta. El poblado por sector (hostelería, etc.) lo hace el
// agente aparte (source='agent'), que NO se toca aquí.
//
//   node scripts/seed-job-titles.mjs   (npm run seed:jobtitles)
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(ROOT, "package.json"));
const { createClient } = require("@supabase/supabase-js");
const tax = require(join(ROOT, "data/taxonomy/taxonomy.json"));

const env = Object.fromEntries(
  readFileSync(join(ROOT, ".env.local"), "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const norm = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

async function main() {
  const titles = tax.jobTitles ?? [];
  console.log(`Títulos ESCO en el JSON: ${titles.length}`);

  // Idempotencia: borra el seed esco (cascade limpia aliases; las relaciones se recrean).
  await db.from("job_titles").delete().eq("source", "esco");

  // 1) job_titles
  const rows = titles.map((jt) => ({
    canonical_name: jt.canonicalName,
    sector: jt.sector ?? null,
    source: "esco",
  }));
  const idByName = new Map();
  for (const part of chunk(rows, 500)) {
    const { data, error } = await db.from("job_titles").insert(part).select("id, canonical_name");
    if (error) throw error;
    for (const r of data) idByName.set(r.canonical_name, r.id);
  }
  console.log(`job_titles insertados: ${idByName.size}`);

  // 2) aliases (canónico + traducciones + sinónimos), deduplicados por (title, norm)
  const aliases = [];
  for (const jt of titles) {
    const id = idByName.get(jt.canonicalName);
    if (!id) continue;
    const seen = new Set();
    const push = (label, locale, kind) => {
      const n = norm(label);
      if (n.length < 2 || seen.has(n)) return;
      seen.add(n);
      aliases.push({ title_id: id, locale: locale ?? null, label, kind, norm: n });
    };
    push(jt.canonicalName, "en", "canonical");
    for (const [loc, label] of Object.entries(jt.translations ?? {})) push(label, loc, "translation");
    for (const s of jt.synonyms ?? []) push(s.synonym, s.locale ?? null, "synonym");
  }
  let aliasCount = 0;
  for (const part of chunk(aliases, 1000)) {
    const { error } = await db.from("job_title_aliases").insert(part);
    if (error) throw error;
    aliasCount += part.length;
  }
  console.log(`job_title_aliases insertados: ${aliasCount}`);

  // 3) relaciones (grafo) — solo donde ambos extremos existen
  const rels = [];
  for (const r of tax.jobTitleRelations ?? []) {
    const a = idByName.get(r.a), b = idByName.get(r.b);
    if (a && b && a !== b) rels.push({ a_id: a, b_id: b, weight: r.weight ?? 0.5 });
  }
  let relCount = 0;
  for (const part of chunk(rels, 1000)) {
    const { error } = await db.from("job_title_relations").upsert(part, { onConflict: "a_id,b_id" });
    if (error) throw error;
    relCount += part.length;
  }
  console.log(`job_title_relations insertadas: ${relCount}`);
  console.log("Seed ESCO completo.");
}
main().catch((e) => { console.error(e); process.exit(1); });
