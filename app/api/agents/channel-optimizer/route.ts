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

  const objective = ["volume", "quality", "cpa"].includes(body.objective) ? body.objective : "volume";
  const budget = Number(body.budget) || 500;

  const result = await runChannelOptimizer({ job, objective, budget });

  // Mark any previous pending plan as superseded, then persist the new one
  await supabase
    .from("distribution_plans")
    .update({ status: "superseded" })
    .eq("job_id", body.jobId)
    .eq("status", "pending");

  const { data: saved } = await supabase
    .from("distribution_plans")
    .insert({
      job_id: body.jobId,
      objective,
      budget,
      plan: result.output,
      model: result.status,
      status: "pending",
    })
    .select("id")
    .single();

  return NextResponse.json({ ...result, plan_id: saved?.id ?? null });
}
