# TalentOS · Notas de implementación (diseño → código)

Cómo leer este documento. Los mockups (`TalentOS App.dc.html`, `TalentOS Landing.dc.html`, `Sistema de Diseño.dc.html`) son **diseño**, no tocan tu repo. Tu MVP funcional sigue intacto. Aquí marco, por área:

- 🟢 **FUNCIONAL (MVP)** — ya existe en el código; el diseño solo lo re-viste. Hay que conservar el comportamiento.
- 🟡 **MEJORA (diseño)** — algo que añadí o cambié respecto al MVP. Si te gusta, hay que **pedírselo a la IA de la app** para que lo implemente.
- 🔴 **PENDIENTE** — pantalla del MVP que aún no he rediseñado.

---

## 0. Sistema visual — 🟡 todo nuevo
Reskin completo. Para aplicarlo sin tocar componentes, usa el bloque `globals.css` (mapeo shadcn) y el `tailwind.config` de **`Sistema de Diseño.dc.html` › sección Código**.
- Tipos: Archivo (display) / Hanken Grotesk (UI) / Space Mono (meta).
- Color: teal `#0E5C4A` (marca), coral `#F1543F` (acción), lima `#C6F24E` (positivo), papel cálido.
- Patrón de marca: botón primario con borde + sombra dura. Banner en degradado. Chips con check.

---

## 1. Ofertas (`/jobs`)
- 🟢 Segmentación por **estado + sector + departamento** (derivados de datos). Estados reales: `activa / borrador / cerrada` (draft/active/closed/archived).
- 🟢 Origen de oferta: `manual / import_xml / ai` (el badge "IA" = `source: 'ai'`).
- 🟢 Dos vías de creación: **Nueva oferta** (`/jobs/new`, agente) e **Importar** (`/jobs/import`).
- 🟢 **DECISIÓN — filtros para escalar: el filtrado vive en el SERVIDOR.** Mantener el modelo del MVP (query params → Supabase: `?status=&sector=&department=`) + índices + paginación. Filtrar todo en cliente **no escala** (no se cargan 10k ofertas en el navegador). La "sensación instantánea" que muestra el mock se logra con **UI optimista / debounce sobre la llamada al servidor**, no cargando el dataset completo. → No cambiar a client-side puro.
- 🟡 Datos de ejemplo del mock son ilustrativos (6 ofertas). Tus datos reales del seed son otros (Senior Frontend Engineer, CSM, Técnico Industrial…). No copiar los del mock.

## 2. Detalle de oferta (`/jobs/[id]`)
- 🟢 Pestaña **Pipeline** (kanban de la oferta), **Distribución** (canales) y **Descripción**.
- 🟢 **Distribución / Agente de canales**: recomendación por presupuesto + objetivo (volumen/calidad/CPA) usando performance histórica por canal/sector. Métricas por canal: views, aplicaciones, CPA. → corresponde a `agent-channel-optimizer` + `lib/data/channel-performance.ts`.
- 🟡 La maqueta de "Distribuir/Aplicar recomendación" es visual; conectar a la lógica real del agente.

## 3. Pipeline / Kanban (dentro del detalle de oferta)
- 🟢 Pipeline configurable por oferta. Etapas por defecto reales: **Aplicado · Screening · Entrevista · Oferta · Contratado · Descartado** (el mock ya incluye la columna **Descartado**, que antes faltaba).
- 🟢 **Hecho — drag & drop que NO se salta la trazabilidad.** Arrastrar una tarjeta a otra columna **abre el diálogo de motivo**; el movimiento solo se confirma desde ahí. Reemplaza al movimiento silencioso del mock anterior.
- 🟡 **DECISIÓN DE PRODUCTO — política de motivo (implementar así en la app):**
  1. **Siempre** se registra automático quién/cuándo/origen→destino (trazabilidad de base, sin fricción) → escribe en `applications.stage` + historial, como hoy (`PATCH /api/applications/[id]`).
  2. **Motivo obligatorio solo al mover a `Descartado`**, elegido de una **lista cerrada** + nota libre opcional. Para el resto de etapas el motivo/nota es **opcional** y no bloquea el avance.
  3. Lista de motivos de descarte del mock (ajústala a tu taxonomía): *No encaja con el perfil · Experiencia insuficiente · Expectativas salariales fuera de rango · Retiró su candidatura · Posición cubierta por otro candidato · Proceso pausado/cancelado · Otro*.
  - 👉 Cambio sugerido en el MVP: el campo `reason` del `PATCH` pasa de **texto libre siempre** a **`reason_code` (enum) requerido solo si destino = descartado** + `reason_note` opcional. Esto da **analítica limpia de rechazos** (motivos agregables) sin entorpecer el avance normal. El `notes-panel` ya cubre el texto libre interno (ver §5).
- 🟢 **Hecho — auto-scroll horizontal al arrastrar.** Al acercar la tarjeta a un borde del tablero, este hace scroll para alcanzar columnas ocultas (necesario al añadir Descartado = 6 columnas). Implementado con `onDragOver` + scroll por proximidad al borde.
  - ⚠️ **Móvil:** el HTML5 drag-and-drop no funciona en táctil. En la app real usar **dnd-kit** (o similar) que trae **auto-scroll táctil** integrado; el tablero ya es scrollable con el dedo (`overflow-x:auto; touch-action:pan-x`). El mock cubre desktop; el patrón móvil queda especificado aquí.

## 4. Candidatos (`/candidates`)
- 🟢 **Hecho.** "Candidatos" es ahora la **tabla global** de candidaturas (candidato, oferta, etapa, origen, fecha, fit), con filas que abren la ficha. El kanban vive solo dentro del detalle de oferta, como en el MVP.

## 5. Ficha de candidato (`/applications/[id]`)
- 🟢 **Perfil** (CV, skills, experiencia, contacto), **Entrevistas** (scheduling básico + plantillas de evaluación por etapa), **Historial** (eventos de cambio de etapa = trazabilidad).
- 🟢 **Análisis IA**: resume perfil, calcula fit (0–100), señala gaps y sugiere preguntas → `agent-candidate-analyzer`.
- 🟡 Añadí **desglose de fit por dimensiones** (skills/experiencia/liderazgo con barras). El MVP da un fit único 0–100; el desglose es mejora — **`agent-candidate-analyzer` debe exponer sub-scores** (p. ej. `{ skills, experience, leadership }`), no solo el total, para que la recomendación sea explicable.
- 🟢 **Entrevistas — ampliado a estándar ATS** (sobre el `scheduling básico` del MVP `interview-panel.tsx`):
  - **CTA contextual:** cuando un candidato entra a la etapa **Entrevista** sin ninguna agendada, su pestaña Entrevistas muestra un aviso (coral) **"En Entrevista, sin agenda"** con botón **Agendar entrevista**.
  - **Agendar manualmente:** tipo de entrevista · fecha + hora (pickers nativos) · duración · **entrevistador/a** · **otros participantes** (multi) · confirmar **nombre + email** del candidato · **vista previa del email** en vivo → *Enviar invitación*.
  - **Enviar disponibilidad:** elegir entrevistador + **huecos**; el candidato recibe un enlace y elige → la invitación se crea al confirmar.
  - 👉 Implementación: el MVP ya tiene `POST /api/interviews` (`scheduled_at`, `interviewer`, `meeting_url`, `stage_id`). Añadir: **participantes** (tabla `interview_participants` o `participants[]`), **plantilla de email** del candidato, **modo disponibilidad** (slots propuestos + token público para que el candidato elija) e integración de **calendario/Meet** (auto-crear enlace). Mantener el feedback estructurado por plantilla que ya existe.
- 🟢 **Hecho — pestaña Notas.** Composer de nota interna + lista (cuerpo, autor, fecha). Mapea directo a `notes-panel.tsx` + `POST /api/applications/[id]/notes`. Marcado "solo el equipo · no visible para el candidato".
- 🟡 Datos de contacto/experiencia del mock son placeholders.

## 6. Empleados (`/employees`) y Ficha (`/employees/[id]`)
- 🟢 Directorio con ficha. 🟢 Continuidad **candidato → empleado** al contratar (sin re-introducir datos). 🟢 Documentos por empleado.
- 🟢 **Hecho** (ficha de empleado): pestañas Información, Documentos, Onboarding (checklist con progreso, generado por IA), Vacaciones y Horas.
- 🔴 **NET-NEW — pestaña Desempeño.** Confirmado que **no existe** en el MVP (no hay tabla ni flujo; "performance" en el código es solo de canales, y las plantillas de evaluación son de entrevistas). La maqueté como **feature nueva a construir**:
  - **Ciclo actual** (p. ej. "H1 2026 · Revisión 360 · cierra 30 jun"), **valoración global** (escala 1–5 + etiqueta) y **próximo 1:1**.
  - **Objetivos del ciclo (OKR)** con progreso % y estado (En curso / En riesgo).
  - **Feedback / 1:1s** (manager + autoevaluación, con fecha). **Clic en una review → detalle del cuestionario completo** (todas las preguntas con su rating en estrellas + comentario), igual que el estándar de mercado (Lattice/15Five).
  - 🤖 **IA en desempeño (decidido: sí) — "Agente de desempeño".** Patrón: el agente **redacta el borrador de la review** agregando feedback de manager + autoevaluación + 1:1s + progreso de objetivos, y propone **fortalezas, áreas de crecimiento y un rating sugerido**. El manager **edita y aprueba** (decisión humana, como los otros 3 agentes). Maquetado como panel oscuro "Agente · Borrador" con "Usar como borrador de review".
  - 👉 Requiere modelo nuevo: `review_cycles`, `performance_reviews` (rating + cycle + reviewer + answers[]), `goals` (title, progress, status, owner) y un **`agent-performance-writer`** (mismo patrón que `agent-job-writer`: heurística sin LLM como fallback, salida siempre editable).
  - **A confirmar:** escala de rating (1–5 vs etiquetas), ¿quién ve qué (manager/empleado/RRHH)?, ¿autoevaluación obligatoria?

## 7. HRIS: Organigrama, Vacaciones, Timesheets, Onboarding
- 🟢 Organigrama (quién reporta a quién) · Vacaciones (solicitud/aprobación/saldo) · Timesheets (registro de horas) · Onboarding (checklist por rol, asignación, estado) → `agent-onboarding-builder`.
- 🟢 **Hecho**: **Timesheets** (`/timesheets`) ya es sección propia ("Horas" en el sidebar) con resumen semanal y tabla por empleado (horas + estado), aparte de Vacaciones.
- 🟡 En el mock, "Por hacer" y "Hoy en el equipo" del Dashboard son una composición de diseño; ajustar a los widgets reales de tu dashboard.

## 8. Ajustes (`/settings`)
- 🟢 Datos de empresa, **slug del career site**, descripción editable. Datos del mock = placeholders.

## 9. Bloque público — Login + Career site (`/login`, `/careers/[slug]`, `/careers/[slug]/jobs/[id]`)
- 🟢 **Hecho** — nuevo archivo `TalentOS Career.dc.html` (otro shell: chrome de navegador + 3 rutas conmutables).
- 🟢 **Login** (`/login`): TalentOS, "Accede a tu workspace" / "Crea tu cuenta", Email + Contraseña, "Entrar" / "Crear cuenta", toggle signin↔signup. Fiel a `login-form.tsx`.
- 🟢 **Career site** (`/careers/[slug]`): cabecera "Trabaja en {empresa}" (logo, descripción), "N posiciones abiertas", tarjetas con título / ubicación / tipo (`full_time`→Jornada completa…) / salario / 3 primeras skills, footer "Powered by TalentOS". Fiel a `careers/[slug]/page.tsx`.
- 🟢 **Oferta pública + Aplicar** (`/careers/[slug]/jobs/[id]`): volver a "Todas las posiciones de {empresa}", título + meta (ubicación/tipo/salario) + skills + descripción; formulario con **los campos exactos** de `apply-form.tsx` (Nombre*, Email*, Teléfono, Ubicación, Años exp., CV, Skills, resumen) → "Enviar candidatura" → estado de éxito. El chip "origen registrado · career_site" refleja la **propagación de UTM + origen** del MVP.
- 🟡 Datos del mock (3 ofertas: Senior Frontend, CSM, Técnico Industrial; empresa "Acme Talent") son ilustrativos — vienen de Supabase en el MVP. No copiar.
- 🟡 Detalles solo-mock que el MVP no tiene: subtítulo de éxito "Recibirás una copia en tu email", el degradado lima de la cabecera, y el chip de RGPD bajo el formulario. Visuales — implementables si gustan.
- 🟡 El MVP valida en el form (password mín. 6, spinner de envío, mensajes de error). El mock no los muestra; conservarlos.

---

## 10. Agentes en contexto (auditoría) — los 4 agentes, dónde viven
Principio: **agentes en-flujo, no chatbot.** El consejo aparece en el punto de decisión; la acción siempre es humana. Lenguaje visual común: **panel oscuro "Agente · Propone" + sello "tú decides"** (o variante clara *hint* para asistencia ligera). Ver card **"Agente en contexto"** en `Sistema de Diseño.dc.html`.

| Agente (MVP) | Dónde, en la app | Estado en el mock |
|---|---|---|
| `agent-job-writer` | Nueva oferta — rail "Agente redactor" (borrador + rango de mercado) | 🟢 panel hecho |
| `agent-channel-optimizer` | Detalle de oferta › Distribución — "Agente de canales" (plan por objetivo/presupuesto) | 🟢 panel hecho |
| `agent-candidate-analyzer` | Ficha de candidato › Análisis IA — "Agente de análisis" (fit + gaps + preguntas) | 🟢 panel hecho · 🟡 falta exponer **sub-scores** (ver §5) |
| `agent-onboarding-builder` | Ficha de empleado › Onboarding | 🟢 **añadido ahora** el affordance de agente (hint + "Regenerar con IA"), antes solo decía "generado por IA". Paridad con `onboarding-panel.tsx` |
| `agent-performance-writer` *(net-new)* | Ficha de empleado › Desempeño — "Agente de desempeño" (borrador de review) | 🔴 propuesto + maquetado; no existe en el MVP (ver §6) |

- 🟡 Dónde **el MVP ya está avanzado** y solo hay que conectar la maqueta a la lógica real: job-writer, channel-optimizer, candidate-analyzer y onboarding-builder ya existen como agentes (`/agents/*` + sus rutas `/api/agents/*`). El mock es fiel; falta cablear botones (p. ej. "Aplicar recomendación", "Regenerar").
- 🔴 Dónde **hay que construir**: el agente de **desempeño** (modelo + agente nuevos).

## Requisitos funcionales a no perder (resumen)
1. **4 agentes en-flujo** (no chatbot): `job-writer`, `channel-optimizer`, `candidate-analyzer`, `onboarding-builder`. Decisión siempre humana.
2. **Mover de etapa = trazable.** Siempre se registra quién/cuándo/origen→destino. **Motivo obligatorio (enum) solo al descartar**; opcional en el resto (ver §3).
3. **Fit score 0–100** y matching candidato↔oferta.
4. **Candidato → empleado** sin recapturar datos.
5. **UTM de origen** en candidaturas del career site.
6. Importación (XML/CSV/Excel/URL) con **normalización + deduplicación** al schema interno.

## Mejoras de diseño — estado tras esta ronda
**Aprobadas e implementadas en el mock (a portar a la app):**
- ✅ Drag & drop en el kanban **con diálogo de motivo** (motivo enum obligatorio solo al descartar + nota opcional; siempre auto-log de quién/cuándo) + **auto-scroll** al arrastrar.
- ✅ **Entrevistas estándar ATS**: CTA contextual + agendar manual (preview de email, participantes) + enviar disponibilidad.
- ✅ Pestaña **Notas internas** en la ficha de candidato (→ `notes-panel`).
- ✅ Pestaña **Desempeño** (**net-new**) con **detalle de cuestionario** + **Agente de desempeño** (borrador de review por IA).
- ✅ Desglose de **fit por dimensiones** (requiere sub-scores del `agent-candidate-analyzer`).
- ✅ Paneles de **agente en contexto** unificados (los 4 + el nuevo de desempeño); affordance añadido en **Onboarding**.
- ✅ Sistema visual nuevo + cards de componentes (diálogo, nota, desempeño, **agente en contexto**) en `Sistema de Diseño.dc.html`.

**Decisiones de arquitectura:**
- Filtros de Ofertas: **se quedan en servidor** (escala); la instantaneidad es UI optimista, no carga client-side. Ver §1.
- Kanban en **móvil**: usar dnd-kit con auto-scroll táctil (el HTML5 DnD no aplica en touch). Ver §3.

**Pendiente de tu confirmación:**
- Alcance de **Desempeño**: escala de rating, visibilidad (manager/empleado/RRHH), ¿autoevaluación obligatoria?
- Taxonomía final de **motivos de descarte**.
- Detalles de **Entrevistas**: proveedor de calendario/vídeo (Google/Microsoft) y plantillas de email.
