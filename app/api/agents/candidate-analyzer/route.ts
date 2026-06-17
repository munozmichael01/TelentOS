import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";
import { runCandidateAnalyzer } from "@/agents/agent-candidate-analyzer";

export async function POST(req: Request) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body?.applicationId) return jsonError("Se requiere 'applicationId'");

  const result = await runCandidateAnalyzer({ applicationId: body.applicationId });

  if (result.output) {
    await supabase
      .from("applications")
      .update({ ai_analysis: result.output })
      .eq("id", body.applicationId);
  }

  return NextResponse.json(result);
}
