# TalentOS — CLAUDE.md

Plataforma de operaciones de talento (ATS + HRIS + Payroll) con agentes de IA integrados en cada flujo.
Stack: **Next.js 14 App Router · Supabase/Postgres · OpenAI GPT-4o**.

---

## Reglas de proyecto

- **`handoff/` NO se commitea** (está en `.gitignore`): specs, mockups, auditorías y documentos de traspaso viven solo en local, en el checkout principal (`~/Documents/Dev/TalentOS/handoff/`). En worktrees no existen — leerlos desde esa ruta absoluta.
- **Siempre commit + push juntos** en esta fase de desarrollo. No dejes commits sin pushear.
- Las migraciones SQL van en `supabase/migrations/` con formato `NNNN_nombre.sql`. La fuente de verdad del schema es el SQL de `supabase/migrations/`; el espejo tipado es `lib/types.ts` (Prisma fue eliminado del repo — auditoría H4).

---

## Arquitectura de autenticación y scoping de empresa

### API routes — usa `requireApiRole`, no `LIMIT 1`

```ts
// ✅ CORRECTO: requireApiRole resuelve company desde membership
const { companyId, error } = await requireApiRole(["owner", "hr_admin"]);
// companyId ya está disponible — úsalo en todas las queries del handler

// ❌ INCORRECTO: evita esto en API routes
const { data: company } = await supabase.from("companies").select("id").limit(1).maybeSingle();
```

`requireApiRole` (en `lib/api.ts`) busca `company_members` por `user_id`, no por LIMIT 1. Hay ~57 ocurrencias de `.limit(1)` en companies repartidas por el código — esto es deuda técnica conocida. Al tocar un handler, corrígelo.

### Pages (server components) — usa `getCompany()` o el cliente RLS

```ts
import { getCompany } from "@/lib/workspace";
const company = await getCompany(); // RLS-scoped por sesión del usuario
```

### Clientes Supabase

| Cliente | Cuándo |
|---|---|
| `createClient()` | Servidor: queries bajo sesión del usuario (RLS activo) |
| `createAdminClient()` | Servidor: queries que necesitan bypasear RLS post-auth (leer roles, usuarios admin) |
| `createClient()` de `@/lib/supabase/client` | Client components |

### RBAC — roles

`owner · hr_admin · recruiter · manager · employee`

Guards:
- Pages: `requireRole(["owner", "hr_admin"])` — redirige a `/dashboard` si falla
- API: `requireApiRole(["owner"])` — retorna 401/403 con JSON

---

## Módulos y estado actual

| Módulo | Estado | Rutas |
|---|---|---|
| **Reclutamiento** (Jobs, Kanban, Career Site) | ✅ Completo | `/jobs`, `/candidates`, `/career-site`, `/canales` |
| **Personas** (Empleados, Org) | ✅ Completo | `/employees`, `/org` |
| **Ausencias** | ✅ Completo | `/timeoff`, `/timeoff/calendar`, `/settings/absences` |
| **Horas** | ✅ Completo | `/horas`, `/horas/compensacion` |
| **Compliance** | ✅ Completo | `/settings/compliance` |
| **Horarios** | ✅ Completo | `/settings/schedules` |
| **Payroll** | 🚧 En implementación — spec y protocolo en `handoff/Handoff Claude Code - Payroll spec producto.md` (§8 con puertas de AC) | `/payroll`, `/payroll/runs`, `/payroll/profiles` |
| **Onboarding** | ✅ Completo | vía `application_events` + tareas |
| **Performance Management** | ❌ No iniciado | — roadmap pendiente |

**Payroll**: el esquema (migraciones 0016–0019) existe; el ciclo funcional se está implementando según la spec de `handoff/`. Reglas clave: el pack `generic` es el único activo (VE/BR/ES son mocks en preview); **el dinero nunca fluye automáticamente del ATS a nómina** — los campos `offer_*` de la candidatura solo pre-rellenan el formulario de compensación que RR.HH. confirma al contratar (el auto-create de `pay_profiles` en `hire/route.ts` fue revertido a propósito: no reintroducirlo).

**Performance Management** (no confundir con rendimiento de la app) = módulo de evaluaciones de desempeño, review cycles, goals — no existe en el código aún. Tablas `review_cycles`, `performance_reviews`, `goals` no están en ninguna migración.

---

## Agentes de IA

Todos viven en `/agents/`, siguen el runner de `core.ts`.

| Agente | Directorio | Propósito | Endpoint |
|---|---|---|---|
| `job-writer` | `agent-job-writer/` | Redacta/mejora oferta de trabajo | `POST /api/agents/job-writer` |
| `channel-optimizer` | `agent-channel-optimizer/` | Plan de distribución: canales, presupuesto, copy | `POST /api/agents/channel-optimizer` |
| `channel-analyst` | `agent-channel-analyst/` | Analytics conversacional de canales (acepta `history[]`) | `POST /api/agents/channel-analyst` |
| `candidate-analyzer` | `agent-candidate-analyzer/` | Resumen, fit gaps, preguntas de entrevista | `POST /api/agents/candidate-analyzer` |
| `onboarding-builder` | `agent-onboarding-builder/` | Checklist de onboarding según rol/departamento | `POST /api/agents/onboarding-builder` |
| `dashboard-insights` | (sin directorio propio) | Motor LLM del dashboard de reclutamiento | `GET/POST /api/agents/dashboard-insights` |

**Invariante fundamental**: los agentes **nunca escriben en la base de datos**. Solo devuelven propuestas estructuradas. La persistencia ocurre únicamente cuando el usuario la confirma en la UI. Si añades un agente o tools, respeta este principio.

`core.ts` registra cada ejecución en `agent_runs`. Sin `OPENAI_API_KEY`, degrada a fallback heurístico determinista.

---

## Schema — tablas clave

```
companies          → company_members (RBAC multi-tenant)
candidates         → applications → job_stages → jobs
applications       → employees (via hire/route.ts)
employees          → pay_profiles → pay_components
pay_runs           → pay_run_lines → pay_run_line_items
absence_requests   → absence_types, allowance_types, allowance_policies
time_entries       → employees
onboarding_tasks   → employees
agent_runs         (auditoría de ejecuciones de agentes)
```

**Campos nuevos en `applications`**: `offer_salary`, `offer_currency`, `offer_frequency`, `offer_start_date` — capturan los términos de la oferta aceptada; se usan como **pre-relleno** del formulario de compensación al contratar (nunca auto-create).

**Campos en `employees`**: `national_id` (cédula V-..., requerida para recibo VE), `birth_date`, `address`.

**Campo en `companies`**: `rif` (J-XXXXXXXX-X).

---

## Sistema de diseño — reglas de componentes

### PageHeader — contrato de slots

```tsx
<PageHeader
  eyebrow="Nombre de sección"   // SOLO nombre de sección. Nunca un count, nunca una frase.
  title="Nombre de página"       // Nombre de la página — Archivo 900, 28px
  description="Frase explicativa en sentence-case con punto final."
/>
```

| Sección nav | eyebrow |
|---|---|
| Reclutamiento (jobs, candidates, career-site, canales) | `"Reclutamiento"` |
| Personas (employees, org) | `"Personas"` |
| Ausencias (timeoff, calendar) | `"Ausencias"` |
| Horas (horas, compensacion) | `"Horas"` |
| Payroll (payroll, runs, profiles) | `"Payroll"` |
| Ajustes (todas las sub-páginas) | `"Ajustes"` |

### Cards

```tsx
// Card base — usa siempre el componente
<Card />                   // borde #E7E1D4, fondo #FCFAF6, radius 14px
<Card interactive />       // añade card-hover (border + shadow, SIN transform)
<Card panel />             // radius 16px (paneles principales)

// KPI tiles — nunca interactivos
<StatCard label="..." value={...} hint="..." hintColor="#79746B" valueColor="#1A1A17" />
```

`card-hover` en `globals.css`: solo `border-color` + `box-shadow`. **Nunca `translateY` en cards ni StatCards**.

CTA buttons (primario) sí tienen `box-shadow: 3px 3px 0 #1A1A17` y `transform` en hover/active — eso es intencional solo para botones de acción.

### Tokens de diseño

```
ink     #1A1A17   body text
soft    #79746B   secondary text
line    #E7E1D4   borders
surface #FCFAF6   card backgrounds
bg      #F4F0E8   app background
brand   #0E5C4A   verde primario
```

Tipografía: Archivo 900 (headings/eyebrow) · Space Mono (labels/números/monospaced) · Hanken Grotesk (body text, descripciones).

### Iconografía — sin emojis genéricos

**Nunca uses emojis genéricos en el chrome de producto** (nav, cards, headers, badges, botones). Los emojis del sistema "huelen" a IA y a plantilla, y rompen la identidad. Usa el set de iconos SVG de línea del DS: `viewBox="0 0 24 24"`, `stroke="currentColor"`, `strokeWidth` 2–2.2, `strokeLinecap="round"` (ver los `Icon*` de `components/app-shell.tsx` y `components/ui/pack-icons.tsx`). Para banderas de país, SVG propias simplificadas, nunca el emoji de bandera (ejemplo: `components/ui/pack-icons.tsx`).

**Excepción:** contenido generado por el usuario donde el emoji es la función — el picker del career site (`emoji-picker.tsx`, `career-site-editor.tsx`). Ahí el usuario elige; no es chrome nuestro.

---

## Deuda técnica conocida — no agraves

**Registro completo y vivo en [`docs/deuda-tecnica.md`](docs/deuda-tecnica.md)** — todo hallazgo que se decida no arreglar en el momento se anota ahí en el mismo commit que lo descubre (con severidad y puerta PR/ER). Al resolver un ítem, moverlo a "Resuelto" con el commit. Lo de abajo es solo el resumen de los patrones que no hay que propagar:

1. **`LIMIT 1` en companies** (~57 ocurrencias): muchas pages y API routes hacen `supabase.from("companies").select().limit(1)` en vez de resolverlo desde el membership. Corrígelo cuando toques el archivo; no propagarlo a código nuevo.
2. **`company_members` asume un membership por usuario**: el código asume que un usuario pertenece a una sola empresa (`.maybeSingle()`). La dirección es multi-tenant real; en código nuevo, siempre filtra por `company_id` explícito.
3. **Tipos Supabase desactualizados**: después de las migraciones 0017–0019, los tipos auto-generados de Supabase no están regenerados. Usa `as unknown as Record<string, unknown>` para campos nuevos hasta regenerar con `supabase gen types`.

---

## Decisiones de producto pendientes (confirmar antes de construir)

Estos temas requieren decisión explícita del producto antes de implementar:

- **Rating scale de desempeño**: ¿1-5 numérico, 1-10, o etiquetas cualitativas (Exceeds/Meets/Below)? Afecta schema de `performance_reviews`.
- **Taxonomía de motivos de descarte**: ¿Lista fija configurable por empresa o free-text? Afecta `application_events.reason`.
- **Proveedor de calendario para entrevistas**: ¿Google Calendar, Outlook, o solo gestión interna? Afecta `interviews` + integraciones.
- **Alcance del beta de payroll VE**: ¿Solo cálculo de nómina o también envío a bancos y generación de archivos IVSS/SSO/LPH? Afecta `pay_run_lines` + `payroll_exports`.
- **Eyebrow de Horas/Ausencias/Compensación/Calendario**: ¿Son sub-áreas de "Personas" (eyebrow = "Personas") o secciones propias del sidebar? Actualmente usan su propio nombre de área.
