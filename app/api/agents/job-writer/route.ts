import { NextResponse } from "next/server";
import { requireApiRole, jsonError } from "@/lib/api";
import { runJobWriter } from "@/agents/agent-job-writer";

export async function POST(req: Request) {
  const { companyId, error } = await requireApiRole(["owner", "hr_admin", "recruiter"]);
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body || (!body.brief && !body.draft)) {
    return jsonError("Se requiere 'brief' o 'draft'");
  }
  const result = await runJobWriter({ companyId: companyId!, brief: body.brief, draft: body.draft, tone: body.tone });
  return NextResponse.json(result);
}
