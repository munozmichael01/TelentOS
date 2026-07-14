import dns from "node:dns/promises";
import net from "node:net";

/**
 * Fetch de URLs proporcionadas por el usuario con guard anti-SSRF. Se usa para el
 * "parser de empresa" (importar el career site desde la web). Bloquea IPs privadas,
 * loopback, link-local y el endpoint de metadata cloud (169.254.169.254); solo
 * http/https; acota tamaño, tiempo y saltos de redirección (revalidando cada host).
 */

function isPrivateIp(ip: string): boolean {
  if (net.isIP(ip) === 4) {
    const p = ip.split(".").map(Number);
    if (p[0] === 10 || p[0] === 127 || p[0] === 0) return true;
    if (p[0] === 169 && p[1] === 254) return true; // link-local + metadata cloud
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
    if (p[0] === 192 && p[1] === 168) return true;
    if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true; // CGNAT
    return false;
  }
  const l = ip.toLowerCase();
  if (l === "::1" || l === "::") return true;
  if (l.startsWith("fc") || l.startsWith("fd")) return true; // unique-local
  if (l.startsWith("fe80")) return true; // link-local
  if (l.startsWith("::ffff:")) return isPrivateIp(l.replace("::ffff:", "")); // IPv4-mapped
  return false;
}

async function assertPublicHost(host: string): Promise<void> {
  let addrs: string[];
  if (net.isIP(host)) {
    addrs = [host];
  } else {
    try {
      addrs = (await dns.lookup(host, { all: true })).map((r) => r.address);
    } catch {
      // ENOTFOUND / EAI_AGAIN etc. → mensaje limpio (no filtrar el error crudo de Node).
      throw new Error("No pudimos leer esa web. Revisa que la URL sea correcta.");
    }
  }
  if (!addrs.length) throw new Error("No pudimos leer esa web. Revisa que la URL sea correcta.");
  if (addrs.some(isPrivateIp)) throw new Error("Host no permitido (red interna)");
}

/** Descarga el HTML de una URL pública. Lanza con mensaje claro si algo no cumple. */
export async function safeFetchHtml(
  rawUrl: string,
  opts?: { maxBytes?: number; timeoutMs?: number; maxRedirects?: number },
): Promise<string> {
  const maxBytes = opts?.maxBytes ?? 800_000;
  const timeoutMs = opts?.timeoutMs ?? 8000;
  let redirects = opts?.maxRedirects ?? 3;

  let target = rawUrl;
  for (;;) {
    let url: URL;
    try { url = new URL(target); } catch { throw new Error("URL inválida"); }
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Solo se admiten URLs http/https");
    await assertPublicHost(url.hostname);

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetch(url.toString(), {
        redirect: "manual",
        signal: ctrl.signal,
        headers: { "user-agent": "TalentOS-CareerImport/1.0", accept: "text/html,application/xhtml+xml" },
      });
    } catch (e) {
      // Timeout (abort) o error de red → mensaje limpio, nunca el error crudo de Node.
      if (e instanceof Error && e.name === "AbortError") throw new Error("La web tardó demasiado en responder.");
      throw new Error("No pudimos leer esa web. Revisa que la URL sea correcta.");
    } finally {
      clearTimeout(timer);
    }

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc || redirects <= 0) throw new Error("Demasiadas redirecciones");
      redirects -= 1;
      target = new URL(loc, url).toString(); // revalida el nuevo host en la siguiente vuelta
      continue;
    }
    if (!res.ok) throw new Error(`La web respondió ${res.status}`);
    const ct = res.headers.get("content-type") ?? "";
    if (!/html|text\//i.test(ct)) throw new Error("La URL no parece una página web (HTML)");

    const reader = res.body?.getReader();
    if (!reader) return "";
    const chunks: Uint8Array[] = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) { chunks.push(value); received += value.length; }
      if (received > maxBytes) { await reader.cancel(); break; }
    }
    const buf = new Uint8Array(received);
    let off = 0;
    for (const c of chunks) { buf.set(c.subarray(0, Math.min(c.length, received - off)), off); off += c.length; }
    return new TextDecoder("utf-8", { fatal: false }).decode(buf);
  }
}

/** HTML → texto visible acotado (para el LLM). */
export function htmlToText(html: string, maxChars = 8000): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxChars);
}

/** Extrae enlaces de redes sociales del HTML (fiable vía href; nunca se inventan). */
export function extractSocialLinks(html: string): { platform: string; url: string }[] {
  const hrefs = Array.from(html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)).map((m) => m[1]);
  const domains: [string, RegExp][] = [
    ["linkedin", /linkedin\.com/i], ["instagram", /instagram\.com/i],
    ["twitter", /(twitter\.com|x\.com)/i], ["facebook", /facebook\.com/i],
    ["youtube", /youtube\.com/i], ["tiktok", /tiktok\.com/i],
  ];
  const out: { platform: string; url: string }[] = [];
  for (const [platform, re] of domains) {
    const found = hrefs.find((h) => /^https?:\/\//i.test(h) && re.test(h));
    if (found) out.push({ platform, url: found });
  }
  return out;
}
