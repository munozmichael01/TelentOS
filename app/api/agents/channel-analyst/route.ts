import { NextResponse } from "next/server";
import { requireApiRole, jsonError } from "@/lib/api";
import { runChannelAnalyst } from "@/agents/agent-channel-analyst";

export async function POST(req: Request) {
  // Analytics de reclutamiento: roles de recruiting; companyId scopea las tools (H2)
  const { companyId, error } = await requireApiRole(["owner", "hr_admin", "recruiter"]);
  if (error) return error;

  let body: { query?: string; history?: { role: string; content: string }[] };
  try {
    body = await req.json();
  } catch {
    return jsonError("Body inválido", 400);
  }

  const { query, history = [] } = body;
  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return jsonError("query es requerido", 400);
  }

  const validHistory = history
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))
    .slice(-10); // cap history to last 10 turns

  const result = await runChannelAnalyst({ companyId: companyId!, query: query.trim(), history: validHistory });

  return NextResponse.json({ ...result.output, _status: result.status });
}
