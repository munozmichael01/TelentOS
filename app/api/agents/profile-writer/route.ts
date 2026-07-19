import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { runProfileWriter } from "@/agents/agent-profile-writer";

/**
 * Redactor de perfil (C2) para el builder del candidato cuando NO adjunta CV.
 * Candidato-facing (bajo /cuenta, auth-gated en la UI); aquí protegemos con rate-limit
 * por IP porque llama a OpenAI. El agente PROPONE; la UI confirma antes de persistir.
 */
export async function POST(req: Request) {
  if (!(await rateLimit(`profile-writer:${clientIp(req)}`, 10, 10 * 60_000))) {
    return jsonError("Demasiadas solicitudes. Inténtalo en unos minutos.", 429);
  }
  const body = await req.json().catch(() => null);
  const role = String(body?.role ?? "").trim();
  if (!role) return jsonError("Falta el rol");

  const result = await runProfileWriter({
    role,
    experienceYears: typeof body?.experience_years === "number" ? body.experience_years : undefined,
    pitch: typeof body?.pitch === "string" ? body.pitch : undefined,
    modality: typeof body?.modality === "string" ? body.modality : undefined,
  });
  return NextResponse.json(result);
}
