import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api";
import { searchJobs, type BoardSearchParams } from "@/lib/job-board/search";

// Alertas de empleo del candidato: guardan un criterio de búsqueda (los mismos filtros
// del board) + frecuencia, para notificar ofertas nuevas que casen. RLS `job_alerts_own`.
// El envío (cron → match → email) es un job aparte. GET añade match_count por alerta.

const FREQS = new Set(["instant", "daily", "weekly"]);
const freqOf = (v: unknown) => (typeof v === "string" && FREQS.has(v) ? v : "weekly");

function sanitizeCriteria(raw: unknown): Partial<BoardSearchParams> {
  const c = (raw ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  const out: Partial<BoardSearchParams> = {
    q: str(c.q), location: str(c.location), category: str(c.category),
    contract: str(c.contract), companyId: str(c.companyId), categoryKey: str(c.categoryKey),
  };
  const m = str(c.modality);
  if (m === "presencial" || m === "hibrido" || m === "remoto") out.modality = m;
  if (typeof c.salaryMin === "number") out.salaryMin = c.salaryMin;
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined));
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return jsonError("No autenticado", 401);
  const { data, error } = await supabase.from("job_alerts").select("*").order("created_at", { ascending: false });
  if (error) return jsonError(error.message, 500);

  // Ofertas que casan con cada alerta hoy (para "Ver N ofertas", navegable).
  const alerts = await Promise.all((data ?? []).map(async (a) => {
    let matchCount = 0;
    try { matchCount = (await searchJobs(supabase, { ...(a.criteria as BoardSearchParams), pageSize: 1 })).total; } catch { /* ignore */ }
    return { ...a, match_count: matchCount };
  }));
  return NextResponse.json({ alerts });
}

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return jsonError("No autenticado", 401);
  const body = await req.json().catch(() => null);
  const criteria = sanitizeCriteria(body?.criteria);
  if (Object.keys(criteria).length === 0) return jsonError("La alerta necesita al menos un criterio", 422);
  const { data, error } = await supabase
    .from("job_alerts")
    .insert({ user_id: user.id, criteria, active: true, frequency: freqOf(body?.frequency) })
    .select("*")
    .single();
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ alert: data });
}

export async function PATCH(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return jsonError("No autenticado", 401);
  const body = await req.json().catch(() => null);
  const id = String(body?.id ?? "");
  if (!id) return jsonError("Falta el id de la alerta");
  const patch: Record<string, unknown> = {};
  if (typeof body.active === "boolean") patch.active = body.active;
  if (body.frequency !== undefined) patch.frequency = freqOf(body.frequency);
  if (Object.keys(patch).length === 0) return jsonError("Nada que actualizar");
  const { data, error } = await supabase.from("job_alerts").update(patch).eq("user_id", user.id).eq("id", id).select("*").single();
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ alert: data });
}

export async function DELETE(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return jsonError("No autenticado", 401);
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return jsonError("Falta el id de la alerta");
  const { error } = await supabase.from("job_alerts").delete().eq("user_id", user.id).eq("id", id);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true });
}
