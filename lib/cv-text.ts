/**
 * Extracción de texto de CVs (PDF y plain-text). Pieza compartida:
 * la usa el agente cv-parser (admin, "Extraer del CV") y el flujo de
 * inscripción del career site (parsing al adjuntar + modal de validación
 * del candidato). PDF vía unpdf (pdf.js puro, sin binarios — Vercel-safe).
 */
import { extractText as unpdfExtractText, getDocumentProxy } from "unpdf";

const PDF_MAGIC = "%PDF"; // primeros bytes de todo PDF

export function isPdf(buffer: ArrayBuffer): boolean {
  const head = new Uint8Array(buffer.slice(0, 4));
  return String.fromCharCode.apply(null, Array.from(head)) === PDF_MAGIC;
}

/** Fallback para ficheros de texto plano (txt/markdown). */
function extractPlainText(buffer: ArrayBuffer): string {
  return new TextDecoder("utf-8", { fatal: false })
    .decode(buffer)
    .replace(/[ \t]{4,}/g, "   ")
    .replace(/\n{5,}/g, "\n\n")
    .trim();
}

/**
 * Extrae el texto de un CV. PDF → unpdf (texto real de los streams);
 * otro formato → decodificación UTF-8 plana. Devuelve "" si no hay texto útil.
 */
export async function extractCvText(buffer: ArrayBuffer): Promise<string> {
  if (!isPdf(buffer)) return extractPlainText(buffer);
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await unpdfExtractText(pdf, { mergePages: true });
    return (text ?? "").replace(/\n{5,}/g, "\n\n").trim();
  } catch {
    // PDF corrupto/cifrado: mejor vacío (el agente cae a fallback) que basura binaria.
    return "";
  }
}
