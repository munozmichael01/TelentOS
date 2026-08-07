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
  "/employer/sign-in": "/employer/sign-in",
  "/employer/onboarding": "/employer/onboarding",
  "/pricing": "/pricing",
  "/producto/ats": "/producto/ats",
  "/producto/hris": "/producto/hris",
  "/producto/nomina": "/producto/nomina",
  "/producto/ai-agents": "/producto/ai-agents",
  "/auth/callback": "/auth/callback",
  "/auth/reset-password": "/auth/reset-password",
  "/careers/[slug]": "/careers/[slug]",
  "/careers/[slug]/jobs/[id]": "/careers/[slug]/jobs/[id]",

  // Productos privados: namespace estable, sin localizar (no tienen valor SEO y un path por
  // producto es justo lo que buscábamos). El board sí sigue con slugs por idioma.
  "/candidate": "/candidate",
  "/candidate/sign-in": "/candidate/sign-in",
  "/candidate/profile": "/candidate/profile",
  "/employee/sign-in": "/employee/sign-in",
  // Job board público (slugs localizados por IDIOMA)
  "/empleos": byLang("/empleos", "/jobs", "/vagas"),
  "/empleos/oferta/[slug]": byLang("/empleos/oferta/[slug]", "/jobs/opening/[slug]", "/vagas/vaga/[slug]"),
  "/empleos/oferta/[slug]/aplicar": byLang("/empleos/oferta/[slug]/aplicar", "/jobs/opening/[slug]/apply", "/vagas/vaga/[slug]/candidatar"),
  "/empleos/asistente": byLang("/empleos/asistente", "/jobs/assistant", "/vagas/assistente"),
  "/empleos/empresas": byLang("/empleos/empresas", "/jobs/companies", "/vagas/empresas"),
  "/empleos/empresa/[slug]": byLang("/empleos/empresa/[slug]", "/jobs/company/[slug]", "/vagas/empresa/[slug]"),
  "/empleos/[categoria]": byLang("/empleos/[categoria]", "/jobs/[categoria]", "/vagas/[categoria]"),
  "/empleos/[categoria]/[ubicacion]": byLang("/empleos/[categoria]/[ubicacion]", "/jobs/[categoria]/[ubicacion]", "/vagas/[categoria]/[ubicacion]"),

  // Portal del EMPLEADO (superficie propia del rol `employee`; el dashboard B2B es de RR.HH.).
  // No se localiza el slug: es zona privada, el prefijo de locale ya da el idioma.
  "/employee/profile": "/employee/profile",
  "/employee/performance": "/employee/performance",
  "/employee/time-off": "/employee/time-off",
  "/employee/payslips": "/employee/payslips",
  "/employee/payslips/[id]": "/employee/payslips/[id]",
  "/employee/hours": "/employee/hours",
  "/employee/documents": "/employee/documents",

  // Dashboard B2B autenticado (no localizado — mismo slug en todos los locales)
  "/employer/dashboard": "/employer/dashboard",
  "/employer/jobs": "/employer/jobs",
  "/employer/jobs/new": "/employer/jobs/new",
  "/employer/jobs/import": "/employer/jobs/import",
  "/employer/jobs/[id]": "/employer/jobs/[id]",
  "/employer/jobs/[id]/edit": "/employer/jobs/[id]/edit",
  "/employer/candidates": "/employer/candidates",
  "/employer/candidates/[id]": "/employer/candidates/[id]",
  "/employer/applications/[id]": "/employer/applications/[id]",
  "/employer/career-site": "/employer/career-site",
  "/employer/channels": "/employer/channels",
  "/employer/employees": "/employer/employees",
  "/employer/employees/[id]": "/employer/employees/[id]",
  "/employer/org": "/employer/org",
  "/employer/timeoff": "/employer/timeoff",
  "/employer/timeoff/calendar": "/employer/timeoff/calendar",
  "/employer/hours": "/employer/hours",
  "/employer/hours/compensation": "/employer/hours/compensation",
  "/employer/payroll": "/employer/payroll",
  "/employer/payroll/runs": "/employer/payroll/runs",
  "/employer/payroll/runs/[id]": "/employer/payroll/runs/[id]",
  "/employer/payroll/profiles": "/employer/payroll/profiles",
  "/employer/payroll/profiles/[employeeId]": "/employer/payroll/profiles/[employeeId]",
  "/employer/settings": "/employer/settings",
  "/employer/settings/team": "/employer/settings/team",
  "/employer/settings/billing": "/employer/settings/billing",
  "/employer/settings/absences": "/employer/settings/absences",
  "/employer/settings/schedules": "/employer/settings/schedules",
  "/employer/settings/compliance": "/employer/settings/compliance",
  "/employer/settings/payroll": "/employer/settings/payroll",
  "/employer/settings/skills": "/employer/settings/skills",
  "/employer/timesheets": "/employer/timesheets",
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
