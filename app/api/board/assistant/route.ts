import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { runBoardAssistant } from "@/agents/agent-board-assistant";
import { searchJobs, type BoardSearchParams } from "@/lib/job-board/search";
import { getCategories } from "@/lib/board/categories";
import { resolveSkillIds } from "@/lib/skills";
import { computeRecruiterFit, type JobSkillReq } from "@/lib/job-board/fit";
import { expandJobTitle, resolveTitleContext } from "@/lib/job-board/job-titles";
import type { EducationLevel, SeniorityLevel } from "@/lib/types";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const STOP = new Set(["para", "with", "como", "sobre", "trabajo", "empleo", "oferta", "ofertas", "junior", "senior"]);
const tokensOf = (s: string) => norm(s).split(/[^a-z0-9]+/).filter((w) => w.length > 3 && !STOP.has(w));

const CATEGORY_KEYS = new Set(getCategories("es-ve").map((c) => c.key));

// Fallback difuso (texto libre → categorías canónicas por afinidad con el label). Endurecido:
// un token cuenta como match si es IGUAL a un token del label, o si comparten prefijo con la
// parte más corta ≥5 chars ("product"→"producto", "diseño"→"diseñador"), evitando el ruido de
// prefijos de ≤4 chars ("venta"→"ventaja"). La vía primaria ya no pasa por aquí: el LLM devuelve
// la CLAVE canónica directa (categoryKeysFrom la usa tal cual); esto solo cubre texto libre.
function resolveCategoryKeys(text: string): string[] {
  const toks = tokensOf(text);
  if (!toks.length) return [];
  const out: string[] = [];
  for (const c of getCategories("es-ve")) {
    const labelToks = tokensOf(c.label);
    const hit = toks.some((t) => labelToks.some((l) => {
      if (l === t) return true;
      const [short, long] = l.length <= t.length ? [l, t] : [t, l];
      return short.length >= 5 && long.startsWith(short);
    }));
    if (hit) out.push(c.key);
  }
  return out;
}

// Resuelve el campo `category` del agente: si ya es una CLAVE canónica (el LLM está anclado
// a la taxonomía), se usa tal cual; si es texto libre, cae al fallback difuso.
function categoryKeysFrom(cat: string): string[] {
  return CATEGORY_KEYS.has(cat) ? [cat] : resolveCategoryKeys(cat);
}

// Asistente del board — GATED a candidato logueado (decisión de producto). El agente
// ordena el intake y narra; aquí re-ejecutamos la búsqueda determinista con sus filtros
// para devolver los JobCards autoritativos (nunca dependen del LLM).
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return jsonError("Inicia sesión para usar el asistente", 401);

  // Anti-abuso: el asistente hace llamadas LLM (coste). Límite por usuario — 20/min es
  // holgado para un chat humano y corta el spam. Es el patrón de rate-limit del resto de
  // endpoints de IA (search-parse, apply, parse-cv), que a este le faltaba.
  if (!(await rateLimit(`board-assistant:${user.id}`, 20, 60_000))) {
    return jsonError("Vas muy rápido. Espera unos segundos y vuelve a intentarlo.", 429);
  }

  const body = await req.json().catch(() => null);
  const query = typeof body?.query === "string" ? body.query.trim() : "";
  if (!query) return jsonError("Escribe tu consulta");
  if (query.length > 500) return jsonError("Consulta demasiado larga", 422);

  const history = (Array.isArray(body?.history) ? body.history : [])
    .filter((m: unknown): m is { role: string; content: string } =>
      !!m && typeof m === "object" && "role" in m && "content" in m)
    .filter((m: { role: string }) => m.role === "user" || m.role === "assistant")
    .map((m: { role: string; content: string }) => ({ role: m.role as "user" | "assistant", content: String(m.content) }))
    .slice(-10);

  // Narración en el idioma del usuario: el cliente envía su locale; la pregunta de intake
  // ya viene del LLM en el idioma del usuario, pero el resumen de resultados lo componemos
  // aquí (conteo fiable) y hay que localizarlo (antes iba hardcodeado en español).
  const rawLocale = typeof body?.locale === "string" ? body.locale : routing.defaultLocale;
  const locale = (routing.locales as readonly string[]).includes(rawLocale) ? rawLocale : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "Board.assistant" });

  const result = await runBoardAssistant({ query, history });

  // Crear alerta desde el chat: si el usuario lo pide explícitamente (alerta / avísame /
  // notifícame), persistimos una JobAlert con los filtros interpretados. La escritura la
  // hace ESTE handler como acción explícita del usuario (misma ruta que el botón "Crear
  // alerta" del board) — el agente solo interpreta, nunca escribe en la BBDD. RLS
  // `job_alerts_own` scopa por user.id. Aparece en Mi cuenta › Alertas.
  if (/alert|avis|notif/.test(norm(query))) {
    const f = result.output.filters ?? {};
    const criteria: Record<string, unknown> = {};
    if (f.q) criteria.q = f.q;
    if (f.location) criteria.location = f.location;
    if (f.modality) criteria.modality = f.modality;
    if (f.contract) criteria.contract = f.contract;
    if (f.category) criteria.category = f.category;
    if (typeof f.salaryMin === "number") criteria.salaryMin = f.salaryMin;
    // Sin facetas claras: guarda el texto (sin las palabras de la orden) como término.
    if (Object.keys(criteria).length === 0) {
      const cleaned = query
        .replace(/\b(cr[eé]a\w*|crear|una|un|de\s+esta|esta|b[uú]squeda|alerta|av[ií]sa\w*|av[ií]same|notif\w*|para)\b/gi, " ")
        .replace(/\s+/g, " ").trim();
      criteria.q = cleaned || query;
    }
    const { error: alertErr } = await supabase
      .from("job_alerts")
      .insert({ user_id: user.id, criteria, active: true, frequency: "daily" });
    if (alertErr) {
      return NextResponse.json({ answer: t("alertFailed"), filters: f, jobs: [], total: 0 });
    }
    return NextResponse.json({
      answer: t("alertCreatedText"),
      filters: f,
      alert: { criteria, frequency: "daily" },
      jobs: [], total: 0,
    });
  }

  // JobCards autoritativos: búsqueda determinista con los filtros finales del agente
  // (salvo que pida más intake, en cuyo caso aún no hay filtros que ejecutar).
  // Paginación en el chat ("cargar más"): al usuario que solo conversa hay que darle TODO.
  const PAGE_SIZE = 8;
  const page = Math.max(1, Number(body?.page) || 1);
  let jobs: unknown[] = [];
  let total = 0;
  let widened = false;
  let relatedTitles: string[] = [];   // roles relacionados (grafo) para pivotar la búsqueda
  if (!result.output.intake_needed) {
    // La categoría del LLM es free-text; a la búsqueda solo le sirve la canónica.
    const f = result.output.filters;
    const catKeys = f.category ? categoryKeysFrom(f.category) : [];
    // Anclaje: sinónimos para RECALL (qTokens) + contexto de título para RANKING (mismos
    // títulos canónicos que resuelve la query → el RPC pone esas ofertas primero, igual que
    // el board). Las aplicadas del usuario (global) van al final vía el RPC.
    const titleForms = f.q ? await expandJobTitle(f.q) : [];
    const tctx = f.q ? await resolveTitleContext(f.q) : { titleIds: [], relatedIds: [], relatedW: [] };
    const admin0 = createAdminClient();
    const { data: appRows } = await admin0.from("applications")
      .select("job_id, candidates!inner(user_id)").eq("candidates.user_id", user.id);
    const appliedIds = (appRows ?? []).map((a) => a.job_id as string);

    // Roles relacionados (grafo job_title_relations) para pivotar la búsqueda con un toque.
    if (page === 1 && tctx.relatedIds.length) {
      const { data: rel } = await admin0.from("job_titles").select("canonical_name").in("id", tctx.relatedIds.slice(0, 6));
      relatedTitles = (rel ?? []).map((r) => (r as { canonical_name: string }).canonical_name);
    }

    const base: BoardSearchParams = {
      q: titleForms.length ? undefined : f.q,
      qTokens: titleForms.length ? titleForms : undefined,
      location: f.location, modality: f.modality, contract: f.contract,
      salaryMin: f.salaryMin, categoryKeys: catKeys.length ? catKeys : undefined,
      titleIds: tctx.titleIds.length ? tctx.titleIds : undefined,
      relatedIds: tctx.relatedIds.length ? tctx.relatedIds : undefined,
      relatedW: tctx.relatedW.length ? tctx.relatedW : undefined,
      appliedIds: appliedIds.length ? appliedIds : undefined,
      pageSize: PAGE_SIZE, page,
    };
    let res = await searchJobs(supabase, base);
    // 0 resultados con frase exacta → amplía (solo en la 1ª página): tokens del q (OR) +
    // categorías detectadas desde el propio q. "product owner" → token "product" pega con "Producto…".
    if (res.total === 0 && f.q && page === 1) {
      const toks = tokensOf(f.q);
      const catFromQ = resolveCategoryKeys(f.q);
      if (toks.length || catFromQ.length) {
        res = await searchJobs(supabase, {
          ...base, q: undefined,
          qTokens: toks.length ? toks : undefined,
          categoryKeys: catFromQ.length ? catFromQ : base.categoryKeys,
        });
        widened = res.total > 0;
      }
    }
    jobs = res.jobs;
    total = res.total;

    const jobRows = jobs as { id: string }[];
    if (jobRows.length) {
      // Admin: candidates/job_skills tienen RLS por empresa; un candidato no las lee con RLS.
      const admin = createAdminClient();
      const ids = jobRows.map((j) => j.id);
      const appliedSet = new Set(appliedIds);

      // Fit por oferta: el perfil del candidato (su ficha ATS) vs cada oferta. Lo que hace
      // que sea un "asistente" y no un listado. Solo si tiene ficha con datos.
      const { data: cands } = await admin.from("candidates")
        .select("skills, experience_years, education_level, city, country_code, location")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(1);
      const cand = cands?.[0];

      const fitByJob = new Map<string, number>();
      if (cand) {
        const [{ data: reqs }, { data: jSkills }, candSkillIds] = await Promise.all([
          admin.from("jobs").select("id, experience_min_years, education_level, seniority_level, country_code, city, location").in("id", ids),
          admin.from("job_skills").select("job_id, skill_id, requirement").in("job_id", ids),
          resolveSkillIds(admin, Array.isArray(cand.skills) ? cand.skills : []),
        ]);
        const reqById = new Map((reqs ?? []).map((r) => [r.id, r]));
        const skillsByJob = new Map<string, { skillId: string; requirement: JobSkillReq["requirement"] }[]>();
        for (const s of jSkills ?? []) {
          const arr = skillsByJob.get(s.job_id) ?? [];
          arr.push({ skillId: s.skill_id, requirement: (s.requirement ?? "deseable") as JobSkillReq["requirement"] });
          skillsByJob.set(s.job_id, arr);
        }
        for (const j of jobRows) {
          const r = reqById.get(j.id);
          const fit = computeRecruiterFit({
            job: { skills: skillsByJob.get(j.id) ?? [], experienceMinYears: r?.experience_min_years ?? 0, educationLevel: (r?.education_level ?? null) as EducationLevel | null, seniorityLevel: (r?.seniority_level ?? null) as SeniorityLevel | null, country: r?.country_code ?? null, city: r?.city ?? null, location: r?.location ?? null },
            candidate: { skillIds: candSkillIds, experienceYears: cand.experience_years ?? 0, educationLevel: (cand.education_level ?? null) as EducationLevel | null, seniorityLevel: null, country: cand.country_code ?? null, city: cand.city ?? null, location: cand.location ?? null },
          });
          fitByJob.set(j.id, fit.score);
        }
      }

      // Adjunta fit + applied para DISPLAY. NO se reordena: el RPC ya ordenó por relevancia de
      // título (igual que el board) y mandó las aplicadas al final.
      jobs = jobRows.map((j) => ({ ...j, fit: fitByJob.get(j.id), applied: appliedSet.has(j.id) }));
    }
  }

  // Narración FIABLE desde el conteo real: el LLM interpreta (filtros/intake), pero el
  // resumen de resultados lo damos aquí para no prometer "buscando…" ni desalinear el
  // texto con las tarjetas. El answer del LLM se usa solo para la pregunta de intake.
  let answer = result.output.answer;
  if (!result.output.intake_needed) {
    // Si el agente interpretó facetas (ubicación/modalidad/área/…), reconoce el paso de
    // interpretación antes del conteo. Todo localizado al idioma del usuario.
    const interpreted = Object.values(result.output.filters ?? {}).some((v) => v != null && v !== "");
    const lead = widened ? t("widenedLead") : interpreted && total > 0 ? t("interpretedLead") : "";
    answer = total > 0
      ? [lead, t("foundN", { count: total })].filter(Boolean).join(" ")
      : t("none");
  }

  return NextResponse.json({
    answer,
    filters: result.output.filters,
    intake_needed: result.output.intake_needed,
    suggested_refinements: result.output.suggested_refinements,
    related: relatedTitles,                    // roles relacionados (grafo) para pivotar
    jobs, total,
    page, hasMore: page * PAGE_SIZE < total,   // "cargar más" en el chat
    _status: result.status,
  });
}
