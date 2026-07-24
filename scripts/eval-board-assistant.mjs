// Eval del Asistente del Job Board (candidato) contra el endpoint real
// (/api/board/assistant: LLM + tool search_board + fit). Gate de cambios de
// prompt/tools/route del asistente.
//
//   Uso:  node scripts/eval-board-assistant.mjs   (npm run eval:board)
//   Requiere: dev server en :3001, .env.local con service_role y OPENAI_API_KEY.
//
// Sesión: OWNER (munozmichael01) es además candidato con ficha, así que ejercita
// interpretación + fit real. Los checks son RESILIENTES a datos cambiantes: validan
// FORMA y franqueza (hay conteo, las ofertas salen de search y nunca se inventan, no
// promete "buscando…"), no cifras exactas ni ofertas concretas.
import { createRequire } from "node:module";
import { admin, OWNER, sessionCookie, post, report } from "./_eval-common.mjs";

// Claves canónicas de categoría: cuando el asistente interpreta un área, debe devolver la
// CLAVE (anclado a la taxonomía), no texto libre.
const require = createRequire(import.meta.url);
const CANONICAL = new Set(require("../data/taxonomy/categories.json").categories.map((c) => c.key));

// El caso de alerta persiste una JobAlert real (aún sin dedup). Marca de inicio para
// borrar SOLO las alertas que cree esta corrida y no ensuciar la cuenta.
const startedAt = new Date().toISOString();

// El asistente habla en PRESENTE de lo que ya se muestra: prohibido prometer futuro.
const FUTURE = /buscando\b|un momento|d[eé]jame ver|ya te (traigo|busco)|enseguida|espera/i;

/** Casos dorados. Cada uno: query + expectativas sobre la respuesta del endpoint. */
const CASES = [
  {
    id: "señal simple → busca (no intake)",
    query: "diseño remoto",
    expect: (j) => ({
      intakeFalse: j.intake_needed === false,
      interpretó: j.filters && Object.values(j.filters).some((v) => v != null && v !== ""),
      conteo: typeof j.total === "number",
      soloDeSearch: Array.isArray(j.jobs) && j.jobs.length <= j.total,
      sinFuturo: !FUTURE.test(j.answer ?? ""),
      // grounding: si interpreta categoría, es una CLAVE canónica (no texto libre)
      categoríaEsClave: !j.filters?.category || CANONICAL.has(j.filters.category),
    }),
  },
  {
    id: "product owner en Caracas (bug histórico de categoría)",
    query: "product owner en Caracas",
    expect: (j) => ({
      intakeFalse: j.intake_needed === false,
      interpretó: j.filters && Object.values(j.filters).some((v) => v != null && v !== ""),
      // franqueza: o hay conteo con ofertas, o dice honestamente que no encontró (nunca inventa)
      franco: /encontr[ée]|cercano|no encontr[ée]|amplia/i.test(j.answer ?? ""),
      sinFuturo: !FUTURE.test(j.answer ?? ""),
    }),
  },
  {
    id: "sin señal → intake (una pregunta, sin inventar)",
    query: "busco trabajo",
    expect: (j) => ({
      intakeTrue: j.intake_needed === true,
      pregunta: /\?/.test(j.answer ?? ""),
      sinOfertasInventadas: !Array.isArray(j.jobs) || j.jobs.length === 0,
    }),
  },
  {
    id: "saludo → intake, no lista",
    query: "hola",
    expect: (j) => ({
      intakeTrue: j.intake_needed === true,
      sinOfertas: !Array.isArray(j.jobs) || j.jobs.length === 0,
    }),
  },
  {
    id: "hostelería con ciudad (Turijobs) → ofertas desde search",
    query: "cocina en Madrid",
    expect: (j) => ({
      intakeFalse: j.intake_needed === false,
      conteo: typeof j.total === "number",
      soloDeSearch: Array.isArray(j.jobs) && j.jobs.length <= j.total,
      // fit presente cuando hay ofertas y el usuario tiene ficha (resiliente: solo si hay jobs)
      fitSiHayOfertas: !j.jobs?.length || j.jobs.every((o) => o.fit === undefined || typeof o.fit === "number"),
      // marca de aplicadas + orden: ninguna NO-aplicada aparece tras una aplicada
      appliedShape: !j.jobs?.length || j.jobs.every((o) => typeof o.applied === "boolean"),
      aplicadasAlFondo: !j.jobs?.length || j.jobs.every((o, i, arr) => i === 0 || !(arr[i - 1].applied && !o.applied)),
    }),
  },
  {
    id: "petición explícita de alerta → la crea, no lista",
    query: "créame una alerta de ofertas de diseño remoto",
    expect: (j) => ({
      alertaCreada: !!j.alert?.criteria,
      sinLista: !Array.isArray(j.jobs) || j.jobs.length === 0,
      confirma: /alerta/i.test(j.answer ?? ""),
    }),
  },
  {
    id: "anclaje de job titles: 'chef' recupera ofertas de cocinero (sinónimo)",
    query: "chef",
    expect: (j) => ({
      intakeFalse: j.intake_needed === false,
      conteo: typeof j.total === "number" && j.total > 0,
      // la expansión matchea por sinónimo: las ofertas traen cocinero/cocina/jefe de cocina
      // en el título aunque el usuario escribió "chef" (que casi no aparece literal en el board)
      recuperaSinónimo: Array.isArray(j.jobs) && j.jobs.some((o) => /cocin|chef|jefe de cocina/i.test(o.title ?? "")),
    }),
  },
  {
    id: "narración en el idioma del usuario (en-us)",
    query: "cocina en Madrid",
    locale: "en-us",
    expect: (j) => ({
      intakeFalse: j.intake_needed === false,
      // narración localizada: inglés, no español
      enIngles: /found|no jobs|closest|match/i.test(j.answer ?? ""),
      noEspañol: !/encontr[ée]|ofertas que encajan|no encontr[ée] ofertas/i.test(j.answer ?? ""),
    }),
  },
];

const cookie = await sessionCookie(OWNER);

const rows = [];
for (const c of CASES) {
  try {
    const { status, json } = await post("/api/board/assistant", { query: c.query, history: [], locale: c.locale }, cookie);
    const checks = { http: status === 200, ...c.expect(json) };
    const ok = Object.values(checks).every(Boolean);
    rows.push({
      caso: c.id,
      status: json._status ?? "?",
      ok: ok ? "PASS" : "FAIL",
      detalle: ok ? String(json.answer ?? "").slice(0, 60) : JSON.stringify(checks) + " · " + String(json.answer ?? "").slice(0, 70),
    });
  } catch (e) {
    rows.push({ caso: c.id, status: "-", ok: "ERROR", detalle: String(e).slice(0, 90) });
  }
}
// Limpieza: borra las alertas que este eval creó (por user OWNER, creadas tras el inicio).
try {
  const { data: users } = await admin.auth.admin.listUsers();
  const uid = users?.users?.find((u) => u.email === OWNER)?.id;
  if (uid) await admin.from("job_alerts").delete().eq("user_id", uid).gte("created_at", startedAt);
} catch { /* limpieza best-effort */ }

report("board-assistant", rows);
