# Desempeño — backlog de construcción

Backlog de la v1 del módulo. Spec: [`talentos-desempeno-spec.md`](./talentos-desempeno-spec.md).

**Convenciones**
- ID: `DES-B{bloque}-{nn}`.
- **AC externos**: cuando el documento externo ya trae criterios de aceptación aprovechables, se
  citan como `EP-XX-NN` (fichero `performance-backlog-epicas-historias.md`) en lugar de
  reescribirlos. Se usan como **checklist de QA**, adaptando roles (sus 9 → nuestros 5) y
  quitando lo que dependa de piezas que no tenemos (HRIS externo, LMS, SSO).
- Roles reales: `owner · hr_admin · recruiter · manager · employee`.
- Orden entre bloques es por dependencia. Dentro de un bloque, por valor.

---

## Bloque 1 — Cimientos y circuito de datos ✅ EN PRODUCCIÓN (2026-08)

Sin esto no existe el módulo. Es también la mitad del trabajo del módulo.

**Cerrado**: las cinco historias, más una separación de superficies que no estaba planificada
y salió al probarlo (ver DES-B1-06). Estado medido: 44 de 50 fichas con cargo canónico (88%),
51 eventos de expediente, 612 cargos en la taxonomía con 13.197 enlaces cargo↔skill.

**Fuera de plan pero necesario** — el saneamiento de la taxonomía sin el que las competencias
no valían nada: áreas relacionales (`job_categories`), modelo de dos niveles esco/market,
grafo de relaciones con peso recalculado, y tres bugs de datos (sinónimos que usurpaban
nombres de cargo, lecturas sin paginar que descartaban enlaces en silencio, caps de 8 del
builder). Documentado en `docs/taxonomy-and-ranking.md`.

### DES-B1-06 · Separar portal del empleado y admin B2B ✅ (no planificada)
Un owner puede ser además plantilla. Mezclar ambos menús en una barra confunde, y a un owner
SIN ficha se le mostraban enlaces muertos. Se separan en dos superficies (`/app/*` y `/me/*`)
con enlace cruzado explícito solo para quien tiene acceso a las dos.

### DES-B1-01 · Portal del empleado (superficie nueva)
Rol `employee` con nav reducido y sus propias pantallas. Alcance del portal: **desempeño,
ausencias, recibo de nómina, ficha/perfil y registro de horas**.
- Ninguna página del producto admite hoy el rol `employee`: es una superficie nueva, no un guard.
- El portal es distinto de la sección B2B "Desempeño".
- AC externos: no hay (el documento asume la superficie ya existente).

### DES-B1-02 · Invitación y vinculación `user_id ↔ employee`
Hoy **0 de 49 empleados** tienen cuenta. RR.HH. invita; el empleado activa y queda vinculado.
- Reutiliza el patrón de `POST /api/employees/self` y el flujo de invitación de `company_members`.
- `user ≠ employee` sigue vigente: el alta de usuario no crea ficha.
- Sin SSO ni SCIM (fuera de alcance).

### DES-B1-03 · `employees.job_title_id`
Migración + picker en la ficha + backfill desde `role_title` (texto libre).
- Replica el patrón ya probado de `jobs.job_title_id` (columna nullable + `JobTitlePicker` +
  script de backfill contra la taxonomía).
- Es el puente que permite derivar competencias del cargo.

### DES-B1-04 · Competencias del cargo desde la taxonomía
El conjunto de competencias evaluables de una persona se deriva de `job_title_skills`
(`is_core`, `weight`) del `job_title_id` de su ficha.
- **No se crea tabla de competencias.**
- Fallback explícito cuando el cargo no tiene skills suficientes (no inventar).
- AC externos aprovechables (adaptados): `EP-01-02` (resolución por especificidad, excepciones,
  lista de afectados exportable).

### DES-B1-05 · Expediente del empleado (timeline de decisiones)
Timeline único por empleado donde aterrizan ciclos, ratings, ajustes de calibración, planes de
desarrollo, PIP, promociones y cambios de nivel. Cubre el punto 10 del alcance.
- Patrón `application_events`. Append-only.
- Visibilidad por rol: el empleado ve lo suyo publicado; RR.HH. ve todo; el manager, su equipo.
- AC externos: solo la mitad de evaluaciones (`EP-09-03` AC3/AC4, §16 "5 ciclos",
  `EP-05-10` AC2 versión inmutable). **El historial de decisiones se escribe de cero.**

---

## Bloque 2 — La evidencia del año

Va **antes** del primer ciclo: si el ciclo cierra sin objetivos ni feedback, se evalúa por memoria.

### DES-B2-01 · Objetivos individuales y de equipo
Título, descripción, métrica, línea base, meta, unidad, peso, fechas, responsable, objetivo padre.
Tipos: individual, compartido y **de equipo** (heredado a los miembros).
- Validación: la suma de pesos debe dar 100% para enviar a aprobación.
- AC externos aprovechables: `EP-03-01` (5 AC, incluido el árbol de alineación); modelo de datos
  en spec externa §4.1. Sin cascada desde "nivel 0" en v1.

### DES-B2-02 · Aprobación de objetivos
El manager aprueba, devuelve con comentario obligatorio o ajusta el peso dejando registro.
- AC externos aprovechables: `EP-03-02` (5 AC).

### DES-B2-03 · Check-ins de progreso
Avance, semáforo (en curso / en riesgo / bloqueado / logrado), comentario y evidencia adjunta.
Historial no borrable. Recordatorio si el objetivo queda desactualizado.
- AC externos aprovechables: `EP-03-03` (5 AC) — están completos, se toman tal cual.

### DES-B2-04 · Cálculo de cumplimiento de objetivos
Media ponderada por peso; los cancelados se excluyen y redistribuyen peso; ajuste del manager con
justificación obligatoria.
- AC externos aprovechables: `EP-03-05` (4 AC). Sin umbral de sobrecumplimiento en v1.

### DES-B2-05 · Feedback continuo (espontáneo y solicitado)
Feedback a un colega asociado a una competencia; y solicitud de feedback a personas concretas con
fecha límite.
- Formato sugerido SBI (lo asiste la IA, ver DES-IA-01).
- Sin muro público de reconocimientos en v1.
- AC externos aprovechables: `EP-04-01` y `EP-04-02`.

### DES-B2-06 · Bitácora privada del manager
Notas privadas por persona, invisibles para el empleado, RR.HH. y el superior. Consultables e
insertables al llenar la evaluación.
- Es la pieza que combate el sesgo de recencia.
- Reglas de visibilidad más estrictas que el resto del producto (riesgo 5 de la spec).
- AC externos aprovechables: `EP-04-03` (5 AC).

---

## Bloque 3 — El ciclo formal

### DES-B3-01 · Configurar y lanzar un ciclo
Nombre, periodo evaluado, fases con fechas, ponderación por sección, población.
- Población: filtros fijos sobre `employees` (antigüedad por `start_date`, `status`,
  `contract_type`, `department`, `country`) + inclusión/exclusión manual con motivo. **No** hay
  editor de reglas Y/O configurable.
- **Snapshot** de la población al lanzar; los cambios posteriores se gestionan por excepción.
- Escala fija: 4 puntos con etiquetas, sin punto medio, + "sin elementos" excluido del promedio.
- AC externos aprovechables: `EP-01-06` (AC 2, 4, 5, 6), `EP-01-07` (AC 2, 3, 4).

### DES-B3-02 · Plantilla de evaluación
Secciones (competencias, objetivos si hay, preguntas abiertas) con peso; obligatoriedad y longitud
mínima de comentario.
- Reutiliza `evaluation_templates.questions` (jsonb). **No** hay builder con 6 tipos de campo ni
  lógica condicional.
- Comentario obligatorio al usar el extremo de la escala.
- AC externos aprovechables: `EP-01-04` (AC 3, 4, 5, 6).

### DES-B3-03 · Autoevaluación
Formulario con paneles de contexto (objetivos y avance, feedback recibido, ciclo anterior, plan de
desarrollo previo), autoguardado y envío con confirmación.
- AC externos aprovechables: `EP-05-03` (7 AC) — completos, se toman tal cual.

### DES-B3-04 · Evaluación del manager
Panel con su equipo, estado y fecha límite; acceso a objetivos, feedback y bitácora propia.
- **Autoevaluación oculta hasta enviar** la propia (evita anclaje).
- Aviso no bloqueante si califica a todo el equipo igual.
- AC externos aprovechables: `EP-05-04` (7 AC).

### DES-B3-05 · Cálculo del rating y publicación
Score por sección, ponderación del ciclo, traducción a etiqueta, **desglose explicable** visible
para empleado y manager. Congelado al publicar.
- Motor de cálculo aislado y testeable (patrón `lib/fit-score.ts` + `lib/fit-explain.ts`).
- Publicación parcial permitida (solo lo aprobado).
- AC externos aprovechables: `EP-07-01` (5 AC), `EP-05-07` (4 AC).

### DES-B3-06 · Revisión y aprobación de RR.HH.
Devolver al manager con comentario obligatorio, o aprobar. Aprobación en lote de lo que no tiene
alertas. (Aprobación de segundo nivel jerárquico: después.)
- AC externos aprovechables: `EP-05-06` (adaptado: el aprobador es RR.HH., no el jefe del jefe).

### DES-B3-07 · Reunión de retroalimentación y acuse
Vista consolidada + guía de conversación (IA); registro de que la conversación ocurrió; acuse del
empleado con comentario y posibilidad de marcar desacuerdo.
- Sin firma electrónica con sello de tiempo (fuera de alcance).
- AC externos aprovechables: `EP-05-08` (3 AC), `EP-05-09` (AC 2, 3, 4, 5).

### DES-B3-08 · Reapertura de formularios
Con motivo obligatorio, conservando versión inmutable del envío original y recalculando.
- AC externos aprovechables: `EP-05-10` (4 AC).

### DES-B3-09 · Paneles
Avance del ciclo (RR.HH.), equipo (manager) y resultado individual (empleado).
- El panel de manager oculta agregados con menos de 4 personas (confidencialidad).
- Exportación CSV.
- AC externos aprovechables: `EP-09-01`, `EP-09-02` (incluido AC4), `EP-09-03`.

### DES-B3-10 · Recordatorios
7 / 3 / 1 día antes del vencimiento y aviso al manager al vencer.
- Sobre el cron existente + Resend + notificación in-app. **No** hay motor multicanal
  configurable ni Slack/Teams/WhatsApp.
- AC externos aprovechables: `EP-10-02` (AC 1, 3, 4).

### DES-B3-11 · Excepciones de ciclo
Exclusión/reincorporación con motivo; cambio de manager a mitad de ciclo (mantener o transferir
conservando borrador); exclusión por licencia larga desde `absence_requests`.
- AC externos aprovechables: `EP-02-03` (4 AC), `EP-02-02` (AC 1, 2, 4 — sin evaluación dual
  ponderada en v1).

---

## Bloque 4 — Las consecuencias

### DES-B4-01 · Plan de desarrollo
Focos derivados de la **brecha de skills** contra las competencias core del cargo; acciones con
responsable, fecha y estado; validación del manager; arrastre al ciclo siguiente como contexto.
- Patrón `onboarding_tasks` (incluye `generated_by` para lo propuesto por IA).
- Sin integración LMS ni mentoring.
- AC externos aprovechables: `EP-08-01` (5 AC).

### DES-B4-02 · Plan de mejora (PIP)
Objetivos de mejora, hitos, apoyo comprometido, revisiones con registro y cierre con resultado
(superado / extendido / no superado).
- **Sugerido, nunca disparado automáticamente** por caer bajo un umbral.
- Visibilidad restringida: empleado, su manager, RR.HH. y nadie más.
- AC externos aprovechables: `EP-07-03` (AC 2, 3, 4, 5).

### DES-B4-03 · Promoción
Propuesta del manager desde el resultado del ciclo → aprobación de RR.HH. → aplica cambio de
`job_title_id` y `seniority_level`, registra el evento en el expediente y **pre-rellena** el
formulario de compensación.
- **El dinero no fluye solo**: nunca escribe en `pay_profiles` (regla dura de payroll).
- **Preparación = brecha contra las competencias core del cargo destino** (misma taxonomía que
  usamos para reclutar). Este es el diferenciador del módulo.
- El cambio de cargo aplica al **siguiente** ciclo: el ciclo en curso mantiene su snapshot.
- AC externos: **no existen**. Se escribe de cero (el documento externo solo lo trata como caso
  borde de mitad de ciclo y como dimensión de analítica).

---

## IA — transversal a los cuatro bloques

Regla: **propone, nunca califica ni decide.** Todo editable y marcado como asistido. Sobre
`agents/core.ts` + registro en `agent_runs`, con fallback heurístico determinista y **evals**
(patrón `scripts/eval-*.mjs`).

| ID | Función | Bloque |
|---|---|---|
| DES-IA-01 | Redacción SBI (situación, comportamiento, impacto) a partir de notas | 2 y 3 |
| DES-IA-02 | Aviso de sesgo o lenguaje problemático, no bloqueante | 3 |
| DES-IA-03 | Guía de conversación para la retroalimentación | 3 |
| DES-IA-04 | Sugerencia de objetivos desde cargo y nivel | 2 |
| DES-IA-05 | Sugerencia de acciones de desarrollo desde la brecha de skills | 4 |
| DES-IA-06 | Lectura de preparación para promoción (brecha vs cargo destino) | 4 |
| DES-IA-07 | Síntesis multi-evaluador (con umbral de anonimato) | cuando entre el 360 |

AC externos aprovechables: `EP-12-01` (AC 2, 3, 4), `EP-12-02` (AC 1, 2, 3), `EP-12-04` (AC 2, 4).

---

## Habilitadores técnicos

| ID | Historia |
|---|---|
| DES-TEC-01 | Migraciones con RLS por `company_id` para todas las tablas nuevas (regla: nunca `using(true)` para `authenticated` en datos de empresa) |
| DES-TEC-02 | Máquina de estados del ciclo y del formulario con transiciones validadas |
| DES-TEC-03 | Motor de cálculo de scores aislado y testeable, con explicación del desglose |
| DES-TEC-04 | Autoguardado de borrador con recuperación |
| DES-TEC-05 | Congelación por ciclo: snapshot de población + versión del conjunto de competencias |
| DES-TEC-06 | Eventos de expediente append-only (patrón `application_events`) |
| DES-TEC-07 | i18n es/en/pt del módulo (strings externalizados) |
| DES-TEC-08 | `eyebrow: "Desempeño"` en el contrato de `PageHeader` + entrada de nav de sección propia |

---

## Dependencias y decisiones

**Cerradas**: escala (4 puntos, sin punto medio, + "sin elementos") · sección propia "Desempeño" ·
alcance del portal del empleado · competencias desde ESCO · objetivos antes del primer ciclo ·
la promoción pre-rellena compensación pero no la escribe.

**Bloqueantes para el bloque 2 (dueño, no código)**
- `RESEND_API_KEY` y `RESEND_FROM` en las variables de entorno de **Vercel**: sin eso el correo
  de invitación no sale (la clave está solo en `.env.local`, y el botón corre en producción).
  Mientras tanto el flujo funciona copiando el enlace desde la ficha.

**Abiertas (no bloquean el bloque 1)**
1. Etiquetas exactas de los 4 puntos de la escala y los cortes de score → etiqueta.
2. ¿El ciclo bloquea la evaluación si el empleado no tiene objetivos aprobados? (configurable por
   ciclo; hay que decidir el valor por defecto).
3. Umbral de "bajo desempeño" que sugiere PIP.
4. ¿Autoevaluación obligatoria u opcional?

**Al backlog general (fuera de este módulo)**
- Robustecer el **registro de horas**: conceptos y/o proyectos en el registro.
- `docs/deuda-tecnica.md` sí existe: corregir la nota del backlog del job board que dice que no.
