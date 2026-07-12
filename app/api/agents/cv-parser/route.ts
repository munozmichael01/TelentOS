import { NextResponse } from "next/server";
import { requireApiRole, jsonError } from "@/lib/api";
import { runCvParser } from "@/agents/agent-cv-parser";

export async function POST(req: Request) {
  const { error } = await requireApiRole(["owner", "hr_admin", "recruiter"]);
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body?.candidateId || typeof body.candidateId !== "string") {
    return jsonError("Se requiere candidateId", 400);
  }

  const result = await runCvParser({ candidateId: body.candidateId });

  return NextResponse.json({
    profile: result.output,
    status: result.status,
  });
}
