# Plataforma de Evaluación de Desempeño
## Definición funcional completa (módulos, flujos, estados y reglas)

---

## 1. Mapa de módulos

| # | Módulo | Propósito |
|---|--------|-----------|
| 1 | Configuración y catálogos | Definir el "cómo se evalúa" antes de lanzar nada |
| 2 | Datos maestros e integración | Población, jerarquía, sincronización con HRIS |
| 3 | Gestión de objetivos | OKR / KPI / metas SMART con seguimiento |
| 4 | Feedback continuo y 1:1 | Evidencia acumulada entre ciclos |
| 5 | Ciclo de evaluación | El proceso formal de punta a punta |
| 6 | Calibración | Consistencia entre evaluadores |
| 7 | Resultados y consecuencias | Rating final, compensación, sucesión, PIP |
| 8 | Desarrollo (IDP) | Qué pasa después de la nota |
| 9 | Analítica y reportes | Visibilidad por rol |
| 10 | Notificaciones y automatización | Que el ciclo no se caiga por olvido |
| 11 | Seguridad, permisos y auditoría | Confidencialidad y cumplimiento |
| 12 | Capa de IA | Asistencia en redacción, síntesis y detección de sesgo |

---

## 2. Módulo 1: Configuración y catálogos

### 2.1 Catálogo de competencias
- Competencia: nombre, definición, categoría (core / funcional / liderazgo / valores).
- Anclas conductuales por nivel (ej. 5 niveles con descripción observable de cada uno).
- Asignación por: familia de puesto, nivel jerárquico, unidad de negocio, país.
- Versionado: una competencia editada no debe alterar ciclos ya cerrados. Cada ciclo congela la versión vigente.
- Importación masiva vía CSV y mapeo contra marcos externos (ESCO, Lightcast) si se quiere reutilizar la normalización de skills.

### 2.2 Escalas de calificación
- Tipos: numérica (1-5, 1-4 sin punto medio, 1-10), Likert cualitativa, binaria (cumple / no cumple), porcentual.
- Etiqueta y descripción por punto de la escala.
- Opción "No aplica / No tengo elementos" que se excluye del promedio.
- Configuración de decimales y método de redondeo.
- Escalas distintas por sección (competencias en 1-5, objetivos en % de cumplimiento).

### 2.3 Plantillas de formulario
- Composición por secciones: objetivos, competencias, valores, preguntas abiertas, potencial, movilidad.
- Tipos de campo: escala, texto libre, selección única/múltiple, ranking, matriz, adjunto.
- Campos obligatorios y longitud mínima de comentario (ej. comentario obligatorio si calificación es extrema, alta o baja).
- Lógica condicional: mostrar sección solo si el evaluado es manager, o si tiene más de 6 meses de antigüedad.
- Plantillas diferenciadas por audiencia: la autoevaluación, la del jefe y la de pares pueden ver preguntas distintas sobre el mismo evaluado.
- Multi-idioma por campo, con idioma por defecto y fallback.

### 2.4 Definición del ciclo
- Tipo: anual, semestral, trimestral, continuo (rolling), por aniversario de ingreso, por proyecto.
- Población objetivo: reglas de elegibilidad por antigüedad mínima, tipo de contrato, país, área, nivel, estado del empleado.
- Fuentes de evaluación activas: autoevaluación, jefe directo, jefe del jefe, pares, reportes directos, clientes internos, externos.
- Ponderación por fuente y por sección (ej. objetivos 60%, competencias 30%, valores 10%; dentro de competencias, jefe 70% / pares 20% / auto 10%).
- Número mínimo y máximo de evaluadores por tipo, y umbral mínimo de respuestas para que un bloque anónimo se muestre (típicamente 3).
- Calendario por fase con fecha de inicio, fecha límite y periodo de gracia.
- Visibilidad de resultados: qué ve el empleado, qué ve el manager, qué queda solo para RRHH.

### 2.5 Roles del sistema
- Admin global, Admin RRHH por país/unidad, HRBP, Manager, Empleado, Evaluador externo, Facilitador de calibración, Comité, Auditor (solo lectura).
- Matriz de permisos configurable por acción y por alcance (propio / equipo directo / equipo extendido / unidad / global).

---

## 3. Módulo 2: Datos maestros e integración

- Sincronización con HRIS: empleado, puesto, nivel, manager, unidad, ubicación, fecha de ingreso, tipo de contrato, estado.
- Organigrama derivado de la relación manager-empleado, con soporte para matriz (jefe funcional + jefe de proyecto) y evaluación por ambos.
- Snapshot de población al lanzar el ciclo. Los cambios posteriores no reasignan automáticamente, se gestionan por excepción.
- Gestión de cambios a mitad de ciclo:
  - Cambio de manager: opción de mantener al evaluador original, transferir al nuevo, o solicitar evaluación parcial a ambos con ponderación por tiempo.
  - Promoción o cambio de puesto: decidir si se cambia el modelo de competencias o se congela el original.
  - Baja del empleado: excluir, o cerrar el formulario en estado "evaluación parcial".
  - Baja del evaluador: reasignación automática al superior jerárquico.
  - Licencia larga o maternidad: exclusión automática con marca y justificación.
- SSO (SAML / OIDC), aprovisionamiento SCIM, API REST y webhooks para eventos del ciclo.

---

## 4. Módulo 3: Gestión de objetivos

### 4.1 Modelo de datos
- Objetivo: título, descripción, tipo (cuantitativo / cualitativo), métrica, línea base, meta, umbral mínimo, umbral de sobrecumplimiento, unidad, peso, fecha de inicio y fin, responsable, objetivo padre.
- Key results o hitos anidados, con avance propio que agrega al padre.
- Visibilidad: privado, equipo, público.
- Tipos: individual, compartido entre varios responsables, de equipo (heredado a todos los miembros).

### 4.2 Flujo de definición
1. RRHH o dirección publica objetivos estratégicos de nivel 0.
2. Cada manager crea sus objetivos alineados al nivel superior (cascada).
3. El empleado propone sus objetivos individuales o los recibe en cascada.
4. Estados: Borrador → Enviado a aprobación → Devuelto con comentarios → Aprobado → Activo.
5. Validación automática: la suma de pesos debe dar 100%, y cada objetivo debe tener métrica y fecha.
6. Bloqueo del ciclo de evaluación si el empleado no tiene objetivos aprobados.

### 4.3 Seguimiento
- Check-ins con frecuencia configurable: avance %, estado semáforo (en curso / en riesgo / bloqueado / logrado / cancelado), comentario y evidencia adjunta.
- Historial completo de actualizaciones con autor y fecha.
- Modificación a mitad de ciclo con flujo de aprobación y motivo obligatorio, quedando registro del valor anterior.
- Cálculo automático de cumplimiento al cierre: % logrado sobre meta, ajustado por umbrales y peso.
- Objetivos cancelados por decisión de negocio: se excluyen del cálculo y se redistribuye el peso.

---

## 5. Módulo 4: Feedback continuo y 1:1

- Feedback espontáneo: cualquier persona da feedback a otra, vinculable a una competencia o valor, con visibilidad configurable (solo receptor / receptor y su manager / público).
- Feedback solicitado: el empleado o su manager pide feedback a personas específicas sobre un tema, con fecha límite.
- Reconocimientos públicos asociados a valores de la compañía, con muro visible y notificación al manager.
- Bitácora privada del manager: notas sobre cada reporte, no visibles para el empleado, recuperables al momento de evaluar (combate el sesgo de recencia).
- Módulo 1:1: agenda compartida, temas propuestos por ambos, notas, acuerdos con responsable y fecha, seguimiento de acuerdos pendientes en la siguiente reunión.
- Todo el feedback acumulado en el periodo se muestra como panel lateral de consulta durante el llenado del formulario de evaluación.

---

## 6. Módulo 5: Ciclo de evaluación (flujo principal)

### Fase 0. Preparación
Actor: Admin RRHH.
1. Crear ciclo a partir de plantilla o duplicando el anterior.
2. Ejecutar reglas de elegibilidad y previsualizar la población resultante.
3. Revisar excepciones detectadas: empleados sin manager, managers con más de N reportes, empleados con antigüedad limítrofe, duplicados.
4. Simulación en modo prueba con un grupo piloto.
5. Comunicación previa y lanzamiento.
Estado del ciclo: Borrador → Configurado → Piloto → Activo.

### Fase 1. Nominación de evaluadores (solo si hay 360)
1. El empleado propone sus pares y clientes internos, con mínimo y máximo definidos.
2. El manager aprueba, rechaza o añade evaluadores.
3. RRHH puede intervenir en casos de conflicto de interés (familiares, misma persona nominándose en reciprocidad excesiva).
4. Cierre de la nominación y congelación de la lista.
Estados por evaluador: Propuesto → Aprobado / Rechazado → Invitado.

### Fase 2. Autoevaluación
1. El empleado responde su formulario con acceso a: objetivos del periodo y su avance, feedback recibido, evaluación anterior, plan de desarrollo previo.
2. Guardado automático como borrador, posibilidad de retomar.
3. Validaciones al enviar: campos obligatorios completos, longitud mínima de comentarios.
4. Envío irreversible salvo reapertura por RRHH con registro de auditoría.
Estados: No iniciada → En progreso → Enviada.

### Fase 3. Evaluaciones de terceros
- El jefe directo evalúa objetivos y competencias, con visibilidad opcional de la autoevaluación (configurable: antes, después o nunca).
- Pares y reportes directos responden formularios reducidos, con anonimato configurable.
- Panel del manager con avance de todas sus evaluaciones pendientes y acciones masivas.
- Regla de umbral: si un bloque anónimo no alcanza el mínimo de respuestas, no se muestra y su peso se redistribuye.
Estados por formulario: Pendiente → En progreso → Enviado → Vencido.

### Fase 4. Calibración
Ver módulo 6.

### Fase 5. Aprobación jerárquica
1. El jefe del jefe revisa las evaluaciones del equipo extendido.
2. Aprueba, o devuelve al manager con comentarios y motivo.
3. RRHH da visto bueno final antes de liberar.
Estados: En revisión → Devuelta → Aprobada.

### Fase 6. Reunión de retroalimentación
1. El sistema libera al manager la vista consolidada y una guía de conversación.
2. Se agenda la reunión (integración con calendario).
3. El manager registra que la conversación ocurrió, con fecha y notas.

### Fase 7. Acuse del empleado
1. El empleado accede al resultado publicado.
2. Puede añadir comentarios de cierre y, si aplica, ejercer derecho a réplica o desacuerdo formal.
3. Firma electrónica o acuse de recibo con sello de tiempo.
4. El desacuerdo abre un caso para HRBP con flujo propio de resolución.

### Fase 8. Cierre
1. Cálculo y congelación del rating final.
2. Publicación de resultados según matriz de visibilidad.
3. Bloqueo de edición, archivado y generación del PDF del expediente.
4. Encuesta de satisfacción del proceso a participantes.

### Fase 9. Derivación
- Generación automática del plan de desarrollo individual.
- Alimentación de los procesos de compensación, sucesión y PIP.

---

## 7. Módulo 6: Calibración

- Creación de sesiones por unidad, área o nivel, con facilitador asignado y lista de participantes.
- Vista de sesión: tabla de todos los evaluados con rating propuesto, histórico, tiempo en el puesto, evaluador y notas.
- Matriz 9-box: desempeño en un eje, potencial en el otro, con arrastre de personas entre celdas.
- Distribución objetivo: sin restricción, guiada (se muestra la desviación respecto a la curva sugerida) o forzada (bloquea el envío si no se cumple).
- Ajuste de calificación con motivo obligatorio y registro de quién lo hizo, valor anterior y valor nuevo.
- Comparativa entre evaluadores para detectar severidad o benevolencia sistemática (promedio y desviación por manager frente a la media del área).
- Detección de patrones: calificaciones idénticas para todo el equipo, comentarios muy cortos, todas las respuestas en el mismo punto de la escala.
- Acta de la sesión con decisiones y asistentes.
- Estados: Programada → En curso → Cerrada → Aprobada.

---

## 8. Módulo 7: Resultados y consecuencias

### 8.1 Cálculo del rating
- Score por sección, ponderado por la configuración del ciclo.
- Score final normalizado a la escala institucional y traducido a etiqueta (ej. Excede, Cumple plenamente, Cumple, En desarrollo, No cumple).
- Ajuste manual permitido solo en calibración, con trazabilidad.
- Recálculo automático si se reabre un formulario.

### 8.2 Vinculación con compensación
- Matriz de mérito: cruce entre rating y posición en banda salarial (compa-ratio) que sugiere el % de incremento.
- Cálculo de bono por cumplimiento de objetivos individuales combinado con resultado de compañía.
- Simulador de presupuesto para el manager con tope por área.
- Flujo de aprobación de propuestas de incremento.

### 8.3 Talento y sucesión
- Marcado de talento clave y riesgo de fuga.
- Mapa de sucesión por posición crítica, con candidatos y grado de preparación (listo ya / 1-2 años / 3+ años).
- Alertas sobre posiciones críticas sin sucesor identificado.

### 8.4 Plan de mejora (PIP)
- Disparo automático si el rating cae bajo un umbral.
- Definición de objetivos de mejora, hitos, fechas de revisión, apoyo comprometido y consecuencias.
- Revisiones periódicas obligatorias con registro.
- Cierre con resultado: superado, extendido, no superado.

---

## 9. Módulo 8: Desarrollo individual

- IDP generado desde las brechas de competencias detectadas en la evaluación.
- Acciones categorizadas 70/20/10: experiencia, exposición, formación.
- Cada acción con responsable, fecha objetivo, recurso asociado y estado.
- Catálogo de acciones sugeridas por competencia y por nivel de brecha.
- Integración con LMS: asignación de cursos y retorno del estado de finalización.
- Programa de mentoring: emparejamiento, objetivos, seguimiento de sesiones.
- Revisión del IDP en los 1:1 y arrastre del cumplimiento al ciclo siguiente.

---

## 10. Módulo 9: Analítica y reportes

### Por rol
- **Empleado**: resultado propio, evolución histórica, comparativa auto vs otros, brechas, avance del IDP.
- **Manager**: avance de completitud de su equipo, distribución de calificaciones, comparativa con el área, alertas de bajo desempeño, brechas agregadas.
- **HRBP**: avance por área y por manager, participación, calidad de comentarios, casos de desacuerdo, excepciones abiertas.
- **Dirección**: distribución global, 9-box consolidado, mapa de talento, comparativa entre unidades y países, evolución interanual.

### Indicadores clave
- Tasa de completitud por fase, área, manager y país.
- Tiempo medio de cierre por fase y cuellos de botella.
- Distribución de calificaciones y desviación por evaluador.
- Correlación entre desempeño y rotación, compensación, promoción, engagement.
- Cobertura de objetivos: % de empleados con objetivos aprobados a tiempo.
- Brechas de competencia agregadas, mapa de calor por área.
- Índice de calidad del feedback: longitud, especificidad, presencia de ejemplos.

### Entregables
- Exportación a CSV y Excel con filtros aplicados.
- Reportes programados por correo.
- API de consulta para BI externo (Power BI, Looker).
- PDF individual del expediente de evaluación.

---

## 11. Módulo 10: Notificaciones y automatización

- Eventos notificables: lanzamiento del ciclo, apertura de fase, asignación de evaluación, recordatorio previo al vencimiento, vencimiento, devolución para corrección, publicación de resultado, acuerdo de 1:1 pendiente, check-in de objetivo vencido.
- Cadencia escalonada: recordatorio a 7, 3 y 1 día, luego escalamiento al superior jerárquico y a HRBP.
- Canales: correo, notificación in-app, Slack, Teams, WhatsApp, push móvil.
- Plantillas editables por idioma y por evento.
- Digest semanal para managers con lo pendiente de su equipo.
- SLA por fase con panel de incumplimientos.
- Preferencias de notificación por usuario, respetando los avisos obligatorios.

---

## 12. Módulo 11: Seguridad, permisos y auditoría

- Matriz de visibilidad detallada: qué campo ve cada rol en cada fase. La autoevaluación puede estar oculta al jefe hasta que él envíe la suya, para evitar anclaje.
- Anonimato real en 360: no exponer identidad ni orden de respuesta, agrupar comentarios y aplicar umbral mínimo.
- Log de auditoría inmutable: quién vio, editó, calificó, reabrió, exportó y cuándo.
- Retención documental configurable por país y borrado seguro al vencimiento.
- Cumplimiento GDPR / LOPD: derecho de acceso, rectificación, portabilidad y oposición al tratamiento automatizado.
- Cifrado en tránsito y en reposo, segregación de datos por tenant.
- Firma electrónica con sello de tiempo para el acuse.
- Control de exportaciones masivas con alerta a seguridad.

---

## 13. Módulo 12: Capa de IA

- Asistente de redacción: convierte notas sueltas en feedback estructurado con situación, comportamiento e impacto.
- Detector de sesgo y lenguaje problemático: señala comentarios sobre rasgos de personalidad en lugar de conductas, lenguaje con sesgo de género, generalizaciones sin ejemplo.
- Resumen consolidado de múltiples evaluadores en una síntesis de fortalezas y áreas de mejora, sin romper el anonimato.
- Sugerencia de objetivos a partir del puesto, el nivel y los objetivos del área.
- Sugerencia de acciones de desarrollo según la brecha detectada.
- Guía de conversación personalizada para el 1:1 de retroalimentación.
- Resumen ejecutivo del ciclo para dirección.
- Regla transversal: la IA propone, nunca califica ni decide. Todo output es editable y queda marcado como asistido.

---

## 14. Máquina de estados resumida

**Ciclo**: Borrador → Configurado → Piloto → Activo → En calibración → En aprobación → Publicado → Cerrado → Archivado.

**Formulario individual**: No iniciado → En progreso → Enviado → En calibración → Ajustado → Aprobado → Publicado → Acusado → Cerrado. Rutas alternas: Devuelto, Vencido, Reabierto, Excluido.

**Objetivo**: Borrador → En aprobación → Devuelto → Activo → En riesgo → Logrado / No logrado / Cancelado → Evaluado.

**PIP**: Iniciado → En seguimiento → En revisión → Superado / Extendido / No superado.

---

## 15. Casos borde a resolver explícitamente

1. Empleado sin manager asignado en el organigrama.
2. Manager con más de 30 reportes directos (carga inviable, requiere delegación).
3. Evaluador que deja la compañía a mitad del ciclo.
4. Empleado que cambia de área durante el periodo evaluado.
5. Autoevaluación enviada pero evaluación del jefe nunca completada.
6. Evaluador que responde todo con la misma calificación.
7. Empleado con menos de 3 meses en el puesto.
8. Conflicto de interés declarado entre evaluador y evaluado.
9. Desacuerdo formal del empleado con el resultado.
10. Necesidad de reabrir un ciclo ya cerrado por error material.
11. Empleado con doble reporte (funcional y jerárquico).
12. Evaluaciones en zonas horarias distintas cerca del vencimiento.
13. Empleado en licencia durante toda la fase de autoevaluación.
14. Umbral de anonimato no alcanzado en el bloque de pares.

---

## 16. Requisitos no funcionales

- Multi-tenant con aislamiento de datos.
- Multi-idioma y multi-país (formatos de fecha, zonas horarias, moneda para compensación).
- Móvil primero para las acciones de alto volumen: feedback, check-in, acuse, aprobación.
- Accesibilidad WCAG 2.1 AA.
- Rendimiento: soportar picos de concurrencia en los últimos días de cada fase.
- Guardado automático y recuperación ante pérdida de conexión.
- Historial completo consultable de al menos 5 ciclos.

---

## 17. Priorización sugerida por fases de producto

**MVP**
Configuración de ciclo, plantillas básicas, autoevaluación, evaluación del jefe, cálculo de rating, notificaciones, dashboard de avance, exportación.

**V2**
Objetivos con check-ins, 360 con nominación, calibración con 9-box, feedback continuo, analítica por rol.

**V3**
Compensación, sucesión, PIP, IDP con integración LMS, capa de IA completa, API pública.
