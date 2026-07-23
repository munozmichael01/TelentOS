import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { runBoardAssistant } from "@/agents/agent-board-assistant";
import { searchJobs, type BoardSearchParams } from "@/lib/job-board/search";
import { getCategories } from "@/lib/board/categories";
import { resolveSkillIds } from "@/lib/skills";
import { computeRecruiterFit, type JobSkillReq } from "@/lib/job-board/fit";
import type { EducationLevel, SeniorityLevel } from "@/lib/types";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const STOP = new Set(["para", "with", "como", "sobre", "trabajo", "empleo", "oferta", "ofertas", "junior", "senior"]);
const tokensOf = (s: string) => norm(s).split(/[^a-z0-9]+/).filter((w) => w.length > 3 && !STOP.has(w));

// Mapea texto libre ("product owner", "diseño") a categorías canónicas por afinidad
// de tokens con el label ("product"→"Producto, UX y diseño digital").
function resolveCategoryKeys(text: string): string[] {
  const toks = tokensOf(text);
  if (!toks.length) return [];
  const out: string[] = [];
  for (const c of getCategories("es-ve")) {
    const labelToks = tokensOf(c.label);
    const hit = toks.some((t) => labelToks.some((l) => l.startsWith(t) || t.startsWith(l)));
    if (hit) out.push(c.key);
  }
  return out;
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
      return NextResponse.json({ answer: "No pude crear la alerta ahora mismo. Inténtalo de nuevo.", filters: f, jobs: [], total: 0 });
    }
    return NextResponse.json({
      answer: "Listo, guardé tu búsqueda como alerta. Te aviso apenas entren ofertas que coincidan.",
      filters: f,
      alert: { criteria, frequency: "daily" },
      jobs: [], total: 0,
    });
  }

  // JobCards autoritativos: búsqueda determinista con los filtros finales del agente
  // (salvo que pida más intake, en cuyo caso aún no hay filtros que ejecutar).
  let jobs: unknown[] = [];
  let total = 0;
  let widened = false;
  if (!result.output.intake_needed) {
    // La categoría del LLM es free-text; a la búsqueda solo le sirve la canónica.
    const f = result.output.filters;
    const catKeys = f.category ? resolveCategoryKeys(f.category) : [];
    const base: BoardSearchParams = {
      q: f.q, location: f.location, modality: f.modality, contract: f.contract,
      salaryMin: f.salaryMin, categoryKeys: catKeys.length ? catKeys : undefined, pageSize: 12,
    };
    let res = await searchJobs(supabase, base);
    // 0 resultados con frase exacta → amplía: tokens del q (OR) + categorías detectadas
    // desde el propio q. "product owner" → token "product" pega con "Producto…".
    if (res.total === 0 && f.q) {
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

    // Fit por oferta: el perfil del candidato (su ficha ATS) vs cada oferta. Lo que hace
    // que sea un "asistente" y no un listado. Solo si tiene ficha con datos.
    const jobRows = jobs as { id: string }[];
    if (jobRows.length) {
      // Admin: candidates/job_skills tienen RLS por empresa; un candidato no las lee con RLS.
      // Scopeado por user.id (que controlamos tras el guard de sesión).
      const admin = createAdminClient();
      const { data: cands } = await admin.from("candidates")
        .select("skills, experience_years, education_level, city, country_code, location")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(1);
      const cand = cands?.[0];
      if (cand) {
        const ids = jobRows.map((j) => j.id);
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
        jobs = jobRows.map((j) => {
          const r = reqById.get(j.id);
          const fit = computeRecruiterFit({
            job: { skills: skillsByJob.get(j.id) ?? [], experienceMinYears: r?.experience_min_years ?? 0, educationLevel: (r?.education_level ?? null) as EducationLevel | null, seniorityLevel: (r?.seniority_level ?? null) as SeniorityLevel | null, country: r?.country_code ?? null, city: r?.city ?? null, location: r?.location ?? null },
            candidate: { skillIds: candSkillIds, experienceYears: cand.experience_years ?? 0, educationLevel: (cand.education_level ?? null) as EducationLevel | null, seniorityLevel: null, country: cand.country_code ?? null, city: cand.city ?? null, location: cand.location ?? null },
          });
          return { ...j, fit: fit.score };
        });
      }
    }
  }

  // Narración FIABLE desde el conteo real: el LLM interpreta (filtros/intake), pero el
  // resumen de resultados lo damos aquí para no prometer "buscando…" ni desalinear el
  // texto con las tarjetas. El answer del LLM se usa solo para la pregunta de intake.
  let answer = result.output.answer;
  if (!result.output.intake_needed) {
    // Si el agente interpretó facetas (ubicación/modalidad/área/…), reconoce el paso de
    // interpretación antes del conteo (mockup: "Esto es lo que entendí de tu búsqueda.").
    const interpreted = Object.values(result.output.filters ?? {}).some((v) => v != null && v !== "");
    const lead = widened
      ? "No encontré coincidencias exactas, pero esto es lo más cercano. "
      : interpreted && total > 0 ? "Esto es lo que entendí de tu búsqueda. " : "";
    answer = total > 0
      ? `${lead}${total === 1 ? "Encontré 1 oferta que encaja." : `Encontré ${total} ofertas que encajan.`}`
      : "No encontré ofertas con esos criterios. Prueba ampliar: quita la ubicación o cambia la modalidad.";
  }

  return NextResponse.json({
    answer,
    filters: result.output.filters,
    intake_needed: result.output.intake_needed,
    suggested_refinements: result.output.suggested_refinements,
    jobs, total,
    _status: result.status,
  });
}
