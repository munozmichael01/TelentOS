import { NextResponse } from "next/server";
import { requireApiRole, jsonError } from "@/lib/api";
import { runCandidateAnalyzer } from "@/agents/agent-candidate-analyzer";

export async function POST(req: Request) {
  const { companyId, supabase, error } = await requireApiRole(["owner", "hr_admin", "recruiter"]);
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body?.applicationId) return jsonError("Se requiere 'applicationId'");

  const result = await runCandidateAnalyzer({ applicationId: body.applicationId, companyId: companyId! });

  if (result.output) {
    await supabase
      .from("applications")
      .update({ ai_analysis: result.output })
      .eq("id", body.applicationId);
  }

  return NextResponse.json(result);
}
