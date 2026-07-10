# Análisis funcional y de producto — Agentes de TalentOS

> **Fecha:** 2026-07-10 · **Alcance:** los 5 agentes de `agents/*`, el motor de insights del dashboard, las features LLM sueltas, y el mapa de cobertura contra los 12 módulos de la plataforma.
> **Objetivo declarado de los agentes:** asistir cada flujo de la plataforma, facilitar tareas repetitivas, aportar análisis e insights, sugerir acciones clave — un especialista por rol, para todos los equipos de RR.HH.

---

## 1. La arquitectura base: mejor de lo habitual

`agents/core.ts` establece tres principios que mucha gente con más recursos no tiene:

1. **Los agentes sugieren, nunca escriben** — la persistencia ocurre solo cuando el humano confirma en la UI. Es el patrón correcto para RR.HH., donde una decisión automatizada sobre personas es un riesgo legal (el AI Act clasifica el screening de candidatos como alto riesgo).
2. **Fallback heurístico determinista** sin `OPENAI_API_KEY` — el producto es demostrable end-to-end sin coste. Además da gratis una *baseline* para evaluar si el LLM realmente aporta sobre la heurística.
3. **Auditoría en `agent_runs`** de cada invocación.

El patrón más maduro del codebase está en `app/api/agents/dashboard-insights/refresh/route.ts`: **la capa determinista calcula las señales, entidades y acciones; el LLM solo redacta el texto**, con frases prohibidas, límite de 140 caracteres, validación post-hoc y texto fallback si el LLM falla. Se nota que hay una spec detrás (§2.4.1). Este es el patrón a replicar, no los prompts monolíticos.

### Grietas técnicas de la base

- **La auditoría probablemente está rota** (a confirmar): `logRun` inserta en `agent_runs` con el cliente RLS de usuario (`core.ts:39`), pero `0015_rls_hardening.sql:71-75` eliminó las políticas de `agent_runs` dejándola "solo service_role". Si no quedó política de INSERT para `authenticated`, cada log falla en silencio (el `catch` vacío lo garantiza). El principio de auditoría existe en el comentario, no en la base de datos. **Fix:** insertar con `createAdminClient` y añadir `company_id` a la tabla.
- **Modelo hardcodeado** (`gpt-4o`, `core.ts:30`) — sin configuración por agente ni por env. El motor de insights ya usa `gpt-4o-mini` por su cuenta, lo cual es la decisión correcta (redactar ≠ razonar), pero es inconsistente con el core.
- **Sin streaming** — grave solo en el channel-analyst, que es un chat: esperar 8-15s a una respuesta completa mata la sensación conversacional.
- **Sin validación del output** — `JSON.parse(msg.content)` directo a un tipo (`core.ts:110`). Un JSON malformado o con campos faltantes llega a la UI tal cual. Falta un schema (Zod) con reintento.
- **Sin límites de coste** — ningún rate-limit ni presupuesto por empresa; cualquier miembro puede invocar `gpt-4o` en bucle.
- **El estado `fallback` no se comunica** — el resultado lleva `status: "ok" | "fallback"` pero la UI no distingue "esto lo razonó la IA" de "esto es una heurística". El usuario debería saberlo; cambia cuánta confianza deposita.

---

## 2. Agente por agente

### 🟢 candidate-analyzer — bien diseñado, pero analiza perfiles vacíos

**Bien:** el mejor prompt del set en lo ético — gaps honestos ("si falta información, dilo como gap, no lo inventes"), prohibido recomendar contratar/descartar, guardrail explícito de sesgos, preguntas de entrevista específicas en vez de veredictos. Usa el cliente RLS (seguro). Cachea el resultado en `ai_analysis`.

**El problema de producto es fatal y no está en el agente:** `app/api/careers/apply/route.ts:63` crea todos los candidatos del career site con `skills: []`, `experience_years: 0` y `summary: null`. El CV se sube… **y nunca se parsea**. Resultado: el fit score determinista y el analyzer operan sobre un perfil vacío para la mayoría de candidatos reales. El agente más importante del ATS está de rodillas por falta de input, no de inteligencia.

**Ajustar:** re-análisis sugerido cuando llega feedback de entrevista nuevo (hoy el análisis cacheado queda obsoleto sin aviso).

### 🟢 job-writer — buena UX, autoridad construida sobre datos mock

**Bien:** dos modos (draft desde brief / assist mejorando lo escrito), "respeta la intención del usuario: mejora, no reemplaces", anti-clichés, salario obligatoriamente dentro de banda de mercado vía tool, `rationale` explicando decisiones. La integración en `job-form.tsx` con confirmación humana es correcta.

**El riesgo:** `lib/data/market.ts` son ~10 familias de rol con bandas inventadas, solo España, solo EUR (hardcodeado en el prompt). El comentario del archivo lo reconoce ("en producción esto vendría de un proveedor"). El problema es que **la UI no lo reconoce**: el recruiter ve "banda de mercado 38-62k" con la misma autoridad que un dato real. Opciones: etiquetarlo como estimación, conectar fuente real, o — la barata y buena — usar el histórico de **tus propias ofertas** (dato que ya existe en `jobs`).

**Agregar:** linting de lenguaje inclusivo/género-codificado (relevante legalmente en ES), y retroalimentar performance de canales ("ofertas con salario visible en este sector convierten +X%") — los datos ya existen en el mismo producto.

### 🟢 channel-optimizer — el mejor prompt operativo del set

**Bien:** orden obligatorio de tools, jerarquía explícita datos-reales > benchmarks con umbral concreto (<3 candidaturas), regla de pausar canales con 0 candidaturas tras 5+ días, orgánicos siempre a coste 0, copy adaptado por canal, matemática de `expected_applications` definida. Es un prompt de alguien que entiende el dominio.

**Ajustar:**
- La fuga multi-tenant reportada en la auditoría técnica (H2): `get_job_channel_performance` acepta cualquier `job_id` con admin client.
- Benchmarks mock (`lib/data/channel-performance.ts`) — mismo problema de autoridad que market.ts.
- **Es solo reactivo**: el usuario tiene que ir a la pestaña de distribución y pedirlo. Su regla más valiosa ("pausa este canal, lleva 5 días a coste sin resultados") debería dispararse sola como señal del motor de insights. Un optimizador que solo optimiza cuando se lo piden pierde el 80% de su valor.

### 🟡 channel-analyst — el embrión del asistente global, atrapado en un módulo

**Bien:** el prompt conversacional está sorprendentemente refinado — persistencia de filtros entre turnos, follow-ups contextuales por oferta, distinción `rows`/`by_job`, "nunca inventes números, llama siempre a la tool", preguntas sugeridas, y un fallback determinista que responde razonablemente sin LLM.

**La observación de producto clave:** el prompt dedica un tercio de su extensión a un **protocolo de redirección** ("si preguntan por candidatos → /candidates, por empleados → /employees…"). Eso es la confesión de que los usuarios le preguntan de todo — y la respuesta actual es echarlos. La infraestructura de un asistente conversacional de plataforma ya está construida, pero confinada a la pestaña de canales, probablemente el módulo *menos* visitado por un equipo de RR.HH. generalista.

**Ajustar:** streaming (imprescindible en chat), tenant scoping (H2), y solapamiento técnico con el optimizer: `queryChannelData` (analyst) y `get_job_channel_performance` (optimizer) son dos implementaciones de la misma agregación — debería haber una sola capa de datos de canales para ambos.

### 🟡 onboarding-builder — correcto pero desmemoriado

**Bien:** checklists por rol/departamento, responsables realistas (IT / People / nombre del manager), `due_offset_days` negativos para preparación pre-alta. Contexto vía RLS. El panel marca las tareas `generated_by: "agent"`.

**El gap:** no tiene memoria ni materia prima de la empresa. Solo ve rol, departamento, manager y compañeros (`tools.ts:4-25`). No sabe qué herramientas usa la empresa, no ve los checklists de incorporaciones anteriores, y no aprende de las ediciones que People hace a sus propuestas — cada alta regenera desde cero el mismo conocimiento genérico. La versión potente mantiene **playbooks por departamento** que se refinan con cada contratación: "esto es lo que People conservó, esto es lo que siempre borra".

**Gratis con la misma infraestructura:** offboarding (checklist inverso: revocar accesos, devolución de equipo, finiquito) — mismo motor, contexto casi idéntico, y es una tarea donde olvidar un paso tiene coste real de seguridad.

### 🟢 dashboard-insights — la mejor pieza, infrautilizada

**Bien:** el patrón determinista+redactor descrito arriba. Triage explícito (done/ignored), acción con href por insight, entidades nombradas, señal cruda guardada.

**Lo infrautilizado:** solo **4 señales** (candidatos estancados, comparativa de canales, violaciones de compliance, onboarding vencido) y el refresh es **manual**, además bloqueado hasta triar todo lo anterior. Un motor de insights que hay que ir a pulsar no es proactivo; es un informe con botón. Falta un cron diario y faltan señales de la mitad del producto (ver §4).

### Features LLM sueltas (no-agentes)

- `app/api/career-site/translate/route.ts` usa `gpt-4o` directamente, fuera del framework `runAgent` — sin log en `agent_runs`, sin fallback. Funcional, pero rompe la promesa de auditoría. Debería pasar por el core.
- `app/api/jobs/import/route.ts` (XML/XLSX/URL) es 100% determinista. El mapeo de columnas/campos de un feed desconocido es exactamente el tipo de tarea tediosa donde un LLM barato brillaría (sugerir el mapping, humano confirma — patrón que ya se usa).

---

## 3. Qué eliminaría

Poco, y eso es buena señal — no hay agentes zombis:

1. **El protocolo de redirección del channel-analyst** — cuando evolucione a asistente global (§5), redirigir se convierte en responder.
2. **La duplicación de capa de datos analyst/optimizer** — una sola `lib/channel-data.ts` con scoping por empresa.
3. **Los datos mock como fuente silenciosa de autoridad** (market.ts, channel-performance.ts) — no eliminarlos, pero sí degradar su presentación a "estimación" en la UI hasta que haya fuente real. Un recruiter que fija un salario por una banda inventada es un daño real del producto.

---

## 4. Mapa de cobertura: dónde hay agente y dónde no

| Módulo | Agente hoy | Valor del gap |
|---|---|---|
| Dashboard | insights (4 señales, manual) | — motor correcto, alcance corto |
| Ofertas: creación | job-writer | — |
| Ofertas: distribución | channel-optimizer | — |
| Ofertas: import | ninguno | Medio: mapeo asistido de feeds |
| Canales | channel-analyst | — |
| Candidaturas | candidate-analyzer | **Alto: sin CV parsing, analiza vacío** |
| Entrevistas | ninguno | Alto: el panel de feedback existe, nadie lo sintetiza |
| Career site | translate (fuera del framework) | Bajo |
| Empleados / onboarding | onboarding-builder | Medio: sin memoria; sin offboarding |
| Horas / fichajes | ninguno (compliance es determinista, correcto) | Bajo-medio: anomalías van bien en insights |
| Ausencias / vacaciones | **ninguno** | Alto: conflictos de cobertura, saldos que caducan |
| **Payroll** | **ninguno** | **El más alto: el módulo de mayor riesgo y el de más trabajo repetitivo de revisión** |
| Compliance | señal en insights ✅ | — |
| Organigrama | ninguno | Bajo |
| Settings/Team | ninguno | Ninguno (correcto que no haya) |

El patrón: **la cobertura de agentes está toda en reclutamiento** (4 de 5 agentes + la mitad de las señales de insights). El lado HRIS/People — donde están las tareas más repetitivas y de más riesgo (nómina, ausencias) — está casi desnudo. Si la tesis del producto es "agentes que asisten a *todos* los equipos de RR.HH.", hoy asisten al recruiter y poco más.

---

## 5. Qué agregaría, por orden de palanca

**P1 · CV-parser agent** (desbloquea lo que ya existe). Al recibir una candidatura: extraer skills, años de experiencia, ubicación y resumen del CV → proponer el perfil (o auto-aplicar con etiqueta "extraído por IA", editable). De golpe: el fit score significa algo, el candidate-analyzer analiza datos reales, y el dedupe/matching mejora. La mayor relación valor/esfuerzo de toda esta lista — sin ella, dos piezas ya construidas rinden a media máquina.

**P2 · Expandir el motor de insights + cron.** Es la mejor arquitectura del sistema; convertirla en la capa proactiva de toda la plataforma. Señales candidatas con datos que ya existen: variación de bruto vs run anterior (`pay_run_lines`), oferta abierta 30+ días sin contratación, contratos/períodos de prueba que vencen, saldos de vacaciones que caducan sin usar, solapamiento de ausencias en un mismo equipo, campañas estancadas (la regla del optimizer, automatizada). Refresh por cron diario + el botón manual.

**P3 · Payroll copilot (pre-run review).** El flujo real de nómina es "revisar 40 líneas buscando la que está mal". Un agente que anote la corrida antes de aprobar — "3 líneas con variación >20% vs mes anterior: Elena V. (+34%, coincide con cambio de pay profile del día 12), …" — con el patrón insights (determinista calcula, LLM redacta) es diferencial frente a HRIS tradicionales y de riesgo controlado porque **no toca números, solo señala**. Encaja con el principio human-in-the-loop.

**P4 · Generalizar channel-analyst → asistente de plataforma.** La ingeniería conversacional ya está hecha (historial, filtros persistentes, follow-ups). Darle tools por módulo (empleados, ausencias, pipeline, nómina-agregada) con el companyId del guard, y respetar RBAC en las tools (un manager pregunta por su equipo, no por salarios de toda la empresa). La tabla de redirecciones del prompt actual es literalmente la lista de dominios que los usuarios ya demandan.

**P5 · Interview copilot.** Ya se generan preguntas en el analyzer y ya se captura feedback en `interview-panel.tsx` — pero no se hablan. Pre-brief del entrevistador (perfil + gaps + preguntas sugeridas) y síntesis post-entrevista de feedbacks múltiples en un comparativo. Cierra el loop del módulo con piezas existentes.

**P6 · Absence assistant para managers.** Al aprobar una ausencia: "3 personas más de Ventas están fuera esa semana; cobertura al 40%". Determinista en un 90%, LLM solo para redactar. Encaja como señal de insights o como hint inline en el panel de aprobación.

---

## 6. Ajustes técnicos transversales

1. **Reparar la auditoría** — admin client en `logRun` + `company_id` en `agent_runs`. Sin esto no hay observabilidad de agentes.
2. **Capturar el outcome** — hoy se sabe qué propuso el agente, no qué pasó después. Un campo `outcome` (accepted / edited / rejected) escrito cuando el humano confirma o descarta da el dataset de mejora de prompts y el argumento de ROI ("el 71% de los checklists se aceptan sin editar").
3. **Config de modelo por agente** — redacción/extracción a modelo barato, razonamiento a modelo capaz; env-configurable. El coste por empresa importa cuando P2 corre en cron. (Ver documento de coste.)
4. **Validación Zod del output + 1 reintento** antes de que llegue a la UI.
5. **Streaming** en las superficies conversacionales.
6. **Exponer el estado `fallback` en la UI** — un badge "análisis heurístico" vs "análisis IA" es honestidad de producto barata.
7. **Set de evaluación por agente** — 10-20 casos dorados por agente contra los que correr cambios de prompt; los fallbacks deterministas ya dan la baseline de comparación gratis.

---

## Síntesis

**Lo que está bien:** los cimientos son los correctos y poco comunes — human-in-the-loop real, degradación elegante, el patrón determinista+redactor de insights, y prompts de dominio bien pensados (el del optimizer y el guardrail anti-sesgo del analyzer son de nivel). No hay que rehacer nada.

**Lo que frena el potencial:**
1. El agente estrella analiza perfiles vacíos porque nadie parsea el CV.
2. Toda la inteligencia vive en reclutamiento mientras nómina y ausencias — donde está el trabajo repetitivo y el riesgo — no tienen nada.
3. Los agentes son reactivos: esperan a que les pregunten, y el único proactivo (insights) tiene 4 señales y botón manual.
4. Parte de la autoridad se apoya en datos mock sin etiquetar.
5. La auditoría y el feedback loop — lo que permitiría demostrar y mejorar el valor — están rotos o ausentes.

**En una línea:** hay un excelente chasis de agentes con el motor puesto solo en una rueda; el máximo potencial no está en añadir más IA a reclutamiento, sino en parsear CVs, hacer proactivo el motor de insights y llevar el patrón que ya se domina a payroll y ausencias.
