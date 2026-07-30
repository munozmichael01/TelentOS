# Desempeño — spec de producto de TalentOS

Versión de TalentOS del módulo de gestión del desempeño. **Este es el documento de referencia
del módulo.** Los otros dos ficheros de esta carpeta (`performance-management-spec.md` y
`performance-backlog-epicas-historias.md`) son una propuesta externa: se conservan como
**catálogo de casos borde y criterios de aceptación**, no como plan de trabajo. Fecha: 2026-07-29.

---

## 1. Alcance (cerrado)

El módulo cubre estos diez puntos. No es una lista priorizada: es el compromiso de la v1.

1. Objetivos individuales y de equipo
2. Ciclos de evaluación
3. Seguimiento del progreso
4. Autoevaluaciones
5. Evaluaciones del manager
6. Feedback continuo
7. Planes de desarrollo
8. Planes de mejora
9. Promociones
10. Historial de evaluaciones y decisiones

Con **IA transversal** en los cuatro bloques de construcción, no como fase final.

### Ubicación en el producto
- **Desempeño = sección propia** del dashboard B2B (no dentro de Personas). Nuevo `eyebrow`:
  `"Desempeño"` en el contrato de `PageHeader`.
- El **portal del empleado** es una superficie distinta (nav reducido, rol `employee`) y cubre:
  desempeño, ausencias, recibo de nómina, ficha/perfil y registro de horas.

---

## 2. Por qué nuestra versión no es la del documento externo

Tres desajustes de fondo del documento externo, y la corrección:

1. **Nos trata como satélite de un HRIS** (todo su módulo 2: sync, SSO SAML, SCIM, lotes con
   backoff). **Somos el HRIS**: la población es un `select` sobre `employees`, que ya tiene
   `start_date`, `status`, `contract_type`, `department`, `country`, `seniority_level`,
   `manager_id`. Esa épica desaparece.
2. **Reinventa el catálogo de competencias** (crear a mano + CSV + "mapeo opcional a ESCO").
   Ya tenemos la taxonomía ESCO normalizada, traducida y con relaciones, y **`job_title_skills`
   (`is_core`, `weight`) es un modelo de competencias por cargo**. El módulo la **consume**;
   crear un catálogo paralelo violaría las reglas 1 y 2 de CLAUDE.md.
3. **Pone la IA en V3.** En TalentOS la IA es el diferenciador y la infra existe
   (`agents/core.ts`, `agent_runs`, fallback heurístico). Va desde el primer bloque.

Además choca con dos reglas nuestras: su **matriz de mérito** empuja incrementos al flujo de
compensación (aquí el dinero **nunca** fluye solo: se pre-rellena y RR.HH. confirma), y sus
**9 roles** no existen (tenemos 5, y `company_members` asume un membership por usuario).

---

## 3. El ángulo diferenciador: una sola taxonomía de punta a punta

La skill con la que **reclutas** (fit del candidato) es la misma con la que **evalúas**
(competencia del cargo), la que revela la **brecha**, la que alimenta el **desarrollo**, la que
mide la **preparación para promocionar**, y la que vuelve a reclutamiento. Ningún competidor de
PyME/mid-market tiene ese circuito cerrado, porque exige ser ATS + HRIS + taxonomía a la vez.

Consecuencia de diseño: **no hay tabla de competencias**. Hay `skills` (ESCO) y el conjunto
esperado por cargo sale de `job_title_skills` vía `employees.job_title_id`.

---

## 4. Bloqueantes estructurales detectados en el recon

Ninguno de los dos aparece en el documento externo.

| # | Hallazgo | Evidencia | Consecuencia |
|---|---|---|---|
| 1 | **No hay superficie de empleado** | `employees`: 49 filas, **0 con `user_id`**. Ninguna página admite el rol `employee` | Sin portal no hay autoevaluación, ni acuse, ni resultado. Prerequisito nº 1 |
| 2 | **Falta el puente a la taxonomía** | `employees.role_title` es texto libre; **no existe `employees.job_title_id`** | Sin ese FK no hay competencias por cargo. Se replica el patrón ya probado de `jobs.job_title_id` |

Datos de apoyo del recon: 44/49 empleados con `manager_id`, 49/49 con `start_date` y
`role_title`, 30/49 con `seniority_level`.

---

## 5. Decisiones tomadas

| Decisión | Valor | Motivo |
|---|---|---|
| **Escala de calificación** | **4 puntos con etiquetas cualitativas, sin punto medio** + opción "sin elementos" excluida del promedio | Sin punto medio nadie se escuda en el centro (sesgo de tendencia central, el fallo de calidad nº 1). Una sola escala fija; configurable más adelante si un cliente lo exige |
| Ubicación | Sección propia "Desempeño" | Es un módulo, no una sub-área de Personas |
| Catálogo de competencias | Taxonomía ESCO existente | Regla 1 y 2 de CLAUDE.md |
| Objetivos | **Antes del primer ciclo**, no después | Si el ciclo cierra sin objetivos ni feedback, se evalúa por memoria — el problema que el módulo debe resolver |
| Compensación | La promoción **pre-rellena**, nunca escribe | Regla dura de payroll |
| Rol de la IA | Propone; nunca califica ni decide | Invariante de agentes ya vigente |

---

## 6. Bloques de construcción

Orden por **dependencia**, no por importancia. Los cuatro son la v1.

### Bloque 1 — Cimientos y circuito de datos
- Portal del empleado (rol `employee`, nav reducido) e **invitación / vinculación
  `user_id ↔ employee`**.
- `employees.job_title_id` + picker + backfill desde `role_title` (patrón `jobs.job_title_id`).
- Competencias del cargo derivadas de `job_title_skills`.
- **Expediente del empleado**: timeline de eventos (patrón `application_events`) donde aterrizan
  ciclos, ratings, ajustes, planes, promociones y cambios de nivel. Es el punto 10 del alcance y
  debe existir desde el principio: después no se reconstruye.

### Bloque 2 — La evidencia del año (puntos 1, 3, 6)
- Objetivos **individuales y de equipo** con métrica, meta, peso y fecha; alineación a un
  objetivo padre.
- Check-ins con semáforo, evidencia e historial no borrable.
- Feedback continuo (espontáneo y solicitado) + **bitácora privada del manager**.

### Bloque 3 — El ciclo formal (puntos 2, 4, 5)
- Ciclo con fases, población congelada al lanzar (snapshot) y estados.
- Autoevaluación con paneles de contexto y autoguardado.
- Evaluación del manager con **autoevaluación oculta hasta enviar** (evita anclaje).
- Cálculo del rating **explicable** (desglose por sección con su peso y aporte; patrón
  `fit-explain.ts`), congelado al publicar.
- Publicación, acuse del empleado y registro de la conversación de retroalimentación.

### Bloque 4 — Las consecuencias (puntos 7, 8, 9)
- **Plan de desarrollo** desde la brecha de skills (patrón `onboarding_tasks`).
- **Plan de mejora** (PIP) con hitos, revisiones y cierre con resultado.
- **Promoción**: propuesta del manager desde el resultado → aprobación de RR.HH. → cambia
  `job_title_id` y `seniority_level`, registra el evento en el expediente y **pre-rellena** el
  formulario de compensación. La preparación se lee como **brecha contra las competencias core
  del cargo destino**.

### IA en los cuatro bloques
Redacción SBI (situación, comportamiento, impacto) · aviso de sesgo no bloqueante · síntesis
multi-evaluador (con umbral de anonimato) · guía de conversación para la retroalimentación ·
sugerencia de objetivos y de acciones de desarrollo · lectura de preparación para promoción.
Todo con **evals** (patrón `scripts/eval-*.mjs`) y fallback determinista.

---

## 7. Patrones existentes que se reutilizan (no se reinventan)

| Necesidad | Se reutiliza |
|---|---|
| Plantilla de formulario | `evaluation_templates.questions` (jsonb) |
| Respuestas + calificación + comentario | Shape de `interview_feedback` (`ratings` jsonb, `overall`, `comments`) |
| Timeline / expediente | Patrón `application_events` |
| Tareas con responsable, fecha y estado | Patrón `onboarding_tasks` (incluye `generated_by` para lo propuesto por IA) |
| Recordatorios | Cron existente (`app/api/cron/*`) + `lib/email/resend.ts` |
| Competencias | `skills` + `skill_translations` + `job_title_skills` |
| Cálculo explicable | `lib/fit-score.ts`, `lib/fit-explain.ts` |
| Jerarquía | `employees.manager_id` + `OrgChart.tsx` |
| Exclusión por licencia | `absence_requests` |
| Aislamiento multi-tenant | RLS por `company_id` + los 5 roles de RBAC |

---

## 8. Fuera de alcance (y por qué)

Nada de esto está en los diez puntos del alcance: es andamiaje de enterprise.

9-box · mapa de sucesión · calibración con curva forzada · integración LMS · mentoring ·
SSO SAML/OIDC y SCIM · API pública de BI · firma electrónica con sello de tiempo · matriz de
mérito automática · evaluadores externos · admins por país · reportes programados por correo.

El **360 de pares** no está en los diez puntos, pero el diseño no debe impedirlo: las fuentes
de evaluación se modelan como tipo de formulario desde el bloque 3.

---

## 9. Requisitos no funcionales que sí asumimos

- Multi-tenant con RLS real (no confiar solo en la capa de aplicación).
- i18n es/en/pt del módulo (strings externalizados, nunca hardcodeados).
- Autoguardado y recuperación del borrador.
- Congelar: catálogo y población quedan versionados/snapshotted por ciclo; un ciclo cerrado no
  cambia porque cambie el catálogo.
- Auditoría: toda calificación, ajuste, reapertura y publicación queda registrada.
- Anonimato con umbral mínimo de respuestas **cuando entre el 360** (requisito crítico, no
  funcionalidad: una filtración de identidad destruye la confianza de forma irreversible).

---

## 10. Riesgos

1. **El portal del empleado es la mitad del trabajo.** 0/49 empleados tienen cuenta hoy. Si se
   subestima, el módulo no arranca.
2. **Motor de ponderaciones**: es el componente con más casos borde. Aislarlo y cubrirlo con
   pruebas desde el día uno.
3. **Adopción de objetivos**: sin bloqueo configurable del ciclo, mueren en el primer año.
4. **`employees.job_title_id` con cobertura baja** dejaría a parte de la plantilla sin
   competencias: el backfill y el picker son parte del bloque 1, no un "después".
5. **Datos sensibles**: la bitácora privada del manager y los PIP tienen reglas de visibilidad
   más estrictas que el resto del producto.
