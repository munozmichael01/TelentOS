import { NextResponse } from "next/server";
import { requireApiRole, jsonError } from "@/lib/api";
import { safeFetchHtml, htmlToText, extractSocialLinks } from "@/lib/safe-fetch";
import { runCompanyParser } from "@/agents/agent-company-parser";

/**
 * Parser de empresa — "autorrellenar el career site desde tu web" (§2.1 techo/pro).
 * Fetch anti-SSRF de la URL → texto → LLM extrae perfil (about/valores/beneficios/
 * métricas, sin inventar) + redes sociales (del href, fiables). Devuelve datos para
 * poblar el intake (🟢) y los enlaces 🟡. Node runtime (usa dns/net del guard SSRF).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { companyId, error } = await requireApiRole(["owner", "hr_admin", "recruiter"]);
  if (error) return error;

  const body = await req.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  if (!url) return jsonError("Falta 'url' de la empresa a leer");

  let html: string;
  try {
    html = await safeFetchHtml(url);
  } catch (e) {
    // Mensaje limpio al usuario (URL inválida, host interno, timeout, etc.)
    return jsonError(e instanceof Error ? e.message : "No se pudo leer la web", 422);
  }

  const text = htmlToText(html);
  const social = extractSocialLinks(html);
  const res = await runCompanyParser({ companyId: companyId!, text });

  return NextResponse.json({ ...res.output, social, status: res.status });
}
