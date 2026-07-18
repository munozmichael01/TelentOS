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
// coste. El board sí: `jobs` en EN colisionaría con /app/jobs, por eso `vacancies`.
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

  // Job board público (slugs localizados por mercado)
  "/empleos": { "es-ve": "/empleos", "en-us": "/vacancies", "pt-br": "/vagas" },
  "/empleos/oferta/[slug]": {
    "es-ve": "/empleos/oferta/[slug]",
    "en-us": "/vacancies/job/[slug]",
    "pt-br": "/vagas/vaga/[slug]",
  },

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
  "/app/canales": "/app/canales",
  "/app/employees": "/app/employees",
  "/app/employees/[id]": "/app/employees/[id]",
  "/app/org": "/app/org",
  "/app/timeoff": "/app/timeoff",
  "/app/timeoff/calendar": "/app/timeoff/calendar",
  "/app/horas": "/app/horas",
  "/app/horas/compensacion": "/app/horas/compensacion",
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
  locales: ["es-ve", "en-us", "pt-br"],
  defaultLocale: "es-ve",
  pathnames,
});

export type Locale = (typeof routing.locales)[number];
export type AppPathname = keyof typeof pathnames;
// Solo rutas estáticas (sin segmento [param]) — válidas como href string directo del
// Link i18n. Las dinámicas exigen formato objeto {pathname, params}.
export type StaticPathname = Exclude<AppPathname, `${string}[${string}`>;
