# TalentOS

Plataforma de operaciones de talento: gestión y distribución de ofertas, ATS y HRIS básico en un solo sistema, con **agentes de IA integrados en cada flujo** (no un chatbot aparte). Los agentes sugieren — redactan ofertas, optimizan canales, analizan candidatos, generan onboarding — y **las decisiones siempre las confirma un humano**.

## Arquitectura

Next.js 14 (App Router) sirve UI y API en un único deployable de Vercel; Supabase aporta Postgres (con RLS), Auth y Storage, y las queries en runtime van por `supabase-js` mientras Prisma documenta el modelo y permite migraciones tipadas (la fuente de verdad del schema, incl. RLS y buckets, es el SQL de `/supabase/migrations`). Los cuatro agentes viven en `/agents` como módulos independientes (system prompt + tools + invocación) sobre un runner común de GPT-4o con tool calling que audita cada ejecución en `agent_runs` y degrada a heurísticas deterministas si no hay `OPENAI_API_KEY`; las rutas de `/app/api` los exponen a la UI, donde cada propuesta del agente se materializa solo cuando el usuario la aplica.

## Setup en 3 comandos

```bash
npm install
npx supabase db push && psql "$DATABASE_URL" -f supabase/seed.sql   # o pega migración+seed en el SQL Editor de Supabase
npm run dev
```

> Antes: `cp .env.example .env.local` y rellena las variables (ver abajo). Crea el proyecto en [supabase.com](https://supabase.com) y desactiva "Confirm email" en Auth → Providers si quieres registro instantáneo en local.

## Variables de entorno

| Variable | Descripción |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase (Settings → API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública `anon` |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave `service_role` (solo servidor; flujo público del career site) |
| `DATABASE_URL` | Connection string Postgres (solo para Prisma/psql) |
| `OPENAI_API_KEY` | Clave de OpenAI para los agentes (GPT-4o). Opcional: sin ella, los agentes funcionan en modo heurístico determinista |
| `NEXT_PUBLIC_APP_URL` | URL pública de la app (`http://localhost:3000` en local) |

## Mapa del repo

```
/app          Páginas (App Router) y API routes
  /(dashboard)  App privada: ofertas, candidatos, empleados, horas, vacaciones…
  /careers      Career site público por empresa (/careers/[slug])
  /api          Rutas de API (CRUD + invocación de agentes)
/agents       Un módulo por agente: prompt + tools + invocación + fallback
  agent-job-writer          Redacción asistida de ofertas (salario de mercado, skills)
  agent-channel-optimizer   Plan de distribución: canales, presupuesto y copy por canal
  agent-candidate-analyzer  Resumen, gaps vs. requisitos y preguntas de entrevista
  agent-onboarding-builder  Checklist de onboarding según rol y departamento
/components   shadcn/ui (/ui) + componentes de feature (/features)
/lib          Clientes Supabase/OpenAI, schema interno, fit score, importadores, datos mock
/supabase     Migración SQL (tablas + RLS + buckets) y seed de demo
/prisma       Schema Prisma espejo del modelo
```

## Flujos end-to-end

1. **Oferta**: crear con IA (`/jobs/new`) o importar CSV/Excel/XML/JSON/URL con normalización y dedupe (`/jobs/import`) → mismo schema interno.
2. **Distribución**: en la oferta, pestaña *Distribución* → el agente propone canales/presupuesto/copy según objetivo y performance histórica → activas los que quieras → métricas por canal (views, aplicaciones, CPA, conversión; integraciones mockeadas con "Simular 1 día").
3. **Career site**: `/careers/[slug]` público; las candidaturas entran con UTM de origen y fit score automático.
4. **ATS**: kanban por etapas configurado por oferta, movimientos con motivo y trazabilidad completa, entrevistas con plantillas de evaluación, análisis de candidato con IA.
5. **Contratación**: botón *Contratar* → el candidato se promueve a empleado sin reintroducir datos → onboarding generado por el agente → documentos, horas, vacaciones y organigrama.

## Deploy

GitHub → Vercel (framework Next.js, sin config extra) + Supabase. Añade las variables de entorno en Vercel y aplica `supabase/migrations` + `seed.sql` al proyecto de Supabase.
