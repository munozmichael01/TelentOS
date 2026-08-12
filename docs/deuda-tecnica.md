# Registro de deuda técnica

Registro vivo de deuda conocida y hallazgos no bloqueantes. **Regla:** todo hallazgo que se decide no arreglar en el momento se anota aquí en el mismo commit/PR que lo descubre — con severidad y con la puerta en la que deja de ser aceptable. Al resolverse, se mueve a la sección "Resuelto" con el commit.

Puertas: **PR** = bloquea "production-ready" · **ER** = bloquea "enterprise-ready" · **V1-OK** = aceptable indefinidamente salvo cambio de contexto.

Origen: `AUD-*` = auditoría técnica (doc en `handoff/`, solo local) · `P6-*` = validación del paso 6 de payroll · sin prefijo = descubierto en desarrollo.

## Pendiente

| ID | Qué | Dónde | Puerta | Notas |
|---|---|---|---|---|
| AUD-H5 | Design system inline: ~2.100 `style={{}}`, hex hardcodeados, componentes DS sin tokens | toda la UI; peores: `employees/[id]`, `pay-run-detail`, `team-panel` | ER | Fase 3 del plan de auditoría; pantallas payroll desbloqueadas desde paso 6 |
| AUD-M6 | Accesibilidad: 0 `aria-*`, 0 `htmlFor`, hit targets <40px | toda la UI | ER | Se resuelve en gran parte con AUD-H5 (EN 301 549 si se vende en Europa) |
| AUD-M7b | `select("*")` fuera de rutas payroll (~40 restantes) | `app/**`, `agents/**` | ER | **Dueño: pista A. Cuándo: pase ER** (con AUD-H5/M6 o sweep dedicado), no en hardening rápido — barrido mecánico de ~40 sitios con riesgo de regresión. Nómina/empleados ya corregidos |
| AUD-L3 | Naming mixto ES/EN en rutas (`/horas` vs `/timeoff`) | `app/(dashboard)/**` | V1-OK | Decisión de producto pendiente |
| RL-redis | Rate-limit: **código listo** (env-gated Upstash + fallback en memoria) | `lib/rate-limit.ts` | PR | Falta **añadir Vercel KV / Upstash** en prod (env `UPSTASH_REDIS_REST_URL/_TOKEN`, paso de Michael) para activarlo; hasta entonces sigue in-memory |
| IA-coste | Sin `max_tokens` por agente, modelo no configurable, sin presupuesto por empresa | `agents/core.ts`, `agent_runs` | PR | Backlog pista A #4; migración 0025 ya aplicada |
| P6-a | **Numeración legal per-empresa** del `slip_number` (formato `{period_month}-{n}` se repite entre empresas) | `payslips`, `runs/[id]/route.ts` | ER | La doble-generación de recibos **ya está cerrada** (unique `payslips.pay_run_line_id`, migr `0035`); lo que queda es la numeración legal, que va con los packs de país |
| REL-loop | React "Maximum update depth exceeded" en burst (dev/edge) | `RedirectBoundary` de Next (`redirect-boundary.js`) en RSC fetch fallido de un redirect | Monitor | **Mecanismo:** el `RedirectBoundary` de Next hace `router.replace` en un effect y entra en bucle cuando falla la carga del RSC payload del destino (`Failed to fetch RSC payload for .../login`). Contenido por React (~50 iters, cae a browser nav, el usuario llega a /login). NO es código propio (app-shell/effects limpios). **Downgrade de PR→Monitor (2026-07-11):** NO reproducible limpio single-origin. El camino representativo de prod (sesión expirada + full reload) **redirige a /login sin loop** — verificado. Los floats observados fueron en dev (HMR invalida chunks RSC) y en un repro de prod **contaminado cross-origin** (fetch a :3001 mientras servía :3002). Evidencia de impacto sistemático en prod real: débil. **Decisión:** no parchear auth a ciegas (prod auto-deploy, alto blast radius, fix no verificable sin repro). **Camino correcto:** añadir monitoreo de errores de cliente (Sentry/equiv) para tener señal real de si dispara para usuarios; fijar sólo con repro real o señal de prod. Ver OBS-monitoring |
| OBS-monitoring | Sin monitoreo de errores de cliente en prod (no Sentry/equiv) | global | PR | Con Vercel = prod y sin observabilidad, no sabemos si REL-loop u otros errores de cliente afectan a usuarios reales. Necesita DSN/cuenta del usuario. Habilita cerrar REL-loop con datos en vez de a ciegas |
| T11 | **Guardas de rol solo en el NAV, no en el servidor**: `app-shell` esconde el enlace de Candidatos a quien no le toca, pero `candidates/page.tsx`, `candidates/[id]` y `applications/[id]` no llevan `requireRole` — quien escriba la URL entra igual | `app/[locale]/employer/(workspace)/**` | **PR — ALTA** | La RLS aísla entre EMPRESAS, así que no hay fuga entre clientes; lo que no se impone es el reparto por rol DENTRO de la empresa. Salió al verificar el cierre del bucket de CV, donde `files/sign` tenía el mismo hueco (ya corregido exigiendo rol). Falta el barrido de páginas |
| T10 | Ruta plana en el bucket `logos` (`logo-{ts}-{nombre}`, sin carpeta de empresa) → la política de Storage no puede acotarla por inquilino | `components/features/company-form.tsx` | ER | Mitigado en migr. 0081: a `logos` le queda solo INSERT (nada actualiza ni borra logos), así que el daño posible es subir ficheros de más, no pisar los de otra empresa. Acotarlo de verdad exige ruta `{company_id}/…` y migrar los objetos |
| SEC-pwned | "Prevent use of leaked passwords" desactivado (Supabase Auth → Attack Protection) | Supabase Auth | PR | Valida contraseñas contra HaveIBeenPwned. **Solo disponible en plan Pro+** → se activará al lanzar con Pro. Los 3 toggles gratis (secure password/email change, min length 8) sí están activados |

## Resuelto

| ID | Qué | Commit |
|---|---|---|
| SEC-cvs | **El bucket `cvs` estaba abierto a cualquier cuenta autenticada**: `legacy_buckets_authenticated` era `for all` con el nombre del bucket como única condición, así que un candidato cualquiera podía listar el bucket entero, descargar CV ajenos, firmarles URLs y **sobrescribirlos**. Datos personales de terceros. Reproducido con sesión real antes de tocar. El bucket queda SIN políticas (todos los caminos del servidor van con service_role) y `files/sign` pasa a firmar con admin en vez de con la sesión del usuario | migr. `0081` |
| SEC-cvs-rol | `files/sign` comprobaba la empresa pero no el rol: un `employee` podía firmar el CV de cualquier candidato de su empresa llamando al endpoint a mano | ver T11 |
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

## Backlog producto — Job Board
- **"Publicar en incógnito" (rol confidencial):** flag POR-OFERTA (`jobs.board_hidden` o similar) para que una empresa oculte una oferta puntual del board público, manteniéndola en su career site. NO un toggle por-empresa (decisión 2026-07-19: todas las ofertas van al board por defecto = keystone). Caso borde para enterprise; sin construir aún.

## 2026-08 · Taxonomía y seeders (detectado durante el bloque 1 de Desempeño)

| # | Hallazgo | Severidad | Estado |
|---|---|---|---|
| T1 | Lecturas de Supabase **sin paginar** en los seeders: el corte a 1.000 filas dejaba mapas incompletos y **descartaba enlaces cargo↔skill en silencio** (`cook` acabó con 2 competencias de las 50 que da ESCO). | Alta | ✅ Resuelto: lectura paginada + red de seguridad por `esco_uri` + aviso por consola en vez de descarte mudo |
| T2 | `job_title_synonyms` sin índice único → los seeders duplicaban filas al reejecutarse. | Media | ✅ Resuelto (migr. 0071) |
| T3 | Sinónimos de ESCO **usurpando el nombre de otro cargo** ("cocinero" como sinónimo de `grill cook`): la búsqueda del término resolvía a cargos ajenos y dejaba fuera al genérico. | Alta | ✅ Resuelto (migr. 0068, 135 colisiones borradas) + regla documentada |
| T4 | `job_title_relations` generado con un `.slice(0, 600)` **global**: 600 filas para 219 de 590 cargos. | Media | ✅ Resuelto: top-N por cargo (`npm run build:relations`) |
| T5 | Áreas triplicadas en columnas de texto sin FK (`category`/`sector`/`category_key`), 305 de 506 cargos sin área. | Media | ✅ Resuelto (migr. 0065, tabla `job_categories` + FK). `category` y `sector` quedan **legado**: no usar en código nuevo |
| T6 | Números de migración **duplicados** (dos `0063`, dos `0064`) al trabajar dos frentes en paralelo. | Baja | ✅ Resuelto: renumerados a 0070/0071 |
| T7 | El callback de auth redirigía a `/dashboard`, ruta **inexistente** (todo cuelga de `/app/*`). | Media | ✅ Resuelto |
| T8 | 5 cargos observados sin ancla adecuada en ESCO, en `review` dentro de `data/taxonomy/market-titles.json`. | Baja | ⏳ Abierto (1–4 apariciones cada uno) |
| T9 | Sin infraestructura de test de **componentes** (ni testing-library ni jsdom): la UI solo se valida con `tsc` y a ojo. | Media | ⏳ Abierto — relevante ahora que Desempeño añade mucha UI |

## 2026-08 · Aislamiento multi-inquilino en consultas a `jobs`

| # | Hallazgo | Severidad | Estado |
|---|---|---|---|
| M1 | KPI "Ofertas activas" del dashboard sin filtro de empresa: mostraba **3.225** (el catálogo entero) a una empresa con **10**. La RLS no protege `jobs` porque el board necesita lectura pública de las activas. | **Alta** | ✅ Resuelto |
| M2 | `app/api/channels/report`: dos consultas a `jobs` sin scope — agregaba sectores y **listaba títulos de ofertas de otras empresas**. Peor que M1: no era un número, eran datos. | **Alta** | ✅ Resuelto |
| M3 | Recursión RLS reintroducida en las políticas de nómina (42P17). Mismo patrón que la migr. 0050. El test de regresión no cubría esas tablas. | **Alta** | ✅ Resuelto (migr. 0073) + 4 tablas añadidas al test |
| M4 | `employee_events` legible por toda la empresa: un empleado veía el expediente de sus compañeros. | **Alta** | ✅ Resuelto (migr. 0074) |

**Regla derivada** (en CLAUDE.md): toda consulta a `jobs` desde el admin filtra por `company_id`
explícitamente. Y toda pantalla con RLS se verifica **con la sesión del usuario real**, nunca con
service role: los datos pueden estar y el permiso no.

## 2026-08 · Portal del empleado v2 (autoservicio)

Abrir el portal a la escritura convirtió en agujeros reales varias políticas que eran solo
laxas mientras el único consumidor era el dashboard de RR.HH.

| # | Hallazgo | Severidad | Estado |
|---|---|---|---|
| P1 | `timer/start`, `timer/stop` y `time-entries` aceptaban `employee_id` **del cuerpo**: un empleado podía fichar por un compañero. | **Alta** | ✅ Resuelto (`lib/api-self.ts`) |
| P2 | `time_entries` y `timer_state` con una sola política `for all` de empresa: la jornada de todos era legible por cualquiera. | **Alta** | ✅ Resuelto (migr. 0075) |
| P3 | `absence_requests` igual, pero con escritura: un empleado podía poner su solicitud en `approved` — **aprobarse las vacaciones** — y borrar las de otros. | **Alta** | ✅ Resuelto (migr. 0076) |
| P4 | Bolsas (`employee_allowances`, `allowance_policies`) escribibles por cualquier miembro: uno se regala el saldo que después valida su propia solicitud. | **Alta** | ✅ Resuelto (migr. 0076) |
| P5 | `absence-requests/[id]/cancel` solo comprobaba la empresa: se podían cancelar las vacaciones de un compañero. | **Alta** | ✅ Resuelto |
| P6 | `calculate-days` tomaba `company_id` del cliente → se calculaba sobre los festivos de otra empresa. | Media | ✅ Resuelto |
| P7 | Claves i18n del fichaje escritas en `people.json`: resolvían a `People.Portal.clock` mientras la tarjeta pedía `Portal.clock`. Habría reventado en runtime. | Media | ✅ Resuelto |
| P8 | El `next` del callback de auth pasa por el router de next-intl: si el enlace ya trae locale, el destino se duplica y el usuario cae en un 404 mudo. | Media | ✅ Resuelto (se normaliza en el callback) |
| P10 | `employee_documents` y `onboarding_tasks` con una sola política `for all` de empresa: contratos y documentos de identidad de todos legibles —y borrables— por cualquier empleado. | **Alta** | ✅ Resuelto (migr. 0078) |
| P11 | El bucket `documents` tenía `authenticated_storage_all`: cualquier autenticado podía leer, sustituir y borrar el fichero de cualquiera **saltándose la API**. Arreglar solo la tabla no bastaba. | **Alta** | ✅ Resuelto (migr. 0079, por carpeta = employee_id) |
| P12 | `api/files/sign` comprobaba solo la EMPRESA del documento: un empleado podía firmar el contrato de un compañero pasando su id. | **Alta** | ✅ Resuelto (lee con la sesión del usuario) |
| P13 | El bucket `cvs` sigue abierto a cualquier autenticado, y eso incluye a los **candidatos**: hoy un candidato con cuenta puede leer el CV de cualquier otro. No se toca aquí porque el flujo de candidatura escribe con su propia sesión y acotarlo a ciegas rompería las inscripciones. | **Alta** | ⏳ Abierto — siguiente pasada |
| P9 | Una política de bolsa puede apuntar a un `allowance_type` **inactivo o sin tipos de ausencia asociados**: el saldo sale limpio ("0 usados") aunque el empleado tenga vacaciones aprobadas, porque descuentan de otra bolsa. Detectado con datos reales de la empresa demo. Nada en la UI lo avisa. | Media | ⏳ Abierto — falta un aviso en Ajustes › Ausencias |

### Duplicación eliminada de paso

| Qué | Dónde estaba | Ahora |
|---|---|---|
| `calcWorkingDays` | copiada palabra por palabra en `absence-requests` y `calculate-days` | `lib/absences/working-days.ts` |
| Cálculo de saldo | en línea en la ficha del empleado del admin | `lib/absences/balance.ts` (admin y portal, mismo número) |
| Tarjeta de saldo | ~90 líneas de markup en la ficha | `AllowanceBalanceCard` |
| Formulario de ausencia | modal del admin; el selector de tramo escrito **tres** veces | `AbsenceRequestForm` (`absence-panel.tsx`: 780 → 552 líneas) |
