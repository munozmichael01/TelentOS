// Poblado de job titles de HOSTELERÍA desde la API REAL de ESCO (el taxonomy.json curado
// excluyó el sector por "low-ICP-fit", pero el board es 99% hostelería). Trae ocupaciones
// con escoUri + traducciones es/en/pt + sinónimos (alternativeLabel) + skills
// (essential/optional con peso), y las inserta en la taxonomía oficial. Reemplaza el seed
// inventado por LLM. Reutiliza el patrón de build-taxonomy-from-esco.mjs.
//
//   node scripts/seed-hospitality-from-esco.mjs [--dry]
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

const ESCO = "https://ec.europa.eu/esco/api", VERSION = "v1.2.0", LOCALES = ["en", "es", "pt"];
const TERMS = ["cook", "chef", "waiter", "waitress", "bartender", "barista", "hotel receptionist", "kitchen assistant",
  "kitchen porter", "housekeeper", "chambermaid", "restaurant manager", "hotel manager", "sommelier", "head waiter",
  "food and beverage manager", "room attendant", "concierge", "pastry chef", "commis chef", "catering manager", "host"];
const clean = (s) => String(s ?? "").replace(/\s*\/\s*/g, " / ").replace(/\s+/g, " ").trim();
const nkey = (s) => clean(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
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

async function main() {
  console.log("Buscando ocupaciones de hostelería en ESCO…");
  const byUri = new Map();
  for (const term of TERMS) {
    const json = await getJson(api("/search", { type: "occupation", text: term, language: "en", selectedVersion: VERSION, limit: 8, offset: 0 }));
    for (const it of json._embedded?.results ?? []) if (it.uri && !byUri.has(it.uri)) byUri.set(it.uri, it.uri);
  }
  console.log(`Ocupaciones únicas: ${byUri.size}`);

  const titles = [];
  for (const uri of byUri.keys()) {
    const d = await getJson(api("/resource/occupation", { uri, language: "en", selectedVersion: VERSION }));
    const pref = d.preferredLabel ?? {}, alt = d.alternativeLabel ?? {};
    const canonicalName = clean(pref.en ?? d.title);
    if (!canonicalName) continue;
    const translations = {}; for (const loc of LOCALES) translations[loc] = clean(pref[loc] ?? pref.en ?? d.title);
    const synonyms = [];
    for (const loc of LOCALES) for (const s of (alt[loc] ?? [])) { const v = clean(s); if (v && nkey(v) !== nkey(translations[loc])) synonyms.push({ locale: loc, synonym: v }); }
    const links = (k) => Array.isArray(d._links?.[k]) ? d._links[k] : [];
    const skills = [
      ...links("hasEssentialSkill").slice(0, 6).map((s, i) => ({ uri: s.uri, name: clean(s.title), weight: i < 8 ? 0.95 : 0.85, isCore: true })),
      ...links("hasOptionalSkill").slice(0, 6).map((s, i) => ({ uri: s.uri, name: clean(s.title), weight: i < 8 ? 0.65 : 0.45, isCore: false })),
    ].filter((s) => s.name);
    titles.push({ canonicalName, escoUri: uri, translations, synonyms, skills });
  }
  console.log(`Títulos con detalle: ${titles.length}`);
  if (DRY) { console.log(JSON.stringify(titles.slice(0, 3), null, 1)); return; }

  // 1) job_titles (upsert por canonical_name)
  const idByName = new Map();
  for (const part of chunk(titles.map((t) => ({ canonical_name: t.canonicalName, esco_uri: t.escoUri, category: "Retail & Hospitality", sector: "hospitality_food", category_key: "hospitality_food", source: "esco" })), 200)) {
    const { data, error } = await db.from("job_titles").upsert(part, { onConflict: "canonical_name" }).select("id, canonical_name");
    if (error) throw error; for (const r of data) idByName.set(nkey(r.canonical_name), r.id);
  }
  console.log(`job_titles hostelería: ${idByName.size}`);

  // 2) traducciones + sinónimos
  const tr = [], syn = [];
  for (const t of titles) { const id = idByName.get(nkey(t.canonicalName)); if (!id) continue;
    for (const loc of LOCALES) if (t.translations[loc]) tr.push({ job_title_id: id, locale: loc, name: t.translations[loc] });
    for (const s of t.synonyms) syn.push({ job_title_id: id, locale: s.locale, synonym: s.synonym }); }
  for (const part of chunk(tr, 500)) await db.from("job_title_translations").upsert(part, { onConflict: "job_title_id,locale" });
  for (const part of chunk(syn, 500)) await db.from("job_title_synonyms").insert(part);
  console.log(`traducciones: ${tr.length} · sinónimos: ${syn.length}`);

  // 3) skills (resolver/insertar por esco_uri o nombre) + enlace JT↔skill
  const allSkills = new Map();
  for (const t of titles) for (const s of t.skills) if (!allSkills.has(s.uri)) allSkills.set(s.uri, s);
  const { data: existing } = await db.from("skills").select("id, name, esco_uri");
  const byUriS = new Map(), byNameS = new Map();
  for (const r of existing ?? []) { if (r.esco_uri) byUriS.set(r.esco_uri, r.id); byNameS.set(nkey(r.name), r.id); }
  const toInsert = [];
  for (const s of allSkills.values()) if (!byUriS.has(s.uri) && !byNameS.has(nkey(s.name))) toInsert.push({ name: s.name, esco_uri: s.uri, category: "domain" });
  for (const part of chunk(toInsert, 500)) { const { data, error } = await db.from("skills").insert(part).select("id, name, esco_uri"); if (error && !/duplicate/i.test(error.message)) throw error; for (const r of data ?? []) { if (r.esco_uri) byUriS.set(r.esco_uri, r.id); byNameS.set(nkey(r.name), r.id); } }
  const skillId = (s) => byUriS.get(s.uri) ?? byNameS.get(nkey(s.name));
  const links = [];
  for (const t of titles) { const jid = idByName.get(nkey(t.canonicalName)); if (!jid) continue;
    for (const s of t.skills) { const sid = skillId(s); if (sid) links.push({ job_title_id: jid, skill_id: sid, weight: s.weight, is_core: s.isCore }); } }
  for (const part of chunk(links, 500)) await db.from("job_title_skills").upsert(part, { onConflict: "job_title_id,skill_id" });
  console.log(`skills nuevas: ${toInsert.length} · enlaces JT↔skill: ${links.length}`);
  console.log("Hostelería ESCO completa.");
}
main().catch((e) => { console.error(e); process.exit(1); });
