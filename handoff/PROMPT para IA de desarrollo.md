# Prompt para la IA que desarrolla TalentOS

> Copia y pega este bloque a la IA de desarrollo. Está anclado al repo real (rutas, modelos Prisma, API routes y componentes existentes). El diseño vive en mockups HTML aparte (`TalentOS App.dc.html`, `TalentOS Career.dc.html`, `Sistema de Diseño.dc.html` + `support.js`) — son la **fuente de verdad visual**. Tu trabajo es portar ese diseño al código real y crear lo net-new en backend/lógica.

---

## ⚠️ Cómo portar el diseño (léelo primero — exactitud al pixel)

Los ficheros `*.dc.html` **no son** componentes de la app: son HTML con **todos los estilos escritos inline** (cada color, tamaño, espaciado y layout está literal en el código). Por eso el diseño es **portable al pixel** — no interpretes, traduce.

1. **Lee el código** de cada `.dc.html` (no trabajes de capturas). El aspecto exacto está en el markup + estilos inline.
2. **Re-impleméntalo como componentes React/Next** dentro del repo, conservando la **misma estructura de nodos y los mismos valores de estilo** (mismos colores, px, gaps, radios, sombras, tipografías). Convierte los estilos inline a clases Tailwind / `style` equivalentes **sin cambiar valores**.
3. **Tokens exactos:** vuelca el `globals.css` (mapeo shadcn) + `tailwind.config` de `Sistema de Diseño.dc.html › sección Código` a `app/globals.css` y `tailwind.config.ts`. Fuentes: Archivo / Hanken Grotesk / Space Mono.
4. **No "mejores" el diseño** ni cambies espaciados/colores "a tu criterio". Si algo no encaja con un componente shadcn existente, ajusta el componente al diseño, no al revés.
5. Lo que se **construye nuevo** (lógica de desempeño, enum de motivos, scheduling) sí lo programas según las Notas — ahí el "exacto" aplica al comportamiento descrito, no a copiar markup.
6. **Ignora** los datos de ejemplo de los mockups (son ilustrativos); los datos reales vienen de Supabase.

> El runtime de los mockups (`support.js`) se incluye solo para poder renderizarlos como referencia; **no lo portes** al repo.

---

## Contexto

Eres la IA que mantiene el MVP de **TalentOS** (Next.js App Router + Supabase/Postgres; Prisma como espejo tipado en `prisma/schema.prisma`, fuente de verdad de migraciones en `supabase/migrations`; queries en runtime con `supabase-js`; 4 agentes en `agents/*` con su patrón de heurística-sin-LLM como fallback y salida siempre editable).

Hemos rediseñado el front en mockups y aprobado una tanda de mejoras. **El comportamiento actual del MVP se conserva.** Abajo está, por área: lo que ya existe y solo hay que **cablear** a la maqueta, y lo **net-new** que debes construir en datos + API + agente. Cada cambio indica los ficheros reales a tocar.

**Principios de producto que no se rompen:**
- **Agentes en-flujo, no chatbot.** El consejo de IA aparece en el punto de decisión; la acción final siempre es humana (editar/aprobar).
- **Mover de etapa es siempre trazable** (quién/cuándo/origen→destino).
- Matching candidato↔oferta con **fit score 0–100**; **candidato→empleado** sin recapturar datos; **UTM de origen** en candidaturas; import con normalización + dedupe.

---

## 1. Kanban: drag & drop con motivo + auto-scroll  — *cablear, con un cambio de schema*

**Qué cambia en UX:** arrastrar una tarjeta a otra columna **abre un diálogo de motivo**; el movimiento solo se confirma desde ahí (ya no hay cambio silencioso). Etapas por defecto: **Aplicado · Screening · Entrevista · Oferta · Contratado · Descartado** (la columna **Descartado** ya está en la maqueta).

**Política de motivo (implementar exactamente así):**
1. **Siempre** se auto-registra quién/cuándo/origen→destino, sin fricción → ya lo haces escribiendo en `application_events` desde `PATCH /api/applications/[id]` (`app/api/applications/[id]/route.ts`). Mantener.
2. **Motivo obligatorio solo cuando destino = `Descartado`**, elegido de una **lista cerrada** (enum) + **nota libre opcional**. En cualquier otra etapa el motivo/nota es **opcional** y no bloquea.

**Cambio de datos** (`prisma/schema.prisma` + nueva migración en `supabase/migrations`):
- En `ApplicationEvent` / `application_events`: el campo `reason` (hoy texto libre) pasa a desglosarse en
  - `reason_code TEXT NULL` — enum de aplicación (CHECK o tabla de catálogo), **requerido solo si `to_stage` es terminal/descartado**;
  - `reason_note TEXT NULL` — nota libre opcional.
  - Mantén `reason` para compatibilidad o migra los datos existentes a `reason_note`.
- Validación en `PATCH /api/applications/[id]`: si el `stage` destino es el de descarte (`job_stages.is_terminal = true` con semántica de rechazo), exige `reason_code`; si no, acéptalo opcional.

**Taxonomía de descarte propuesta** (ajústala a tu catálogo; déjala como enum/catálogo, no texto libre): `no_fit` · `insufficient_experience` · `salary_out_of_range` · `candidate_withdrew` · `position_filled` · `process_paused` · `other`. Beneficio: **analítica limpia de rechazos** agregable.

**Auto-scroll al arrastrar** (`components/features/pipeline-board.tsx`): al acercar la tarjeta a un borde del tablero, este hace scroll para alcanzar columnas ocultas (necesario con 6 columnas).
- ⚠️ **Móvil:** el HTML5 drag-and-drop no funciona en táctil. Implementa el tablero con **dnd-kit** (auto-scroll táctil integrado); el contenedor ya debe ser `overflow-x:auto; touch-action:pan-x`.

---

## 2. Entrevistas: estándar ATS — *ampliar `interview-panel` + API + modelo*

Sobre el `scheduling básico` actual (`components/features/interview-panel.tsx` + `POST /api/interviews`). Objetivo: que funcione de forma familiar a Greenhouse/Ashby/Lever.

**UX nueva:**
- **CTA contextual:** cuando una candidatura entra a la etapa **Entrevista** y no tiene ninguna entrevista agendada, la pestaña Entrevistas muestra un aviso con botón **Agendar entrevista**.
- **Agendar manualmente:** tipo de entrevista · fecha + hora · duración · **entrevistador/a** · **otros participantes** (multi) · confirmar **nombre + email** del candidato · **vista previa del email** en vivo → *Enviar invitación*.
- **Enviar disponibilidad:** elegir entrevistador + **huecos**; el candidato recibe un enlace público y elige; la entrevista se crea al confirmar.

**Backend a añadir:**
- Modelo `Interview` ya tiene `scheduledAt`, `durationMin`, `interviewer`, `meetingUrl`, `stageId`. Añadir:
  - **Participantes**: tabla `interview_participants` (`interview_id`, `name`, `email`, `role`) **o** `participants Json`.
  - **Modo disponibilidad**: `proposed_slots Json` (lista de huecos) + `public_token` para el enlace que abre el candidato; al elegir, se fija `scheduled_at` y se limpian los slots.
  - **Plantilla de email** al candidato (asunto + cuerpo con variables); persistir el render enviado.
  - Integración de **calendario/vídeo** (Google/Microsoft Meet): auto-crear `meeting_url`. **A confirmar proveedor** (ver dudas abiertas).
- Conserva el **feedback estructurado por plantilla** (`EvaluationTemplate` / `InterviewFeedback`) que ya existe.

---

## 3. Análisis IA del candidato: sub-scores de fit — *ampliar agente*

Hoy `agent-candidate-analyzer` (`agents/agent-candidate-analyzer/*` + `app/api/agents/candidate-analyzer/route.ts`) devuelve un **fit único 0–100**. La maqueta muestra un **desglose por dimensiones** (barras: skills / experiencia / liderazgo…).

- El agente debe **exponer sub-scores** además del total, p. ej. `fit: { total, skills, experience, leadership }`. Persistir si quieres histórico (en `Application.fitScore` queda el total; los sub-scores pueden ir en un `Json` o en el `AgentRun.output`).
- Sin LLM como fallback, igual que hoy: deriva las dimensiones de las señales que ya usa `lib/fit-score.ts`. La recomendación queda **explicable** y la decisión sigue siendo humana.

---

## 4. Desempeño del empleado — **NET-NEW** (modelo + API + agente)

Confirmado: **no existe** en el MVP (no hay tabla ni flujo; "performance" en el repo es solo de canales, y las plantillas de evaluación son de entrevistas). Construir como feature nueva en la ficha de empleado (`/employees/[id]`), nueva pestaña **Desempeño**.

**UX (maquetada):**
- **Ciclo actual** (p. ej. "H1 2026 · Revisión 360 · cierra 30 jun"), **valoración global** (escala + etiqueta) y **próximo 1:1**.
- **Objetivos del ciclo (OKR)** con progreso % y estado (En curso / En riesgo).
- **Feedback / 1:1s** (manager + autoevaluación, con fecha). **Clic en una review → detalle del cuestionario completo** (todas las preguntas con su rating en estrellas + comentario), estándar de mercado (Lattice/15Five).
- 🤖 **Agente de desempeño:** redacta el **borrador de la review** agregando feedback de manager + autoevaluación + 1:1s + progreso de objetivos, y propone **fortalezas, áreas de crecimiento y rating sugerido**. El manager **edita y aprueba**. UI: panel oscuro "Agente · Borrador" con "Usar como borrador de review".

**Backend a crear** (nuevos modelos en `prisma/schema.prisma` + migración):
- `review_cycles` (`name`, `kind`, `opens_at`, `closes_at`, `status`).
- `performance_reviews` (`employee_id`, `cycle_id`, `reviewer` [manager/self/peer], `rating`, `answers Json` [pregunta→rating+comentario], `status` draft/submitted/approved).
- `goals` (`employee_id`, `cycle_id`, `title`, `progress`, `status`, `owner`).
- **`agent-performance-writer`**: nuevo agente con el **mismo patrón** que `agent-job-writer` (heurística sin LLM como fallback, salida **siempre editable**). Ruta `app/api/agents/performance-writer/route.ts`. Registra cada ejecución en `agent_runs`.

**A confirmar antes de construir** (preguntas abiertas abajo): escala de rating (1–5 vs etiquetas), visibilidad (manager/empleado/RRHH), ¿autoevaluación obligatoria?

---

## 5. Notas internas en la ficha de candidato — *ya alineado, solo cablear*

La maqueta tiene una pestaña **Notas** (composer + lista: cuerpo, autor, fecha, "solo el equipo · no visible para el candidato"). Mapea directo a lo que ya existe: `components/features/notes-panel.tsx` + `POST /api/applications/[id]/notes` + modelo `Note`. Solo conectar la maqueta; sin cambios de datos.

---

## 6. Agentes en contexto (los 4 + el nuevo) — *unificar affordance, cablear botones*

Lenguaje visual común (ver card **"Agente en contexto"** en `Sistema de Diseño.dc.html` y `components/agent-hint.tsx`): panel "Agente · Propone" + sello "tú decides".

| Agente | Dónde, en la app | Acción |
|---|---|---|
| `agent-job-writer` | Nueva oferta — rail redactor (borrador + rango de mercado) | Cablear botones del panel a la ruta real |
| `agent-channel-optimizer` | Detalle de oferta › Distribución (plan por objetivo/presupuesto) | Conectar "Aplicar recomendación" a la lógica real (`app/api/agents/channel-optimizer`) |
| `agent-candidate-analyzer` | Ficha de candidato › Análisis IA | Exponer **sub-scores** (ver §3) |
| `agent-onboarding-builder` | Ficha de empleado › Onboarding | Se **añadió el affordance de agente** (hint + "Regenerar con IA"), paridad con `onboarding-panel.tsx` — cablear "Regenerar" |
| `agent-performance-writer` *(net-new)* | Ficha de empleado › Desempeño | **Construir** (ver §4) |

---

## 7. Reskin visual — *aplicar tokens, sin tocar lógica*

Reskin completo. Para aplicarlo sin reescribir componentes, usa el bloque **`globals.css` (mapeo shadcn) + `tailwind.config`** de `Sistema de Diseño.dc.html › sección Código` y vuélcalo en `app/globals.css` y `tailwind.config.ts`.
- Tipos: Archivo (display) / Hanken Grotesk (UI) / Space Mono (meta).
- Color: teal `#0E5C4A` (marca), coral `#F1543F` (acción), lima `#C6F24E` (positivo), papel cálido.
- Patrón de marca: primario con borde + sombra dura; banner en degradado; chips con check.
- **Datos de los mockups son ilustrativos** — no copiar al seed; los reales vienen de Supabase.

---

## Resumen de cambios de datos (checklist de migraciones)

1. `application_events`: `reason` → `reason_code` (enum/catálogo, requerido solo en descarte) + `reason_note` opcional.
2. `interviews`: `participants` (tabla o Json) + `proposed_slots Json` + `public_token` + plantilla de email; integración calendario/vídeo.
3. Análisis: `agent-candidate-analyzer` devuelve **sub-scores** (no cambia tabla; opcional persistir en Json/`agent_runs`).
4. **Net-new desempeño:** `review_cycles`, `performance_reviews`, `goals` + agente `agent-performance-writer`.
5. Reskin: `app/globals.css` + `tailwind.config.ts`.

## Qué NO cambiar
- Filtros de **Ofertas**: **se quedan en servidor** (query-params → Supabase + índices + paginación). Filtrar 10k ofertas en cliente no escala; la sensación instantánea se logra con **UI optimista / debounce**, no cargando el dataset al navegador.
- Comportamiento funcional del MVP en todo lo no listado aquí.

## Preguntas a resolver con el equipo de producto antes de construir
1. **Desempeño:** escala de rating (1–5 vs etiquetas), visibilidad por rol (manager/empleado/RRHH), ¿autoevaluación obligatoria?
2. **Motivos de descarte:** taxonomía final del enum.
3. **Entrevistas:** proveedor de calendario/vídeo (Google/Microsoft) y plantillas de email definitivas.
