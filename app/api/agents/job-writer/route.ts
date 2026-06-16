import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";
import { runJobWriter } from "@/agents/agent-job-writer";

export async function POST(req: Request) {
  const { error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body || (!body.brief && !body.draft)) {
    return jsonError("Se requiere 'brief' o 'draft'");
  }
  const result = await runJobWriter({ brief: body.brief, draft: body.draft });
  return NextResponse.json(result);
}
