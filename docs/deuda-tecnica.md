# Registro de deuda técnica

Registro vivo de deuda conocida y hallazgos no bloqueantes. **Regla:** todo hallazgo que se decide no arreglar en el momento se anota aquí en el mismo commit/PR que lo descubre — con severidad y con la puerta en la que deja de ser aceptable. Al resolverse, se mueve a la sección "Resuelto" con el commit.

Puertas: **PR** = bloquea "production-ready" · **ER** = bloquea "enterprise-ready" · **V1-OK** = aceptable indefinidamente salvo cambio de contexto.

Origen: `AUD-*` = auditoría técnica (doc en `handoff/`, solo local) · `P6-*` = validación del paso 6 de payroll · sin prefijo = descubierto en desarrollo.

## Pendiente

| ID | Qué | Dónde | Puerta | Notas |
|---|---|---|---|---|
| AUD-H5 | Design system inline: ~2.100 `style={{}}`, hex hardcodeados, componentes DS sin tokens | toda la UI; peores: `employees/[id]`, `pay-run-detail`, `team-panel` | ER | Fase 3 del plan de auditoría; pantallas payroll desbloqueadas desde paso 6 |
| AUD-M6 | Accesibilidad: 0 `aria-*`, 0 `htmlFor`, hit targets <40px | toda la UI | ER | Se resuelve en gran parte con AUD-H5 (EN 301 549 si se vende en Europa) |
| AUD-M7b | `select("*")` fuera de rutas payroll (~40 restantes) | `app/**`, `agents/**` | ER | Las rutas de nómina/empleados ya se corrigieron en pasos 4-5 |
| AUD-L3 | Naming mixto ES/EN en rutas (`/horas` vs `/timeoff`) | `app/(dashboard)/**` | V1-OK | Decisión de producto pendiente |
| RL-redis | Rate-limit: **código listo** (env-gated Upstash + fallback en memoria) | `lib/rate-limit.ts` | PR | Falta **añadir Vercel KV / Upstash** en prod (env `UPSTASH_REDIS_REST_URL/_TOKEN`, paso de Michael) para activarlo; hasta entonces sigue in-memory |
| IA-coste | Sin `max_tokens` por agente, modelo no configurable, sin presupuesto por empresa | `agents/core.ts`, `agent_runs` | PR | Backlog pista A #4; migración 0025 ya aplicada |
| P6-a | **Numeración legal per-empresa** del `slip_number` (formato `{period_month}-{n}` se repite entre empresas) | `payslips`, `runs/[id]/route.ts` | ER | La doble-generación de recibos **ya está cerrada** (unique `payslips.pay_run_line_id`, migr `0035`); lo que queda es la numeración legal, que va con los packs de país |
| REL-loop | React "Maximum update depth exceeded" en burst (dev/edge) | `RedirectBoundary` de Next (`redirect-boundary.js`) en RSC fetch fallido de un redirect | Monitor | **Mecanismo:** el `RedirectBoundary` de Next hace `router.replace` en un effect y entra en bucle cuando falla la carga del RSC payload del destino (`Failed to fetch RSC payload for .../login`). Contenido por React (~50 iters, cae a browser nav, el usuario llega a /login). NO es código propio (app-shell/effects limpios). **Downgrade de PR→Monitor (2026-07-11):** NO reproducible limpio single-origin. El camino representativo de prod (sesión expirada + full reload) **redirige a /login sin loop** — verificado. Los floats observados fueron en dev (HMR invalida chunks RSC) y en un repro de prod **contaminado cross-origin** (fetch a :3001 mientras servía :3002). Evidencia de impacto sistemático en prod real: débil. **Decisión:** no parchear auth a ciegas (prod auto-deploy, alto blast radius, fix no verificable sin repro). **Camino correcto:** añadir monitoreo de errores de cliente (Sentry/equiv) para tener señal real de si dispara para usuarios; fijar sólo con repro real o señal de prod. Ver OBS-monitoring |
| OBS-monitoring | Sin monitoreo de errores de cliente en prod (no Sentry/equiv) | global | PR | Con Vercel = prod y sin observabilidad, no sabemos si REL-loop u otros errores de cliente afectan a usuarios reales. Necesita DSN/cuenta del usuario. Habilita cerrar REL-loop con datos en vez de a ciegas |
| SEC-pwned | "Prevent use of leaked passwords" desactivado (Supabase Auth → Attack Protection) | Supabase Auth | PR | Valida contraseñas contra HaveIBeenPwned. **Solo disponible en plan Pro+** → se activará al lanzar con Pro. Los 3 toggles gratis (secure password/email change, min length 8) sí están activados |

## Resuelto

| ID | Qué | Commit |
|---|---|---|
| AUD-H1 | Festivos apuntaban a ruta inexistente | `3346730` |
| AUD-H6a | Mutaciones fire-and-forget → helper `apiFetch` con error visible | `3346730` |
| AUD-H3 | `careers/apply` sin rate-limit, con data poisoning | `b2cafd8` |
| AUD-M1 | Upload de career site sin validación MIME/tamaño | `b2cafd8` |
| AUD-H2 | Fuga multi-tenant en agentes de canales | `663b068` |
| AUD-M2 | Career site editable por cualquier rol | `663b068` |
| AUD-M3/L1 | Endpoints sin consumidor y componentes muertos | `123dc77` |
| AUD-H4 | Prisma abandonado — eliminado del repo | Lote 1 |
| AUD-M4 | Formatters duplicados → `lib/format.ts` (`formatMoney` por currency) | Lote 1-2 |
| AUD-L2 | `any` en cálculo de allowances de employees/[id] | `b168c04` |
| AUD-M5/M7/L4 (payroll) | Guards unificados, selects explícitos y orden de tenancy en rutas de nómina | pasos 4-5 (`5c9e...f99697f`) |
| AUD-agent_runs | Log de agentes roto en silencio (RLS) → service_role + `company_id` | `374ba4e` + migr. 0025 |
| ENG-tests | Motor: lógica pura extraída a `compute.ts` + 28 tests (AC-2a/2b/2d/2e/2g/2h) + verificación runtime | `7d64d1e` |
| AUD-H6b | `notifyError` → sistema de toasts real (bus + `<Toaster/>`), fin del `window.alert` | `8d6b117` |
| P6-b | Inserts de payslips/exports sin comprobar error → 500 + payslips antes del flip a approved | `493ef69` (pista B) |
| DS-emojis | Barrido de emojis genéricos del chrome → iconos SVG del DS + regla en CLAUDE.md | `653f6cd`, `159de2` (pista B), `77bc08e` |
| AUD-limit1 | Barrido de `.limit(1)` en `companies` → `getCompanyId()`/`getCompany()` por membresía (40 usos, 23 rutas) | 2026-07-14 |
| AUD-M5b | Blindado el modelo *1 user = 1 empresa*: unique en `company_members.user_id` + guard de invitación (rechaza email que ya pertenece a otra empresa) | `0035` |
