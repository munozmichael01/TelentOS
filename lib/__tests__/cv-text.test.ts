import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { extractCvText, isPdf } from "@/lib/cv-text";

// Fixture: PDF real (v1.3, streams FlateDecode — el texto NO está en claro en el
// binario, como en los CVs reales; un extractor naíf byte-a-byte devuelve basura).
const pdfBuffer = () => {
  const buf = readFileSync(join(__dirname, "fixtures", "cv-sample.pdf"));
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
};

describe("extractCvText (parsing real de CVs — caso mayoritario: PDF)", () => {
  it("detecta PDFs por magic bytes", () => {
    expect(isPdf(pdfBuffer())).toBe(true);
    expect(isPdf(new TextEncoder().encode("hola texto plano").buffer as ArrayBuffer)).toBe(false);
  });

  it("extrae el texto real de un PDF con streams comprimidos", async () => {
    const text = await extractCvText(pdfBuffer());
    expect(text).toContain("Ana Garcia Lopez");
    expect(text).toContain("Full-Stack");
    expect(text).toContain("React");
    expect(text).toContain("Acme Corp");
  });

  it("plain-text pasa por decodificación UTF-8 directa", async () => {
    const buf = new TextEncoder().encode("CV en texto plano\nSkills: Python, SQL").buffer as ArrayBuffer;
    const text = await extractCvText(buf);
    expect(text).toContain("Python, SQL");
  });

  it("PDF corrupto devuelve cadena vacía (el agente cae a fallback), nunca basura binaria", async () => {
    const corrupt = new TextEncoder().encode("%PDF-1.4 esto no es un pdf válido").buffer as ArrayBuffer;
    const text = await extractCvText(corrupt);
    expect(text).toBe("");
  });
});
