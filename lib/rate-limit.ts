/**
 * Rate limiting por clave (auditoría H3).
 *
 * Store compartido en Redis (Upstash / Vercel KV) cuando hay credenciales → el límite
 * es REAL en prod: sobrevive redeploys y es común a todas las instancias serverless.
 * Sin credenciales (dev, o prod aún sin configurar) cae a un contador EN MEMORIA:
 * suficiente para instancia única, pero no sobrevive multi-instancia ni redeploys.
 *
 * Para activarlo en prod: añadir Vercel KV / Upstash y las env
 * `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`. El código las detecta solo.
 */
import { Redis } from "@upstash/redis";

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// ── Fallback en memoria (ventana deslizante) ──
const buckets = new Map<string, number[]>();
const MAX_KEYS = 10_000;

function rateLimitMemory(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  // Poda defensiva para que el Map no crezca sin límite
  if (buckets.size > MAX_KEYS) {
    buckets.forEach((hits, k) => {
      if (hits.length === 0 || now - hits[hits.length - 1] > windowMs) buckets.delete(k);
    });
  }
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  return true;
}

/** Devuelve true si la petición está dentro del límite; false si debe rechazarse. */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  if (!redis) return rateLimitMemory(key, limit, windowMs);
  // Ventana fija en Redis: INCR + PEXPIRE. Suficiente y barato para anti-abuso.
  const windowId = Math.floor(Date.now() / windowMs);
  const rkey = `rl:${key}:${windowId}`;
  try {
    const count = await redis.incr(rkey);
    if (count === 1) await redis.pexpire(rkey, windowMs);
    return count <= limit;
  } catch {
    // Si Redis falla, no penalizamos al usuario legítimo: caemos a memoria.
    return rateLimitMemory(key, limit, windowMs);
  }
}

/** IP del cliente detrás del proxy de Vercel/Next. */
export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
