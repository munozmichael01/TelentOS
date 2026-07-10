# Auditoría técnica — TalentOS

> **Fecha:** 2026-07-10 · **Alcance:** revisión de deuda técnica pre-escalado.
> Árbol completo revisado: 38 páginas, 78 route handlers, 63 componentes, 15 libs, 5 agentes, 18 migraciones y el schema de Prisma.

**TL;DR:** la seguridad de datos está sorprendentemente bien (RLS completa y endurecida, signed URLs, SSRF protegido, secretos fuera del repo), pero el design system existe solo en papel (el 85% del styling es inline con hex hardcodeados, incluso dentro de los propios componentes del DS), Prisma está abandonado como espejo (18 modelos vs 46 tablas reales), y hay una funcionalidad rota en producción (festivos de empresa) más un vector real de fuga multi-tenant en dos agentes.

---

## Hallazgos por severidad

### 🔴 Alta

#### H1 · Endpoint roto: gestión de festivos no funciona
*Interacciones muertas / APIs* — Esfuerzo: **S** · **QUICK WIN**

`components/features/absence-settings-panel.tsx:993` y `:1014` llaman a `/api/company-holidays` y `/api/company-holidays/{id}`, pero la ruta real es `app/api/company/holidays/`. Crear y borrar festivos devuelve 404 — y como el DELETE es fire-and-forget sin `res.ok`, la UI hace `router.refresh()` y falla en silencio. Roto en producción.

**Fix:** corregir las dos URLs y añadir manejo de error.

#### H2 · Fuga multi-tenant en agentes de canales
*Seguridad* — Esfuerzo: **S/M**

- `agents/agent-channel-analyst/tools.ts:27`: `queryChannelData` usa `createAdminClient()` (bypassa RLS) y agrega `applications` y `campaigns` de **todas** las empresas, sin filtro `company_id`.
- `agents/agent-channel-optimizer/tools.ts:55`: `get_job_channel_performance` acepta un `job_id` arbitrario con admin client — la empresa B puede extraer métricas de candidaturas de una oferta de la empresa A.
- Los endpoints que los exponen (`app/api/agents/channel-analyst/route.ts`, `app/api/agents/channel-optimizer/route.ts`) solo exigen sesión (`requireUser`), sin rol ni empresa.

Hoy el producto opera como workspace único, así que el impacto práctico es limitado — pero ya existe `company_members` + RLS por empresa, o sea que multi-tenant es la dirección.

**Fix:** pasar `companyId` desde `requireApiRole` a los tools y filtrar por empresa (contraste: `agents/agent-candidate-analyzer/tools.ts:5` lo hace bien usando el cliente RLS).

#### H3 · `/api/careers/apply`: público, sin rate-limit, y con data poisoning de candidatos
*Seguridad* — Esfuerzo: **M**

`app/api/careers/apply/route.ts` usa service_role y:

- No tiene rate-limiting ni captcha: cualquiera puede crear candidatos + subir ficheros de 8MB en bucle (líneas 33–40).
- El dedupe por email es **global** (líneas 45–49) y la rama de update (líneas 73–79) sobrescribe `name`, `phone`, `location` y `cv_url` del candidato existente. Cualquiera que conozca el email de un candidato puede reemplazar su CV y datos — y ese CV envenenado es el que verá el recruiter vía `files/sign`.
- No valida formato de email ni content-type del CV (acepta cualquier binario).

**Fix:** rate-limit (Upstash/middleware o al menos por IP+email), validar email y MIME del CV, y versionar `cv_url` por aplicación en vez de mutar el candidato global.

#### H4 · Prisma schema abandonado: 18 modelos vs 46 tablas
*Datos* — Esfuerzo: **M**

`prisma/schema.prisma` no tiene nada de payroll (9 tablas), time tracking (`time_entries`, `timer_state`, `work_schedule_*`), ausencias (`absence_*`, `allowance_*`), compliance, career site, ni `company_members`. Peor: declara `Timesheet` (línea 261) y `TimeOffRequest` (línea 273), tablas **borradas** en `supabase/migrations/0004_drop_legacy_tables.sql`. El "espejo tipado" del stack no espeja nada desde hace ~15 migraciones; `prisma migrate dev` contra esta DB sería destructivo.

**Fix:** decidir — o `prisma db pull` y regenerarlo como espejo real, o eliminarlo del stack (con `DATABASE_URL` y el script `db:prisma`) y quedarse solo con los tipos de `lib/types.ts`. **Recomendación: eliminarlo** — `supabase/migrations` es la fuente de verdad real y `lib/types.ts` el contrato.

#### H5 · Design system inline: 2.156 `style={{}}` vs 340 `className`
*Estilos* — Esfuerzo: **L**

`tailwind.config.ts` define la paleta completa (brand/coral/lime/paper/surface/ink/soft/line, estados, radios `r-sm`–`r-xl`, sombras, fuentes) y casi nadie la usa. Hay ~1.500 hex hardcodeados en TSX, 254 declaraciones inline de `fontFamily: 'Archivo'` y 252 de `'Space Mono'`.

Peores archivos:

| Archivo | Hex inline | `style={{}}` |
|---|---|---|
| `app/page.tsx` (landing — quizá one-off intencional, **a confirmar**) | 279 | 216 |
| `app/(dashboard)/employees/[id]/page.tsx` | 171 | 144 |
| `components/features/pay-run-detail.tsx` | 49 | 171 |
| `components/features/career-site-editor.tsx` | 35 | 121 |
| `components/features/team-panel.tsx` | 46 | 95 |

Lo más revelador: **los propios componentes del DS hardcodean** — `components/stat-card.tsx:17-31` y `components/page-header.tsx:22-31` usan `#FCFAF6`, `#E7E1D4`, `#79746B` en vez de tokens. Un rebrand o dark mode hoy es intocable.

**Nota:** `app/globals.css` ya expone la paleta como CSS vars (`--surface`, `--line`…) "para estilos inline" — la migración barata es sustituir hex por vars primero, clases Tailwind después.

#### H6 · Mutaciones fire-and-forget: errores tragados en flujos de aprobación
*Riesgos / patrones* — Esfuerzo: **M** · **QUICK WIN parcial**

Ninguna de estas llamadas comprueba `res.ok`; si la API devuelve 403/500, la UI refresca como si hubiera funcionado:

- Aprobar/cancelar ausencias — `components/features/absence-panel.tsx:630,637`
- Borrar tipos de ausencia y policies — `components/features/absence-settings-panel.tsx:326`, `:649`
- Borrar tareas de onboarding — `components/features/onboarding-panel.tsx:47`
- Acknowledge de violaciones — `components/features/compliance-settings-panel.tsx:107`
- Borrar templates de horario — `components/features/schedule-settings-panel.tsx:426`
- Borrar time entries — `components/features/time-tracking-panel.tsx:333`

En un HRIS donde "aprobé esa ausencia" tiene consecuencias de nómina, esto es serio. Hay además 17 `catch` vacíos (algunos legítimos, p. ej. `lib/supabase/server.ts:22`).

**Fix:** un helper `apiFetch()` en `lib/` que lance/toastee en error, y migrar las ~20 llamadas.

### 🟠 Media

#### M1 · Upload del career site: bucket público sin validación
*Seguridad* — Esfuerzo: **S** · **QUICK WIN**

`app/api/career-site/upload/route.ts:16-27`: cualquier usuario autenticado sube **cualquier** fichero (sin límite de tamaño ni MIME) a un bucket público y recibe URL permanente — hosting gratuito de malware con tu dominio de Supabase. Además `createBucket` se ejecuta en cada request.

**Fix:** allowlist de MIME de imagen, límite ~2MB, y crear el bucket en migración.

#### M2 · Career site editable/publicable por cualquier miembro
*Seguridad / RBAC* — Esfuerzo: **S** — **a confirmar**

`app/api/career-site/route.ts` (PATCH), `publish` y `translate` no usan ningún guard de rol — solo middleware + RLS `member_rw` (`supabase/migrations/0014_rls_complete.sql:494`). Un usuario con rol `employee` puede editar y publicar la web pública de empleo. Si es intencional, documentarlo; si no, `requireApiRole(["owner","hr_admin","recruiter"])`.

#### M3 · ~13 endpoints sin consumidor
*APIs* — Esfuerzo: **S**

Sin ninguna referencia en el front (verificado también contra llamadas server-side):

- `api/calendar/absences`, `api/calendar/holidays`
- `api/compensation/balance`
- `api/employees/clock-status`
- `api/employees/[id]/allowance-balance`, `.../allowances`, `.../scheduled-hours`, `.../schedules`
- `api/time-entries/summary`, `api/timer/status`
- `api/absence-requests/[id]` (GET/PUT)
- `api/payroll/runs` GET (la página `app/(dashboard)/payroll/runs/page.tsx:21` consulta Supabase directo)
- `api/compliance/violations` GET (ídem `app/(dashboard)/settings/compliance/page.tsx:15`)
- `api/compliance/analyze` — **a confirmar** si algo externo (cron) lo invoca.

Cada uno es superficie de ataque autenticada que nadie mantiene. **Fix:** borrar, o mover su lógica a donde se consume.

#### M4 · Duplicación sistemática de helpers
*Código duplicado* — Esfuerzo: **S** · **QUICK WIN**

- `AVATAR_PALETTES` + `avatarPalette` copiado **6 veces**: `app/(dashboard)/employees/[id]/page.tsx:14`, `app/(dashboard)/candidates/page.tsx:10`, `app/(dashboard)/payroll/profiles/page.tsx:10`, `app/(dashboard)/employees/page.tsx:11`, `components/features/pipeline-board.tsx:30`, `components/features/pay-run-detail.tsx:30`.
- `initials()` reimplementado 4 veces pese a existir en `lib/utils.ts:56` (`components/app-shell.tsx:211`, `components/features/pay-run-detail.tsx:37`, `app/(dashboard)/payroll/profiles/page.tsx:19`, `components/features/absence-panel.tsx:97`).
- `fmtUSD` ×3, `fmt(min)` ×3, `fmtDate`/`formatDate` ×4 — ~20 formatters locales en total.
- **Bug latente:** `fmtUSD` hardcodea `$`/`en-US` mientras `pay_runs` tiene columna `currency`.

**Fix:** `lib/format.ts` + componente `<Avatar>`.

#### M5 · Tres patrones de auth de API conviviendo
*Consistencia / seguridad* — Esfuerzo: **M**

(a) `requireApiRole` (payroll, employees, compliance config, approve/reject), (b) `requireUser` + RLS (la mayoría), (c) **ningún guard** — `getCompany()` a pelo (career-site GET/PATCH/publish/translate). Funciona porque RLS es el backstop, pero no hay forma de saber qué rutas son sensibles sin leerlas una a una.

Relacionado:

- `lib/api.ts:44-48` resuelve membership con `.maybeSingle()` sobre `user_id` — con 2 memberships devolvería error→403 (**a confirmar**: asunción documentada de workspace único, pero es una mina si se activa multi-empresa).
- El middleware redirige llamadas API no autenticadas a `/login` con 307 HTML en vez de 401 JSON (`middleware.ts:38-42`).

#### M6 · Accesibilidad esencialmente ausente
*Riesgos* — Esfuerzo: **L**

- **Cero** atributos `aria-*` y **cero** `htmlFor` en toda la app (24 `<label>` sin asociar).
- 188 `<button>` crudos en 35 archivos vs 46 usos de `<Button>`.
- Hit targets del sidebar de ~30px de alto (`components/app-shell.tsx:365`, `padding: 6px 10px`).
- Tipografías de 9–10.5px por todas partes; hovers manuales con `onMouseEnter` (×7) sin equivalente de foco de teclado.

Para un HRIS que usarán empleados de toda una empresa, esto acabará siendo requisito de compliance (EN 301 549 si se vende en Europa).

#### M7 · `select("*")` ×51 + sobre-exposición de payload
*Datos* — Esfuerzo: **M**

51 usos de `select("*")` en app/lib/agents. En tablas con PII/nómina (`employees`, `pay_runs` en `app/api/payroll/runs/[id]/route.ts:20`, `career_site_pages` que se devuelve entero en `app/api/career-site/route.ts:10`) el contrato de datos real queda oculto y cada columna nueva se filtra automáticamente al cliente.

**Fix:** selects explícitos al menos en las rutas que devuelven datos de empleados/nómina.

### 🟡 Baja

#### L1 · Componentes y deps muertos — Esfuerzo: **S** · **QUICK WIN**

- `components/ui/table.tsx` y `components/ui/progress.tsx`: 0 imports (HairlineTable ganó).
- Con progress muere la dep `@radix-ui/react-progress`.
- El export `AgentHint` en `components/agent-hint.tsx` no se usa (solo `AgentPanel`).

#### L2 · 38 `any`/`as any`, 30 concentrados en un archivo — Esfuerzo: **M**

`app/(dashboard)/employees/[id]/page.tsx:179-220`: todo el cálculo de balances de allowances opera sobre `any` — justo la lógica de negocio más delicada de la página. Los tipos existen en `lib/types.ts` (592 líneas); es cuestión de usarlos.

#### L3 · Naming mixto ES/EN en rutas — Esfuerzo: **M** — **a confirmar** (¿decisión de producto?)

`/horas` y `/canales` conviven con `/timeoff`, `/candidates`, `/payroll`. Además `app/(dashboard)/timesheets/page.tsx` es solo un redirect legacy a `/horas`.

#### L4 · Payroll: queries antes de validar tenancy — Esfuerzo: **S**

`app/api/payroll/runs/[id]/route.ts:16-40`: consulta lines/audit/exports por `pay_run_id` con admin client en paralelo **antes** de comprobar que el run pertenece a la empresa. No hay fuga (devuelve 404 si no), pero son queries desperdiciadas y un refactor descuidado la convertiría en fuga. Validar el run primero.

#### L5 · Radios y tamaños inline inconsistentes — (se resuelve con H5)

`borderRadius` inline de 10/11/12/13/14/15/16px conviviendo, cuando el config define exactamente 8/11/14/18. Títulos de tarjeta entre 13 y 16px según pantalla.

---

## ✅ Lo que está bien (para no romperlo)

- **RLS completa y bien pensada**: `0014_rls_complete.sql` + `0015_rls_hardening.sql` cubren aislamiento por `company_members` incluso en storage; payroll con políticas por rol (`0016_payroll.sql`).
- **`app/api/files/sign/route.ts`**: resuelve paths server-side desde la DB y verifica tenancy — patrón correcto.
- **SSRF en `app/api/jobs/import/route.ts:23`**: validación de protocolo, IPs privadas y DNS rebinding. Poco común verlo bien hecho.
- Secretos fuera del repo, buckets de CVs/documentos privados, protección por layouts (`settings/`, `timeoff/`, `horas/`) coherente.
- Cero `console.log` en producción, cero `href="#"`, cero onClick placeholder — la UI que existe está cableada de verdad.

---

## (a) Top 10 prioridades

1. **H1** — Arreglar `/api/company-holidays` (roto en prod, 2 líneas).
2. **H3** — Rate-limit + validación + fin del data poisoning en `careers/apply`.
3. **H2** — Scoping por empresa en agentes channel-analyst/optimizer.
4. **H6** — Helper `apiFetch` con manejo de errores y migrar las ~20 mutaciones fire-and-forget.
5. **M1** — Validar MIME/tamaño en `career-site/upload`.
6. **H4** — Decidir el destino de Prisma (regenerar o eliminar).
7. **M5** — Unificar en `requireApiRole` como único guard de rutas sensibles (incluye M2).
8. **M4 + L1** — Centralizar formatters/avatar/initials y borrar componentes/deps muertos.
9. **M3** — Borrar los ~13 endpoints sin consumidor.
10. **H5** — Arrancar la migración de estilos inline → tokens (empezando por StatCard/PageHeader y las 3 pantallas peores).

## (b) Plan de remediación por fases

### Fase 0 — Parar el sangrado (1–2 días)
H1 (fix URL festivos) · M1 (upload) · L4 · borrar L1. Todo S, sin riesgo de regresión.

### Fase 1 — Seguridad y contratos (1 semana)
H3 (apply endpoint) · H2 (agentes) · M2/M5 (un solo patrón de guard, documentado en CLAUDE.md) · M7 en rutas de nómina/empleados. Añadir un test de humo por endpoint sensible.

### Fase 2 — Fiabilidad y deduplicación (1 semana)
H6 (`lib/apiFetch` + toasts de error) · M4 (`lib/format.ts`, `<Avatar>`, y `fmtUSD`→formateo por `currency`) · M3 (borrar endpoints muertos) · H4 (Prisma: recomendado eliminarlo) · L2 (tipar employees/[id]).

### Fase 3 — Design system real (2–3 semanas, incremental)
H5 en tres pasos:
1. Tokenizar los componentes DS (StatCard, PageHeader, HairlineTable) con las CSS vars que ya existen en globals.css.
2. Crear los primitivos que faltan (`<Avatar>`, `<Pill>` unificando StatusBadge/Pill/fit-badge/role-badge, `<CardShell>`).
3. Migrar pantalla a pantalla empezando por employees/[id], pay-run-detail y team-panel.

En paralelo: M6 (labels, focus-visible y hit targets ≥40px se resuelven casi gratis al pasar a componentes).

### Fase 4 — Pulido (continuo)
L3 (unificar idioma de rutas con redirects) · resto de `select("*")` · a11y audit con axe.

## (c) Salud general

**6/10 — backend de seguridad notablemente maduro para la etapa del producto (RLS, tenancy, storage), lastrado por un frontend que ignora su propio design system, contratos de datos rotos (Prisma) y errores silenciados en flujos críticos de RR.HH.; nada estructuralmente podrido, pero hay que pagar la deuda de estilos antes de que se dupliquen las pantallas.**
