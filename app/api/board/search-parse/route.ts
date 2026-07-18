import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { runBoardSearchParser } from "@/agents/agent-board-search";

// Público: interpreta el texto libre de la barra de búsqueda del board → filtros.
// Se invoca al enviar (no por tecla). El autocomplete de job titles estructurados es
// otra vía y NO pasa por aquí. Límite por IP contra abuso.
export async function POST(req: Request) {
  if (!(await rateLimit(`board-search-parse:${clientIp(req)}`, 30, 60_000))) {
    return jsonError("Demasiadas búsquedas. Espera un momento.", 429);
  }
  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) return jsonError("Escribe algo para buscar");
  if (text.length > 300) return jsonError("Búsqueda demasiado larga", 422);

  const result = await runBoardSearchParser({ text });
  return NextResponse.json({ ...result.output, _status: result.status });
}
