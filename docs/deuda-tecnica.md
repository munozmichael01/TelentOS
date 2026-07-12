# Registro de deuda técnica

Registro vivo de deuda conocida y hallazgos no bloqueantes. **Regla:** todo hallazgo que se decide no arreglar en el momento se anota aquí en el mismo commit/PR que lo descubre — con severidad y con la puerta en la que deja de ser aceptable. Al resolverse, se mueve a la sección "Resuelto" con el commit.

Puertas: **PR** = bloquea "production-ready" · **ER** = bloquea "enterprise-ready" · **V1-OK** = aceptable indefinidamente salvo cambio de contexto.

Origen: `AUD-*` = auditoría técnica (doc en `handoff/`, solo local) · `P6-*` = validación del paso 6 de payroll · sin prefijo = descubierto en desarrollo.

## Pendiente

| ID | Qué | Dónde | Puerta | Notas |
|---|---|---|---|---|
| AUD-H6b | `notifyError` usa `window.alert` — falta sistema de toasts real | `lib/api-client.ts:35` | PR | El punto único ya existe; es cambiar la implementación |
| AUD-limit1 | `.limit(1)` sobre `companies` en vez de membership (~40 archivos) | `app/**`, `lib/**` (patrón correcto: `lib/api.ts`) | PR | Correctitud multi-tenant; ver CLAUDE.md "Deuda técnica" |
| AUD-H5 | Design system inline: ~2.100 `style={{}}`, hex hardcodeados, componentes DS sin tokens | toda la UI; peores: `employees/[id]`, `pay-run-detail`, `team-panel` | ER | Fase 3 del plan de auditoría; pantallas payroll desbloqueadas desde paso 6 |
| AUD-M6 | Accesibilidad: 0 `aria-*`, 0 `htmlFor`, hit targets <40px | toda la UI | ER | Se resuelve en gran parte con AUD-H5 (EN 301 549 si se vende en Europa) |
| AUD-M7b | `select("*")` fuera de rutas payroll (~40 restantes) | `app/**`, `agents/**` | ER | Las rutas de nómina/empleados ya se corrigieron en pasos 4-5 |
| AUD-M5b | `company_members` con `.maybeSingle()` — rompe con 2 memberships por usuario | `lib/api.ts:44` | ER | Mina si se activa multi-empresa real |
| AUD-L3 | Naming mixto ES/EN en rutas (`/horas` vs `/timeoff`) | `app/(dashboard)/**` | V1-OK | Decisión de producto pendiente |
| RL-redis | Rate-limit en memoria — no sobrevive multi-instancia ni redeploys | `lib/rate-limit.ts` | PR | Portar a Redis/Upstash antes de producción real |
| IA-coste | Sin `max_tokens` por agente, modelo no configurable, sin presupuesto por empresa | `agents/core.ts`, `agent_runs` | PR | Backlog pista A #4; migración 0025 ya aplicada |
| P6-a | `slip_number` sin unique en DB; formato `{period_month}-{n}` se repite entre empresas | `payslips` (migr. 0016), `runs/[id]/route.ts` | ER | Vale hasta que haya numeración legal de recibos (packs de país) |
| REL-loop | React "Maximum update depth exceeded" floodea el buffer de consola (~450 entradas) | sin localizar (stack solo muestra `RedirectBoundary`/`AppRouter` de Next) | PR | Confirmado que **precede al `<Toaster/>`** (estaba en logs previos a su creación) y que el Toaster no lo genera (interceptor no cazó ninguno con él montado). NO reproducible bajo demanda: navegación cliente ida/vuelta = 0 warnings. Correlaciona con churn de reload/redirect (expiración de sesión). Revisados `app-shell` y effects de `pay-run-detail`/`career-site-editor`/`dashboard-client`: deps correctas. Pendiente: reproducir de forma determinista para pinchar el componente (probable un effect que hace router redirect en bucle bajo cierta condición de auth) |

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
