import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { extractCvText } from "@/lib/cv-text";
import { extractProfileFromText } from "@/agents/agent-cv-parser";

/**
 * Endpoint PÚBLICO del career site: el candidato adjunta su CV en la inscripción,
 * lo parseamos y devolvemos el perfil estructurado para que él lo valide antes de
 * enviar (los agentes proponen, el dueño del dato confirma). No persiste nada:
 * la escritura ocurre en /api/careers/apply con los datos ya validados.
 *
 * Mismas defensas que careers/apply por ser público: rate limit por IP, MIME
 * restringido (PDF/txt) y límite de tamaño.
 */
const MIME_ALLOWED = ["application/pdf", "text/plain"];
const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(req: Request) {
  if (!(await rateLimit(`careers-parse-cv:${clientIp(req)}`, 8, 10 * 60_000))) {
    return jsonError("Demasiadas solicitudes. Inténtalo de nuevo en unos minutos.", 429);
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) return jsonError("Formulario inválido");

  const cv = formData.get("cv") as File | null;
  if (!cv || cv.size === 0) return jsonError("No se recibió ningún fichero");
  if (cv.size > MAX_BYTES) return jsonError("El CV no puede superar 8 MB");
  // Word (.doc/.docx) no se parsea aquí: unpdf solo cubre PDF. Se admite en apply
  // como adjunto, pero el parsing asistido es PDF/txt.
  if (!MIME_ALLOWED.includes(cv.type)) {
    return jsonError("Solo se puede extraer de PDF o texto plano", 415);
  }

  let cvText = "";
  try {
    const buffer = await cv.arrayBuffer();
    cvText = await extractCvText(buffer);
  } catch {
    return jsonError("No se pudo leer el CV", 422);
  }

  const result = await extractProfileFromText(cvText);

  // Guarda el archivo en el bucket privado `cvs` y devuelve el path, para que el flujo
  // del board persista cv_url en la ficha (el career site sube el archivo en su propio
  // apply). Best-effort: si el guardado falla, el parse igual se devuelve.
  let cvPath: string | null = null;
  try {
    const path = `board/${Date.now()}-${cv.name.replace(/[^\w.\-]/g, "_")}`;
    const { error: upErr } = await createAdminClient().storage
      .from("cvs")
      .upload(path, cv, { contentType: cv.type || "application/pdf" });
    if (!upErr) cvPath = path;
  } catch { /* no bloquea el parse */ }

  return NextResponse.json({ profile: result.output, status: result.status, cv_path: cvPath, cv_name: cv.name });
}
