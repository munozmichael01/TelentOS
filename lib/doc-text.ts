/**
 * Extracción de texto de documentos para el parser de empresa (import por archivo).
 * PDF → unpdf (mismo motor que el cv-parser, sin binarios, Vercel-safe); Word .docx →
 * mammoth; texto plano → UTF-8. Excel/CSV quedan fuera a propósito (son datos
 * tabulares, no prosa de marca). Devuelve "" si no hay texto útil.
 */
import { extractText as unpdfExtractText, getDocumentProxy } from "unpdf";
import mammoth from "mammoth";

function isPdf(buf: ArrayBuffer): boolean {
  const h = new Uint8Array(buf.slice(0, 4));
  return String.fromCharCode(...Array.from(h)) === "%PDF";
}
function isZip(buf: ArrayBuffer): boolean {
  const h = new Uint8Array(buf.slice(0, 2));
  return h[0] === 0x50 && h[1] === 0x4b; // "PK" — .docx es un zip
}

export async function extractDocText(buffer: ArrayBuffer, filename?: string): Promise<string> {
  const name = (filename ?? "").toLowerCase();

  if (isPdf(buffer)) {
    try {
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const { text } = await unpdfExtractText(pdf, { mergePages: true });
      return (text ?? "").replace(/\n{5,}/g, "\n\n").trim();
    } catch {
      return ""; // PDF cifrado/corrupto → vacío (el agente cae a fallback)
    }
  }

  if (isZip(buffer) || name.endsWith(".docx")) {
    try {
      const { value } = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
      return (value ?? "").replace(/\n{5,}/g, "\n\n").trim();
    } catch {
      return "";
    }
  }

  // Texto plano (.txt/.md)
  return new TextDecoder("utf-8", { fatal: false }).decode(buffer).replace(/\n{5,}/g, "\n\n").trim();
}
