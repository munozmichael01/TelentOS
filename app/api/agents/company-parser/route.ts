import { NextResponse } from "next/server";
import { requireApiRole, jsonError } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { safeFetchHtml, htmlToText, extractSocialLinks } from "@/lib/safe-fetch";
import { extractDocText } from "@/lib/doc-text";
import { runCompanyParser } from "@/agents/agent-company-parser";

/**
 * Parser de empresa — "autorrellenar el career site" desde una **web** o un **documento**
 * (PDF/Word). Patrón cv-parser: fuente → texto → LLM extrae perfil (about/valores/
 * beneficios/métricas, sin inventar). Web: fetch anti-SSRF (IP fijada) + redes del footer.
 * Node runtime (usa dns/net del guard SSRF y unpdf/mammoth). Rate-limit por empresa.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB

export async function POST(req: Request) {
  const { companyId, error } = await requireApiRole(["owner", "hr_admin", "recruiter"]);
  if (error) return error;

  // Rate-limit estándar: 20 peticiones / 10 min por empresa (fetch + LLM).
  if (!(await rateLimit(`company-parser:${companyId}`, 20, 10 * 60_000))) {
    return jsonError("Demasiadas peticiones. Prueba de nuevo en unos minutos.", 429);
  }

  const contentType = req.headers.get("content-type") ?? "";
  let text = "";
  let social: { platform: string; url: string }[] = [];

  try {
    if (contentType.includes("multipart/form-data")) {
      // ── Import por documento (PDF / Word) ──
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return jsonError("Falta el archivo a leer");
      if (file.size > MAX_FILE_BYTES) return jsonError("El archivo es demasiado grande (máx 8 MB).", 413);
      text = await extractDocText(await file.arrayBuffer(), file.name);
      if (!text) return jsonError("No pudimos leer texto de ese documento. Prueba con un PDF o Word con texto.", 422);
    } else {
      // ── Import por web ──
      const body = await req.json().catch(() => null);
      const url = typeof body?.url === "string" ? body.url.trim() : "";
      if (!url) return jsonError("Falta 'url' o un archivo a leer");
      const html = await safeFetchHtml(url);
      text = htmlToText(html);
      social = extractSocialLinks(html);
    }
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "No se pudo leer la fuente", 422);
  }

  const res = await runCompanyParser({ companyId: companyId!, text });
  return NextResponse.json({ ...res.output, social, status: res.status });
}
