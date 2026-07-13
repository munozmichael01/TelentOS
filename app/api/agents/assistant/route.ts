import { NextResponse } from "next/server";
import { requireApiRole, jsonError } from "@/lib/api";
import { runAssistant } from "@/agents/agent-assistant";
import type { AssistantRole } from "@/agents/agent-assistant/tools";

export async function POST(req: Request) {
  // Todos los roles internos pueden preguntar; el RBAC fino vive en las tools
  // (un recruiter no tiene montada la tool de nómina — el asistente lo dice).
  const { companyId, role, error } = await requireApiRole(["owner", "hr_admin", "recruiter"]);
  if (error) return error;

  let body: { query?: string; context?: string; history?: { role: string; content: string }[] };
  try {
    body = await req.json();
  } catch {
    return jsonError("Body inválido", 400);
  }

  const query = body.query?.trim();
  if (!query) return jsonError("query es requerido", 400);

  const history = (body.history ?? [])
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role as "user" | "assistant", content: String(m.content).slice(0, 2000) }))
    .slice(-10);

  const result = await runAssistant({
    companyId: companyId!,
    role: role as AssistantRole,
    query,
    context: body.context?.slice(0, 120) ?? null,
    history,
  });

  return NextResponse.json({ ...result.output, _status: result.status });
}
