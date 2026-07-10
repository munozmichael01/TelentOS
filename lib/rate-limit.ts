/**
 * Rate limiting en memoria por clave (auditoría H3).
 * Ventana deslizante simple, sin dependencias. Limitación conocida: el
 * contador vive en la instancia del servidor (suficiente para el despliegue
 * actual de instancia única; con múltiples instancias, mover a Redis/Upstash).
 */

const buckets = new Map<string, number[]>();
const MAX_KEYS = 10_000;

/** Devuelve true si la petición está dentro del límite; false si debe rechazarse. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
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

/** IP del cliente detrás del proxy de Vercel/Next. */
export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
