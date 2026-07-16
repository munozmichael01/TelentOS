# Sistema de agentes — Documento técnico

> **Regla de mantenimiento:** este documento se actualiza **en el mismo PR/commit** que añade o cambia un agente, una tool o una regla del core. Un agente que no está aquí no existe. La contraparte funcional (lenguaje de producto, para el equipo) vive en Notion → Funcionalidades actuales → "Agentes IA".

---

## 1. Arquitectura: el core (`agents/core.ts`)

Todo agente pasa por `runAgent<T>(opts)`. Lo que el core garantiza, agente por agente, sin que cada uno lo reimplemente:

| Garantía | Mecanismo |
|---|---|
| **Nunca escribe en BD** | Invariante de diseño: los agentes proponen; la persistencia ocurre solo en endpoints de confirmación con humano delante. |
| **Output validado** | `validate:` (schema zod `.parse`) — output inválido → **1 reintento in-conversation** con el error como feedback → si reincide, fallback. Un JSON roto no llega jamás a la UI. |
| **Degradación elegante** | `fallback:` heurístico determinista obligatorio — el producto funciona sin `OPENAI_API_KEY` (y es la baseline de los evals). |
| **Techo de coste/latencia** | `max_tokens` (default 1024; override por agente). |
| **Modelo por tarea** | `model:` override — extracción/redacción → `gpt-4o-mini`; razonamiento/chat → `gpt-4o` (doc de coste §6.1). |
| **Auditoría + telemetría** | Cada invocación → `agent_runs` (service_role, `company_id`) con `_usage`: tokens in/out, nº de turnos, `truncated`, modelo. Base del presupuesto por empresa. |

**Checklist para crear un agente nuevo:** carpeta `agents/agent-<nombre>/` con `prompt.ts` + `index.ts` (schema zod + `runAgent` + fallback) + `tools.ts` si consulta datos · endpoint en `app/api/agents/<nombre>/` con `requireApiRole` · superficie según la doctrina del DS (§4) usando los componentes canónicos · eval en `evals/` antes de tocar el prompt dos veces · **fila en la tabla del §2 de este doc**.

## 2. Inventario de agentes

**Tipo** (ver la guía funcional en Notion → 🤖 Agentes IA): **A** = operativo, *produce trabajo* (sub-formas: generador · extractor · analizador · revisor); **B** = consulta, *solo responde*. Anexos: *proactivo* = salta solo (cron); *det+redactor* = las reglas calculan el hecho, la IA solo redacta. **Regla: solo un tipo A cuenta como "cubrir" un flujo** — una consulta (B) da acceso, no hace el trabajo.

| Agente | Tipo | Modelo | Qué hace | Superficie | Eval |
|---|---|---|---|---|---|
| `cv-parser` | A · extractor | mini | Extrae perfil estructurado del CV (skills→catálogo, experiencias, idiomas CEFR, educación) | Modal del candidato en inscripción + "Extraer del CV" admin | ✅ `npm run eval:cv` (5/6) |
| `assistant` | **B · consulta** | 4o | **Punto central conversacional** — packs de tools por vertical con RBAC | Drawer global (sparkle topbar + ⌘J + `assistant:ask` desde módulos), chip de contexto | ✅ `npm run eval:assistant` (6/6, 3 roles) |
| `payroll-copilot` | A · revisor (det+redactor) | mini | Redacta el resumen de la revisión pre-aprobación (detectores en `lib/payroll/copilot.ts`) | "Revisión de la corrida" en pay-run-detail (B-5: solo comparativo + colapso a tabla; colapsable, no cerrable) | ✅ 13 vitest + `npm run eval:payroll` (3/3) |
| `candidate-analyzer` | A · analizador | 4o | Lectura cualitativa del candidato explicando el fit determinista (`lib/fit-explain.ts`) | Panel de análisis en la ficha | ✅ `npm run eval:candidate` (3/3; línea roja: sin veredicto contratar/descartar) |
| `job-writer` | A · generador | 4o | Borrador de oferta desde una frase + mejora de campos | "Redacción asistida" en Nueva oferta (B-6/B-7); **banda salarial → `FieldProposal.Range` (B-7b), skills → `FieldProposal.Multi` (B-7c)** — verificados en vivo (`bcbf52a`) | ✅ `npm run eval:jobwriter` (3/3; secciones, 4–8 skills, tono) |
| `channel-optimizer` | A · generador | 4o | Plan de distribución (canales, presupuesto, copy) | Pestaña Distribución de la oferta | ✅ `npm run eval:channel` (2/2; invariante: reparto ≤ presupuesto) |
| `channel-analyst` | — (retirado) | — | **RETIRADO como superficie** (2026-07-13): Canales abre el drawer del assistant con chip precargado; su `queryChannelData` vive como tool del assistant. Endpoint `/api/agents/channel-analyst` deprecado sin consumidores — eliminar en próxima limpieza | — | — |
| `onboarding-builder` | A · generador | 4o | Checklist de incorporación por rol/departamento | Ficha del empleado | ✅ `npm run eval:onboarding` (2/2; ≥3 tareas con responsable+fecha) |
| `career-writer` | A · generador | mini | Genera TODO el contenido redactable del career site de una vez desde el intake (hero, about, métricas, cultura, beneficios, qué buscamos, FAQs) — bloques 🟢, fiel al intake (no inventa) | `CareerAIPanel` (entrada única del Editor); intake → `POST /api/agents/career-writer` | ✅ verificado E2E (12 claves, valores/métricas fieles) |
| `company-parser` | A · extractor | mini | "Autorrellenar el career site" desde **web o documento** (PDF/Word): extrae perfil (about/valores/beneficios/métricas) del texto para poblar el intake — patrón cv-parser, EXTRAE no inventa | Import del `CareerAIPanel` (URL + adjuntar PDF/Word) → `POST /api/agents/company-parser` (Node runtime). **Seguridad**: fetch anti-SSRF con `assertPublicHost` en `lib/safe-fetch.ts` + rate-limit 20/10min por empresa; docs vía `lib/doc-text.ts` (unpdf/mammoth) | ✅ verificado E2E (SSRF, PDF, rate-limit, extracción fiel) |
| `dashboard-insights` | A · proactivo (det+redactor) | mini | Redactor del motor de señales (determinista calcula) | "Sugerencias del agente" en dashboard **+ cron diario** (plano proactivo) | ❌ |

Fuera del framework (deuda): `career-site/translate` (gpt-4o directo, sin auditoría) — meter a `runAgent`.

**Motor de insights → cron (plano proactivo, 2026-07-14).** La lógica de señales vive en `lib/insights/generate.ts` (`generateInsightsForCompany(db, companyId)`): calcula señales deterministas (scope+entidades+acción), el LLM SOLO redacta el texto **vía `runAgent`** (antes era `new OpenAI()` directo → se saltaba presupuesto y auditoría; ahora ambos aplican), y persiste en `agent_insights`. Dos disparadores comparten ese generador: el refresh manual del dashboard (`POST /api/agents/dashboard-insights/refresh`, ahora `requireApiRole`→companyId, no `.limit(1)`) y el **cron** (`GET /api/cron/insights`, barre TODAS las empresas). El cron se auth por `CRON_SECRET` (bearer; `/api/cron/*` excluido del middleware de sesión), es fail-closed (sin secreto → 401) y resiliente (fallo de una empresa no aborta el resto). Coste acotado: solo se invoca al LLM cuando hay señales reales + presupuesto por empresa → empresas vacías cuestan $0. `vercel.json` lo agenda diario 06:00 UTC. **Requiere `CRON_SECRET` en el entorno de Vercel (Production) para activarse.** `applications` no tiene `company_id`: el generador scopea vía `jobs!inner` + `jobs.company_id` (crítico bajo admin client sin RLS). **El patrón de cron (auth, estructura, casos actuales y candidatos) vive en [`docs/cron.md`](cron.md)** — este de insights es la plantilla de una familia (baseline salarial §8, alerta de gasto §9.1, señales por módulo).

## 3. Tools del Asistente — qué son y cómo se gobiernan

**Una tool es una función de solo-lectura con contrato**: nombre + descripción (lo que el LLM lee para decidir usarla) + parámetros tipados + una query cerrada por `companyId` **del guard, nunca del cliente** (lección H2). El asistente no "sabe" datos: **solo sabe llamar tools**; si no hay tool, no hay respuesta — por eso el inventario de tools ES el mapa de capacidades del asistente.

| Tool | Responde a | RBAC |
|---|---|---|
| `get_headcount` | plantilla activa, por departamento | todos |
| `search_employees` | buscar empleados por nombre/depto/estado | todos |
| `get_employee` | ficha de una persona + ausencias próximas (+ compensación) | comp. solo owner/hr_admin |
| `get_absence_overlaps` | quién falta en un rango, solapes por equipo | todos |
| `get_recruiting_stats` | inscritos por mes, por origen y oferta | todos |
| `get_pipeline_snapshot` | candidatos por etapa y top por fit | todos |
| `get_channel_performance` | rendimiento de canales, CPA, estancadas | todos |
| `get_payroll_status` | corridas, estado, activos sin perfil | **solo owner/hr_admin** (no se monta para recruiter) |

**Reglas del prompt que gobiernan los huecos:** "permisos" solo puede decirse de nómina; para cualquier otro hueco el asistente intenta la tool más cercana y si no existe **lo dice honestamente** ("aún no puedo consultar ese dato") y ofrece lo que sí puede. Confundir ambos fue el primer bug real (2026-07-12, "inscritos este mes").

### Índice de evals — dónde viven los casos dorados (fuente de verdad)

Los casos NO viven en prosa (se perderían/divergirían): viven **versionados en el repo**, ejecutables. El doc solo referencia. **Regla dura:** todo fallo encontrado en producción se añade como caso al script correspondiente **en el mismo commit** que lo corrige — un bug se convierte en test permanente y no depende de la memoria de nadie.

| Eval | Comando | Cubre | Casos actuales |
|---|---|---|---|
| CV-parser | `npm run eval:cv` | extracción sobre 30 CVs reales (`evals/cv-parser/` + ground truth) | 5/6 (SDR: años, caso frontera aceptado) |
| Asistente | `npm run eval:assistant` | 6+ preguntas doradas × 3 roles (`scripts/eval-assistant.mjs`) | 8/8 — incluye: bug "inscritos" (capacidad≠permisos), RBAC salario recruiter, oferta≠canal, recomendación ambigua |
| Payroll copilot | vitest + `npm run eval:payroll` | **dos capas**: detectores deterministas (`lib/payroll/__tests__/copilot.test.ts`) + comportamiento del redactor LLM vs endpoint real (`scripts/eval-payroll-copilot.mjs`) | 13 casos vitest (incl. frontera: bajada de bruto >20%, umbral exacto, prev=0 sin NaN) · 3/3 eval (fidelidad: no inventa personas, sin veredicto aprobar/rechazar, RBAC recruiter→403) |

Cada caso lleva `id` + comentario en el script explicando qué bug real cubre. Añadir un caso = editar el script; el doc no lista casos individuales (evita drift).

**Convención (por qué unos en `scripts/` y otros en `evals/`):** el **runner** (ejecutable, invocado por `npm run eval:*`) vive en `scripts/eval-<agente>.mjs`; el **corpus de datos** (fixtures que no caben inline — p. ej. 30 PDFs) vive en `evals/<agente>/`. Un eval de pocos casos ligeros (el asistente: query+rol+checks) los lleva **inline en su runner** y no necesita carpeta en `evals/`; uno con corpus pesado (cv-parser) sí. **Este índice es el mapa único** — da igual dónde esté cada pieza, se encuentra aquí.

**Cuándo vitest y cuándo eval de endpoint (patrón payroll copilot):** un agente con capa **determinista** (detectores puros que calculan, tipo `computeRunFindings`) se blinda ahí con **casos dorados en vitest** — sin red, sin LLM, sin flakiness, corren en CI; es el sitio correcto para la lógica de detección (donde se esconden los bugs de nómina: una variación no cazada = pago mal aprobado). La capa **LLM** (el redactor) se prueba con un **eval de endpoint** (`.mjs`) que verifica lo que vitest no puede: que el modelo redacte FIEL a los avisos —sin inventar personas, sin veredicto de aprobar/rechazar—, con checks de forma resilientes a datos cambiantes. No hay `tsx` en el repo, así que el runner `.mjs` no importa TS: pega al endpoint real (las corridas del demo ya existen, no se siembra nada). Pendiente menor: eval de la integración completa con corrida sembrada efímera (hoy se apoya en las corridas del demo).

### ¿Cómo sabemos que la plataforma está cubierta? — el método de cobertura

1. **Mapa módulo → preguntas core.** Cada módulo funcional (Notion → Funcionalidades actuales) define sus 3-5 preguntas de negocio; cada pregunta debe mapear a una tool. Hueco en el mapa = tool que falta. (El bug de "inscritos" era exactamente esto: Reclutamiento tenía pipeline y canales pero no volumen por período.)
2. **Evals de preguntas doradas** ✅ (`scripts/eval-assistant.mjs`, `npm run eval:assistant`): 6 casos × 3 roles contra el endpoint real — checks de forma y franqueza (números presentes, RBAC sin fugas, sin "permisos" falsos), resilientes a datos cambiantes. Toda pregunta que falle en producción **se añade al set** — los bugs se convierten en tests (el caso #1 es el bug real de "inscritos"). **Su estreno cazó 3 bugs**: columna inexistente (`employees.city`) cuyo error de query se disfrazaba de "no encontré"; matching de nombres sensible a acentos (el LLM escribe "Lucia", la DB "Lucía" → fold de diacríticos en las tools); errores de Supabase tragados como lista vacía. Regla derivada: **un error de query jamás se disfraza de "no encontré" — se propaga al modelo como error consultable**.
3. **Telemetría de huecos:** los `agent_runs` del assistant guardan pregunta y respuesta; revisar periódicamente las respuestas tipo "aún no puedo" da la lista priorizada de tools que faltan, por demanda real.

## 4. Control de coste

- Telemetría `_usage` por invocación en `agent_runs` (tokens, turnos, truncado, modelo) → coste atribuible por empresa/agente. ✅
- `max_tokens` por agente. ✅ (calibrar con `_usage` real, no a ojo)
- **Presupuesto mensual por empresa** con degradación al fallback: ✅ `lib/agent-budget.ts` — `checkBudget` en `runAgent` antes de la llamada LLM; superado el límite (default $50, override `companies.ai_monthly_budget_usd` pendiente de migración) → fallback heurístico + log `budget_exceeded`, nunca error. `costOf`/`monthSpendUsd` calculan gasto real por empresa desde `_usage`. Desbloquea el cron de insights. Solo aplica a agentes que aportan `companyId` en su input (todos los internos ya lo hacen).
- Rate-limit por IP en el único endpoint LLM público (`careers/parse-cv`). ✅
- Referencia completa de precios/estimaciones: `handoff/Handoff Claude Code - Agentes coste.md` (§0 estado).

## 5. Decisiones registradas

- **Un asistente, no tres**: el vertical es un chip de contexto (UI determinista por pantalla, descartable, sesgo no muro); el hilo es único y cruza verticales; RBAC por tool montada.
- **Persistencia de conversaciones**: pendiente de producto — decidir con uso real (CLAUDE.md § Decisiones pendientes).
- **Bandas salariales con origen** (decisión 2026-07-13): el número lleva su `source` (`own_history`/`baseline`/`seed`) y la etiqueta se deriva de él; sin dato para un rol+ubicación → **no se muestra estimación**. Baseline curado por investigación (con citas, periódico y cacheado, nunca en vivo) para ES/VE/BR. Detalle en `handoff/…Agentes v2…§8`. Horizonte 2-3, no bloquea Olas 1-2.
- **Streaming del chat**: exigido por la doctrina; V1 sin streaming (fast-follow anotado).
- **Canales**: ✅ migrado (2026-07-13) — chat embebido retirado; la pestaña tiene `AssistantEntry` (chips plantilla que despachan `assistant:ask{question}` → el drawer abre y siembra el turno con el contexto del módulo).
- **Ciclo de vida de paneles invocados** (ratificado, DS §4.6): se colapsan ("Ver menos/Ver más"), no se cierran; expandir ≠ re-invocar (el toggle nunca llama a la API).
- **Fit canónico end-to-end**: `POST /api/candidates/rescore-fits` re-puntúa toda la empresa con el cálculo canónico (backfill 2026-07-13: 19 apps, 12 actualizadas, drift medio 14 pts); las barras 0-10 subjetivas retiradas a favor de `FitBreakdown` determinista.
- **TalentOS Platform Console** (super-admin, roadmap `handoff/…Agentes v2…§9`): plano de administración de plataforma (rol `platform_admin`, cross-tenant) — NO es sistema de agentes. Tres capacidades: monitoreo+alertas de gasto de IA (su dato ya existe en `agent_runs._usage`/`lib/agent-budget.ts`, la pieza más madura), taxonomías globales con override por empresa (extiende el patrón del catálogo de skills sin `company_id`), y KPIs globales por módulo. Horizonte 2-3; no bloquea Olas 1-2.
