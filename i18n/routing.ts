import { defineRouting } from "next-intl/routing";

// i18n de toda la app. El locale es idioma-PAÍS (BCP-47): un job board es geográfico
// (moneda, legal, ofertas y SERPs distintos por país), así que segmentamos por mercado,
// no solo por idioma. Arranca en Venezuela (es-VE); añadir es-ES/pt-BR/en-US después es
// trivial. El locale va en la URL en minúscula: /es-ve/..., /en-us/..., /pt-br/...
// Los mensajes se comparten por IDIOMA (es-VE y un futuro es-ES reusan messages/es/);
// la región solo afecta datos (moneda/legal/ofertas), no las traducciones de UI.
// Slugs localizados solo donde importa el SEO por mercado (el job board público). El
// dashboard (/app/*), marketing y auth NO se localizan en la palabra: el prefijo de
// locale + hreflang ya hacen el geo-targeting; localizar sus slugs no aporta y añade
// coste. El board sí: /empleos · /jobs · /vagas (el EN `jobs` ya no colisiona con el
// dashboard porque este vive bajo /app/jobs).
// Idioma y país son EJES INDEPENDIENTES (una cosa es la oferta, otra el producto): cualquier
// mercado se navega en cualquier idioma. Locale = {idioma}-{país}. Los slugs del board se
// localizan por IDIOMA (empleos/jobs/vagas); byLang genera el mapa para los 12 locales.
const LANGS = ["es", "en", "pt"] as const;
const COUNTRIES = ["ve", "es", "br", "us"] as const;
const LOCALES = LANGS.flatMap((la) => COUNTRIES.map((c) => `${la}-${c}`)) as
  `${(typeof LANGS)[number]}-${(typeof COUNTRIES)[number]}`[];
const byLang = (es: string, en: string, pt: string): Record<string, string> =>
  Object.fromEntries(LOCALES.map((l) => [l, l.startsWith("es") ? es : l.startsWith("en") ? en : pt]));

export const pathnames = {
  "/": "/",
  "/login": "/login",
  "/onboarding": "/onboarding",
  "/pricing": "/pricing",
  "/producto/ats": "/producto/ats",
  "/producto/hris": "/producto/hris",
  "/producto/nomina": "/producto/nomina",
  "/producto/ai-agents": "/producto/ai-agents",
  "/auth/callback": "/auth/callback",
  "/auth/reset-password": "/auth/reset-password",
  "/careers/[slug]": "/careers/[slug]",
  "/careers/[slug]/jobs/[id]": "/careers/[slug]/jobs/[id]",

  // Job board público (slugs localizados por IDIOMA)
  "/empleos": byLang("/empleos", "/jobs", "/vagas"),
  "/empleos/oferta/[slug]": byLang("/empleos/oferta/[slug]", "/jobs/opening/[slug]", "/vagas/vaga/[slug]"),
  "/empleos/oferta/[slug]/aplicar": byLang("/empleos/oferta/[slug]/aplicar", "/jobs/opening/[slug]/apply", "/vagas/vaga/[slug]/candidatar"),
  "/cuenta": byLang("/cuenta", "/account", "/conta"),
  "/cuenta/entrar": byLang("/cuenta/entrar", "/account/sign-in", "/conta/entrar"),
  "/cuenta/perfil": byLang("/cuenta/perfil", "/account/profile", "/conta/perfil"),
  "/empleos/asistente": byLang("/empleos/asistente", "/jobs/assistant", "/vagas/assistente"),
  "/empleos/empresas": byLang("/empleos/empresas", "/jobs/companies", "/vagas/empresas"),
  "/empleos/empresa/[slug]": byLang("/empleos/empresa/[slug]", "/jobs/company/[slug]", "/vagas/empresa/[slug]"),
  "/empleos/[categoria]": byLang("/empleos/[categoria]", "/jobs/[categoria]", "/vagas/[categoria]"),
  "/empleos/[categoria]/[ubicacion]": byLang("/empleos/[categoria]/[ubicacion]", "/jobs/[categoria]/[ubicacion]", "/vagas/[categoria]/[ubicacion]"),

  // Portal del EMPLEADO (superficie propia del rol `employee`; el dashboard B2B es de RR.HH.).
  // No se localiza el slug: es zona privada, el prefijo de locale ya da el idioma.
  "/me/profile": "/me/profile",
  "/me/performance": "/me/performance",
  "/me/time-off": "/me/time-off",
  "/me/payslips": "/me/payslips",
  "/me/payslips/[id]": "/me/payslips/[id]",
  "/me/hours": "/me/hours",

  // Dashboard B2B autenticado (no localizado — mismo slug en todos los locales)
  "/app/dashboard": "/app/dashboard",
  "/app/jobs": "/app/jobs",
  "/app/jobs/new": "/app/jobs/new",
  "/app/jobs/import": "/app/jobs/import",
  "/app/jobs/[id]": "/app/jobs/[id]",
  "/app/jobs/[id]/edit": "/app/jobs/[id]/edit",
  "/app/candidates": "/app/candidates",
  "/app/candidates/[id]": "/app/candidates/[id]",
  "/app/applications/[id]": "/app/applications/[id]",
  "/app/career-site": "/app/career-site",
  "/app/channels": "/app/channels",
  "/app/employees": "/app/employees",
  "/app/employees/[id]": "/app/employees/[id]",
  "/app/org": "/app/org",
  "/app/timeoff": "/app/timeoff",
  "/app/timeoff/calendar": "/app/timeoff/calendar",
  "/app/hours": "/app/hours",
  "/app/hours/compensation": "/app/hours/compensation",
  "/app/payroll": "/app/payroll",
  "/app/payroll/runs": "/app/payroll/runs",
  "/app/payroll/runs/[id]": "/app/payroll/runs/[id]",
  "/app/payroll/profiles": "/app/payroll/profiles",
  "/app/payroll/profiles/[employeeId]": "/app/payroll/profiles/[employeeId]",
  "/app/settings": "/app/settings",
  "/app/settings/team": "/app/settings/team",
  "/app/settings/billing": "/app/settings/billing",
  "/app/settings/absences": "/app/settings/absences",
  "/app/settings/schedules": "/app/settings/schedules",
  "/app/settings/compliance": "/app/settings/compliance",
  "/app/settings/payroll": "/app/settings/payroll",
  "/app/settings/skills": "/app/settings/skills",
  "/app/timesheets": "/app/timesheets",
} as const;

export const routing = defineRouting({
  // 12 locales = 3 idiomas × 4 mercados. es-ve default (arranca en VE). Messages compartidos por
  // idioma. El país solo pesa en el board (boost local + hubs de ciudad); marketing/dashboard de
  // locales no-primarios redirigen a su idioma primario (es→es-ve, en→en-us, pt→pt-br).
  locales: LOCALES,
  defaultLocale: "es-ve",
  pathnames,
});

export type Locale = (typeof routing.locales)[number];
export type AppPathname = keyof typeof pathnames;
// Solo rutas estáticas (sin segmento [param]) — válidas como href string directo del
// Link i18n. Las dinámicas exigen formato objeto {pathname, params}.
export type StaticPathname = Exclude<AppPathname, `${string}[${string}`>;
