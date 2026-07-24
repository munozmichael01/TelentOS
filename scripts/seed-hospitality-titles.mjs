// Poblado de job titles de HOSTELERÍA/TURISMO con el LLM (el export ESCO reducido no los
// cubre, y son el 99% del board por el feed de Turijobs). El LLM investiga los títulos base
// por familia con traducciones es/en/pt + sinónimos; se insertan en la taxonomía
// (source='agent', category_key/sector='hospitality_food'). Seeding de datos de referencia
// (como el import de Turijobs), no un agente de acción de usuario → no rompe el invariante.
//
//   node scripts/seed-hospitality-titles.mjs [--dry]   (npm run seed:hospitality)
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(ROOT, "package.json"));
const { createClient } = require("@supabase/supabase-js");
const OpenAI = require("openai").default ?? require("openai");

const env = Object.fromEntries(
  readFileSync(join(ROOT, ".env.local"), "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
const DRY = process.argv.includes("--dry");

const norm = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

const SYSTEM = `Eres un experto en taxonomía ocupacional de HOSTELERÍA y TURISMO (España y Latinoamérica).
Devuelve los job titles REALES y frecuentes del sector, cubriendo estas familias: cocina, sala/restaurante,
recepción/front office, pisos/limpieza, bar/cafetería, animación/entretenimiento, mantenimiento, dirección/gerencia
hotelera, spa/bienestar, eventos/banquetes, y agencia de viajes. Incluye variantes de género donde aplique.
Para cada título da: canonical (en inglés), translations {es, en, pt}, y synonyms (otras formas reales usadas en
ofertas: cross-idioma, coloquiales, y roles muy próximos — p. ej. cocinero↔chef↔jefe de cocina, camarero↔mesero↔waiter).
Responde SOLO JSON: {"titles":[{"canonical":string,"es":string,"en":string,"pt":string,"synonyms":[{"locale":"es|en|pt","label":string}]}]}
Apunta a 35-50 títulos bien elegidos, no relleno.`;

async function main() {
  console.log("Investigando títulos de hostelería con el LLM…");
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "system", content: SYSTEM }, { role: "user", content: "Genera la taxonomía de job titles de hostelería y turismo." }],
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_tokens: 4096,
  });
  const parsed = JSON.parse(completion.choices[0].message.content ?? "{}");
  const titles = Array.isArray(parsed.titles) ? parsed.titles : [];
  console.log(`Títulos generados: ${titles.length}`);
  if (!titles.length) { console.error("El LLM no devolvió títulos."); process.exit(1); }
  if (DRY) { console.log(JSON.stringify(titles.slice(0, 5), null, 1)); console.log("[DRY] sin insertar."); return; }

  // Idempotencia: borra el poblado previo de hostelería por agente.
  await db.from("job_titles").delete().eq("source", "agent").eq("sector", "hospitality_food");

  const rows = titles.map((t) => ({ canonical_name: t.canonical || t.en || t.es, sector: "hospitality_food", category_key: "hospitality_food", source: "agent" }))
    .filter((r) => r.canonical_name);
  const idByName = new Map();
  for (const part of chunk(rows, 200)) {
    const { data, error } = await db.from("job_titles").upsert(part, { onConflict: "canonical_name" }).select("id, canonical_name");
    if (error) throw error;
    for (const r of data) idByName.set(r.canonical_name, r.id);
  }
  console.log(`job_titles (hostelería): ${idByName.size}`);

  const aliases = [];
  for (const t of titles) {
    const id = idByName.get(t.canonical || t.en || t.es);
    if (!id) continue;
    const seen = new Set();
    const push = (label, locale, kind) => { const n = norm(label); if (n.length < 2 || seen.has(n)) return; seen.add(n); aliases.push({ title_id: id, locale: locale ?? null, label, kind, norm: n }); };
    push(t.canonical || t.en, "en", "canonical");
    for (const loc of ["es", "en", "pt"]) if (t[loc]) push(t[loc], loc, "translation");
    for (const s of t.synonyms ?? []) push(s.label, s.locale ?? null, "synonym");
  }
  // Reemplaza los alias de estos títulos (idempotente) y reinserta.
  await db.from("job_title_aliases").delete().in("title_id", [...idByName.values()]);
  let n = 0;
  for (const part of chunk(aliases, 1000)) { const { error } = await db.from("job_title_aliases").insert(part); if (error) throw error; n += part.length; }
  console.log(`job_title_aliases (hostelería): ${n}`);
  console.log("Poblado de hostelería completo.");
}
main().catch((e) => { console.error(e); process.exit(1); });
