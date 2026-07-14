import dns from "node:dns/promises";
import net from "node:net";
import http from "node:http";
import https from "node:https";

/**
 * Fetch de URLs proporcionadas por el usuario con guard anti-SSRF. Se usa para el
 * "parser de empresa" (importar el career site desde la web). Defensas:
 * - Solo http/https; bloquea IPs privadas, loopback, link-local y metadata cloud
 *   (169.254.169.254), CGNAT, IPv6 (incl. mapeadas).
 * - **Anti-DNS-rebinding**: resuelve y valida la IP, y luego FIJA esa IP en la
 *   conexión (lookup custom sobre node:https) — el cliente no vuelve a resolver el
 *   host, así que no hay ventana TOCTOU. El SNI/cert se validan contra el hostname real.
 * - Acota tamaño, tiempo y saltos de redirección (revalidando cada host).
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

/** Resuelve el host, valida que NINGUNA IP sea interna, y devuelve la IP pública a fijar. */
async function resolveAndValidate(host: string): Promise<string> {
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new Error("Host no permitido (red interna)");
    return host;
  }
  let addrs: string[];
  try {
    addrs = (await dns.lookup(host, { all: true })).map((r) => r.address);
  } catch {
    throw new Error("No pudimos leer esa web. Revisa que la URL sea correcta.");
  }
  if (!addrs.length) throw new Error("No pudimos leer esa web. Revisa que la URL sea correcta.");
  if (addrs.some(isPrivateIp)) throw new Error("Host no permitido (red interna)");
  return addrs[0]; // IP pública validada — se fija en la conexión (cierra el rebinding)
}

type RawResponse = { status: number; location?: string; contentType: string; body: string };

/** Una petición GET con la IP FIJADA (no re-resuelve el host). SNI = hostname real. */
function fetchPinnedOnce(url: URL, pinnedIp: string, maxBytes: number, timeoutMs: number): Promise<RawResponse> {
  const mod = url.protocol === "https:" ? https : http;
  const family = net.isIP(pinnedIp);
  const lookup: net.LookupFunction = (_hostname, options, cb) => {
    // Fuerza SIEMPRE la IP validada — el cliente jamás re-resuelve (anti-rebinding).
    if (options && (options as { all?: boolean }).all) {
      (cb as unknown as (e: null, a: { address: string; family: number }[]) => void)(null, [{ address: pinnedIp, family }]);
    } else {
      cb(null, pinnedIp, family);
    }
  };
  return new Promise<RawResponse>((resolve, reject) => {
    let done = false;
    const req = mod.request(
      url,
      {
        method: "GET",
        lookup,
        servername: url.hostname, // SNI con el hostname real → cert válido
        headers: { host: url.hostname, "user-agent": "TalentOS-CareerImport/1.0", accept: "text/html,application/xhtml+xml" },
        timeout: timeoutMs,
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400) {
          res.resume(); // drena el cuerpo del redirect
          if (!done) { done = true; resolve({ status, location: res.headers.location, contentType: "", body: "" }); }
          return;
        }
        const contentType = String(res.headers["content-type"] ?? "");
        const chunks: Buffer[] = [];
        let received = 0;
        res.on("data", (c: Buffer) => {
          if (done) return;
          received += c.length;
          chunks.push(c);
          if (received >= maxBytes) { done = true; res.destroy(); resolve({ status, contentType, body: Buffer.concat(chunks).toString("utf-8") }); }
        });
        res.on("end", () => { if (!done) { done = true; resolve({ status, contentType, body: Buffer.concat(chunks).toString("utf-8") }); } });
        res.on("error", () => { if (!done) { done = true; reject(new Error("No pudimos leer esa web. Revisa que la URL sea correcta.")); } });
      },
    );
    req.on("timeout", () => { req.destroy(); if (!done) { done = true; reject(new Error("La web tardó demasiado en responder.")); } });
    req.on("error", () => { if (!done) { done = true; reject(new Error("No pudimos leer esa web. Revisa que la URL sea correcta.")); } });
    req.end();
  });
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

    const pinnedIp = await resolveAndValidate(url.hostname);
    const res = await fetchPinnedOnce(url, pinnedIp, maxBytes, timeoutMs);

    if (res.status >= 300 && res.status < 400) {
      if (!res.location || redirects <= 0) throw new Error("Demasiadas redirecciones");
      redirects -= 1;
      target = new URL(res.location, url).toString(); // revalida el nuevo host en la próxima vuelta
      continue;
    }
    if (res.status < 200 || res.status >= 300) throw new Error(`La web respondió ${res.status}`);
    if (!/html|text\//i.test(res.contentType)) throw new Error("La URL no parece una página web (HTML)");
    return res.body;
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
