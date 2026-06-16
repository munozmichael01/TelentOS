import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";
import { runChannelOptimizer } from "@/agents/agent-channel-optimizer";

export async function POST(req: Request) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body?.jobId) return jsonError("Se requiere 'jobId'");

  const { data: job } = await supabase
    .from("jobs")
    .select("id,title,sector,location,employment_type,salary_min,salary_max")
    .eq("id", body.jobId)
    .maybeSingle();
  if (!job) return jsonError("Oferta no encontrada", 404);

  const result = await runChannelOptimizer({
    job,
    objective: ["volume", "quality", "cpa"].includes(body.objective) ? body.objective : "volume",
    budget: Number(body.budget) || 500,
  });
  return NextResponse.json(result);
}
