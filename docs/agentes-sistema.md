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

| Agente | Modelo | Qué hace | Superficie | Eval |
|---|---|---|---|---|
| `cv-parser` | mini | Extrae perfil estructurado del CV (skills→catálogo, experiencias, idiomas CEFR, educación) | Modal del candidato en inscripción + "Extraer del CV" admin | ✅ `npm run eval:cv` (5/6) |
| `assistant` | 4o | **Punto central conversacional** — packs de tools por vertical con RBAC | Drawer global (sparkle topbar + ⌘J), chip de contexto por módulo | ❌ pendiente (siguiente) |
| `payroll-copilot` | mini | Redacta el resumen de la revisión pre-aprobación (detectores en `lib/payroll/copilot.ts`) | "Anotar corrida" en pay-run-detail (reencuadre B-5 en curso) | ❌ pendiente |
| `candidate-analyzer` | 4o | Lectura cualitativa del candidato explicando el fit determinista (`lib/fit-explain.ts`) | Panel de análisis en la ficha | ❌ pendiente |
| `job-writer` | 4o | Borrador de oferta desde una frase + mejora de campos | "Redacción asistida" en Nueva oferta (B-6/B-7) | ❌ |
| `channel-optimizer` | 4o | Plan de distribución (canales, presupuesto, copy) | Pestaña Distribución de la oferta | ❌ |
| `channel-analyst` | 4o | Chat de analytics de canales — **en retirada: migra al assistant** (su capa de datos ya es una tool del assistant) | Pestaña Canales → pasará a entrada del drawer | — |
| `onboarding-builder` | 4o | Checklist de incorporación por rol/departamento | Ficha del empleado | ❌ |
| `dashboard-insights` | mini | Redactor del motor de señales (determinista calcula) | "Sugerencias del agente" en dashboard | ❌ |

Fuera del framework (deuda): `career-site/translate` (gpt-4o directo, sin auditoría) — meter a `runAgent`.

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

### ¿Cómo sabemos que la plataforma está cubierta? — el método de cobertura

1. **Mapa módulo → preguntas core.** Cada módulo funcional (Notion → Funcionalidades actuales) define sus 3-5 preguntas de negocio; cada pregunta debe mapear a una tool. Hueco en el mapa = tool que falta. (El bug de "inscritos" era exactamente esto: Reclutamiento tenía pipeline y canales pero no volumen por período.)
2. **Evals de preguntas doradas** (`evals/assistant/` — pendiente, siguiente tarea): preguntas reales con la respuesta esperada contra la DB de seeds, corridas en cada cambio de prompt o de tools. Toda pregunta que falle en producción (como la de Michael) **se añade al set** — los bugs se convierten en tests.
3. **Telemetría de huecos:** los `agent_runs` del assistant guardan pregunta y respuesta; revisar periódicamente las respuestas tipo "aún no puedo" da la lista priorizada de tools que faltan, por demanda real.

## 4. Control de coste

- Telemetría `_usage` por invocación en `agent_runs` (tokens, turnos, truncado, modelo) → coste atribuible por empresa/agente. ✅
- `max_tokens` por agente. ✅ (calibrar con `_usage` real, no a ojo)
- **Presupuesto mensual por empresa** con degradación al fallback: ❌ pendiente (pista A, siguiente tras evals) — bloqueante para encender el cron de insights.
- Rate-limit por IP en el único endpoint LLM público (`careers/parse-cv`). ✅
- Referencia completa de precios/estimaciones: `handoff/Handoff Claude Code - Agentes coste.md` (§0 estado).

## 5. Decisiones registradas

- **Un asistente, no tres**: el vertical es un chip de contexto (UI determinista por pantalla, descartable, sesgo no muro); el hilo es único y cruza verticales; RBAC por tool montada.
- **Persistencia de conversaciones**: pendiente de producto — decidir con uso real (CLAUDE.md § Decisiones pendientes).
- **Streaming del chat**: exigido por la doctrina; V1 sin streaming (fast-follow anotado).
- **Canales**: el chat embebido se retira; la pestaña conserva una entrada que abre el drawer con chip "Canales".
