import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";
import { runCandidateAnalyzer } from "@/agents/agent-candidate-analyzer";

export async function POST(req: Request) {
  const { error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body?.applicationId) return jsonError("Se requiere 'applicationId'");

  const result = await runCandidateAnalyzer({ applicationId: body.applicationId });
  return NextResponse.json(result);
}
