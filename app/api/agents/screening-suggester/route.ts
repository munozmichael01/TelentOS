import { NextResponse } from "next/server";
import { requireApiRole, jsonError } from "@/lib/api";
import { runScreeningSuggester } from "@/agents/agent-screening-suggester";

// On-demand: el recruiter pide sugerencias al añadir screening a una oferta. Roles de
// reclutamiento; la oferta debe ser de su empresa (validado por RLS en la tool).
export async function POST(req: Request) {
  const { companyId, supabase, error } = await requireApiRole(["owner", "hr_admin", "recruiter"]);
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body?.jobId) return jsonError("Se requiere 'jobId'");

  // La oferta debe pertenecer a la empresa del usuario (defensa en profundidad sobre la RLS de la tool)
  const { data: job } = await supabase.from("jobs").select("id").eq("id", body.jobId).maybeSingle();
  if (!job) return jsonError("Oferta no encontrada", 404);

  const result = await runScreeningSuggester({ jobId: body.jobId, companyId: companyId! });
  return NextResponse.json({ ...result.output, _status: result.status });
}
