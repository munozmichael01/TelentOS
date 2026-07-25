import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://telent-os-mu.vercel.app";

// Bots de motores de respuesta (AEO): se PERMITEN explícitamente (decisión de negocio: queremos
// que ChatGPT/Perplexity/Google AI/Claude puedan leer y CITAR el job board). Google-Extended y
// Applebot-Extended son controles opt-in para uso en IA: permitir = aceptar ser citados.
const AI_BOTS = [
  "GPTBot", "OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "Perplexity-User",
  "Google-Extended", "ClaudeBot", "anthropic-ai", "Claude-Web", "Applebot-Extended",
  "CCBot", "Amazonbot", "Meta-ExternalAgent", "cohere-ai",
];

// robots.txt. Nota: Google DEPRECÓ el ping de sitemap (2023) — el descubrimiento se hace por
// esta directiva `Sitemap:` + Search Console, no con un cron de ping.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Bots web generales: se indexa el público (marketing + job board), NO el producto ni la API.
      { userAgent: "*", allow: "/", disallow: ["/api/", "/onboarding", "/auth/", "/*/app/"] },
      // Bots de IA: acceso al contenido público (mismo alcance) — explícito para dejar la intención clara.
      { userAgent: AI_BOTS, allow: "/", disallow: ["/api/", "/onboarding", "/auth/", "/*/app/"] },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
