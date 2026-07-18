import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api";
import { runBoardAssistant } from "@/agents/agent-board-assistant";
import { searchJobs } from "@/lib/job-board/search";

// Asistente del board — GATED a candidato logueado (decisión de producto). El agente
// ordena el intake y narra; aquí re-ejecutamos la búsqueda determinista con sus filtros
// para devolver los JobCards autoritativos (nunca dependen del LLM).
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return jsonError("Inicia sesión para usar el asistente", 401);

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

  // JobCards autoritativos: búsqueda determinista con los filtros finales del agente
  // (salvo que pida más intake, en cuyo caso aún no hay filtros que ejecutar).
  let jobs: unknown[] = [];
  let total = 0;
  if (!result.output.intake_needed) {
    const res = await searchJobs(supabase, { ...result.output.filters, pageSize: 12 });
    jobs = res.jobs;
    total = res.total;
  }

  return NextResponse.json({
    answer: result.output.answer,
    filters: result.output.filters,
    intake_needed: result.output.intake_needed,
    suggested_refinements: result.output.suggested_refinements,
    jobs, total,
    _status: result.status,
  });
}
