# Plataforma de Evaluación de Desempeño
## Backlog: épicas, historias de usuario, casos de uso y criterios de aceptación

**Convenciones**

- ID de épica: `EP-XX`. ID de historia: `EP-XX-NN`.
- Prioridad: `MVP`, `V2`, `V3`.
- Actores: Admin RRHH, HRBP, Manager, Empleado, Evaluador externo, Facilitador de calibración, Dirección, Auditor, Sistema.
- Criterios de aceptación en formato Dado / Cuando / Entonces.
- Toda historia asume: usuario autenticado, permisos válidos, acción registrada en log de auditoría.

**Definition of Ready**: historia con criterios de aceptación cerrados, diseño enlazado, dependencias resueltas, impacto en modelo de datos identificado.

**Definition of Done**: código en main, pruebas unitarias y e2e del happy path, criterios verificados por QA, textos en ES/EN, evento de analítica instrumentado, documentación de API actualizada.

---

# EP-01. Configuración de ciclo y catálogos

**Objetivo**: permitir que RRHH defina el modelo de evaluación sin depender de desarrollo.
**Actor principal**: Admin RRHH.
**Valor**: sin este módulo, cada cliente requiere customización. Es la base de la escalabilidad multi-tenant.

---

### EP-01-01. Crear y administrar catálogo de competencias
**Prioridad**: MVP

**Historia**
Como Admin RRHH quiero crear y mantener un catálogo de competencias con sus anclas conductuales para poder reutilizarlas en distintos ciclos y perfiles.

**Casos de uso**
- CU1: crear competencia nueva con definición y niveles.
- CU2: editar competencia usada en un ciclo activo.
- CU3: importar competencias masivamente desde CSV.
- CU4: desactivar competencia obsoleta.

**Criterios de aceptación**
1. Dado que estoy en el catálogo, cuando creo una competencia, entonces debo indicar nombre, definición, categoría (core, funcional, liderazgo, valores) y al menos dos anclas conductuales.
2. Dado que una competencia ya se usó en un ciclo cerrado, cuando la edito, entonces el sistema crea una versión nueva y el ciclo cerrado conserva la versión original.
3. Dado que una competencia está en uso en un ciclo activo, cuando intento eliminarla, entonces el sistema lo impide y ofrece desactivarla para futuros ciclos.
4. Dado un archivo CSV con columnas válidas, cuando lo importo, entonces el sistema muestra una previsualización con filas válidas y filas con error antes de confirmar.
5. Dado un CSV con filas inválidas, cuando confirmo la importación, entonces se importan solo las válidas y se descarga un archivo con el detalle de los errores.
6. Dado que desactivo una competencia, entonces deja de aparecer en el selector de plantillas nuevas pero sigue visible en resultados históricos.

---

### EP-01-02. Asignar competencias por perfil
**Prioridad**: MVP

**Historia**
Como Admin RRHH quiero asignar conjuntos de competencias según familia de puesto, nivel y unidad para que cada persona sea evaluada con criterios pertinentes a su rol.

**Casos de uso**
- CU1: crear un modelo de competencias para "Managers de tecnología".
- CU2: un empleado que cumple varias reglas.
- CU3: un empleado que no cumple ninguna regla.

**Criterios de aceptación**
1. Dado que creo un modelo, cuando defino criterios de asignación (familia de puesto, nivel, unidad, país), entonces el sistema muestra la cantidad de empleados que quedarían asignados.
2. Dado un empleado que cumple dos modelos, cuando se resuelve la asignación, entonces se aplica el modelo con mayor especificidad y el sistema registra la regla aplicada.
3. Dado un empleado que no cumple ninguna regla, cuando se lanza el ciclo, entonces aparece en la lista de excepciones y se le asigna el modelo por defecto.
4. Dado un modelo asignado, cuando lo consulto, entonces veo la lista de personas afectadas y puedo exportarla.

---

### EP-01-03. Definir escalas de calificación
**Prioridad**: MVP

**Historia**
Como Admin RRHH quiero configurar escalas de calificación con etiquetas y descripciones para adaptar el lenguaje de evaluación a la cultura de la organización.

**Casos de uso**
- CU1: crear escala 1-5 con etiquetas.
- CU2: activar opción "No aplica".
- CU3: usar escalas distintas por sección.

**Criterios de aceptación**
1. Dado que creo una escala, cuando defino los puntos, entonces cada punto exige valor numérico, etiqueta y descripción opcional.
2. Dado que activo la opción "No aplica", cuando un evaluador la selecciona, entonces esa respuesta se excluye del cálculo del promedio y no cuenta como respuesta faltante.
3. Dado que configuro decimales y redondeo, cuando se calcula un score, entonces se aplica la regla configurada de forma consistente en formulario, reportes y exportación.
4. Dado que una escala está en uso en un ciclo activo, cuando la edito, entonces el sistema bloquea el cambio y ofrece duplicarla.

---

### EP-01-04. Construir plantillas de formulario
**Prioridad**: MVP

**Historia**
Como Admin RRHH quiero construir plantillas con secciones y preguntas para definir qué responde cada tipo de evaluador.

**Casos de uso**
- CU1: crear plantilla de autoevaluación.
- CU2: crear plantilla de jefe con secciones adicionales.
- CU3: previsualizar el formulario como lo verá el evaluador.

**Criterios de aceptación**
1. Dado el constructor de plantillas, cuando agrego una sección, entonces puedo elegir su tipo (objetivos, competencias, valores, preguntas abiertas, potencial) y asignarle un peso.
2. Dado que agrego preguntas, entonces dispongo de los tipos: escala, texto libre, selección única, selección múltiple, matriz y adjunto.
3. Dado que marco una pregunta como obligatoria, cuando el evaluador intenta enviar sin responderla, entonces el sistema bloquea el envío y señala el campo.
4. Dado que configuro longitud mínima de comentario, cuando el evaluador escribe menos caracteres, entonces se muestra el contador en rojo y no se permite enviar.
5. Dado que la suma de pesos de las secciones no es 100%, cuando intento publicar la plantilla, entonces el sistema lo impide con un mensaje explícito.
6. Dado que uso la previsualización, entonces veo el formulario exactamente como lo verá el evaluador, sin poder guardar respuestas.

---

### EP-01-05. Lógica condicional en formularios
**Prioridad**: V2

**Historia**
Como Admin RRHH quiero mostrar u ocultar secciones según atributos del evaluado para no preguntar cosas irrelevantes.

**Criterios de aceptación**
1. Dado que configuro una condición, entonces puedo usar atributos del evaluado: es manager, antigüedad, nivel, unidad, país.
2. Dado un evaluado que no cumple la condición, cuando abre el formulario, entonces la sección no se muestra ni se cuenta como pendiente.
3. Dado que una sección oculta tiene peso, cuando se calcula el score, entonces el peso se redistribuye proporcionalmente entre las secciones visibles.
4. Dado que configuro condiciones contradictorias, cuando publico, entonces el sistema advierte que el formulario quedaría vacío para algunos perfiles.

---

### EP-01-06. Configurar el ciclo de evaluación
**Prioridad**: MVP

**Historia**
Como Admin RRHH quiero configurar un ciclo con fases, fechas, fuentes de evaluación y ponderaciones para lanzar el proceso completo.

**Casos de uso**
- CU1: crear ciclo desde cero.
- CU2: duplicar el ciclo anterior.
- CU3: modificar fechas de un ciclo activo.

**Criterios de aceptación**
1. Dado que creo un ciclo, entonces debo definir nombre, periodo evaluado, tipo (anual, semestral, trimestral, por aniversario) y población objetivo.
2. Dado que defino fases, entonces cada fase exige fecha de inicio y fin, y el sistema valida que no se solapen de forma inválida ni queden huecos.
3. Dado que activo fuentes de evaluación, cuando asigno ponderaciones por fuente, entonces la suma debe ser 100% para poder publicar.
4. Dado un ciclo anterior, cuando lo duplico, entonces se copian plantillas, ponderaciones y fases, y las fechas quedan vacías para redefinir.
5. Dado un ciclo activo, cuando extiendo la fecha de una fase, entonces el cambio se aplica, se notifica a los afectados y queda registrado con autor y motivo.
6. Dado un ciclo activo, cuando intento reducir una fase a una fecha ya pasada, entonces el sistema lo impide.

---

### EP-01-07. Reglas de elegibilidad y población
**Prioridad**: MVP

**Historia**
Como Admin RRHH quiero definir quién entra al ciclo mediante reglas para no evaluar a quien no corresponde.

**Criterios de aceptación**
1. Dado el editor de reglas, entonces puedo combinar condiciones con Y / O sobre: antigüedad mínima, tipo de contrato, país, unidad, nivel, estado del empleado.
2. Dado un conjunto de reglas, cuando ejecuto la previsualización, entonces veo el total de incluidos, el total de excluidos y el desglose por unidad.
3. Dado el resultado, entonces puedo añadir o quitar personas de forma manual, quedando marcadas como excepción con motivo.
4. Dado que la población está confirmada, cuando lanzo el ciclo, entonces se congela un snapshot con los datos del empleado en ese momento.

---

### EP-01-08. Modo piloto
**Prioridad**: V2

**Historia**
Como Admin RRHH quiero lanzar el ciclo en modo piloto con un grupo reducido para validar la configuración antes del lanzamiento general.

**Criterios de aceptación**
1. Dado un ciclo configurado, cuando activo el modo piloto y selecciono participantes, entonces solo ellos reciben notificaciones y acceso.
2. Dado un ciclo en piloto, entonces todas las pantallas muestran un indicador visible de "modo prueba".
3. Dado que cierro el piloto, cuando elijo descartar, entonces se eliminan las respuestas de prueba y el ciclo vuelve a estado Configurado.
4. Dado que cierro el piloto, cuando elijo conservar, entonces las respuestas se mantienen y el ciclo pasa a Activo para toda la población.

---

# EP-02. Datos maestros e integración

**Objetivo**: mantener la población, la jerarquía y los cambios organizacionales sincronizados y auditables.

---

### EP-02-01. Sincronización con HRIS
**Prioridad**: MVP

**Historia**
Como Admin RRHH quiero sincronizar empleados y organigrama desde el HRIS para no mantener datos duplicados.

**Criterios de aceptación**
1. Dada una integración configurada, cuando se ejecuta la sincronización, entonces se actualizan empleado, puesto, nivel, manager, unidad, ubicación, fecha de ingreso, tipo de contrato y estado.
2. Dado un registro con manager inexistente, cuando se sincroniza, entonces la fila se marca como error y no bloquea el resto del lote.
3. Dada una sincronización finalizada, entonces se genera un reporte con altas, bajas, modificaciones y errores.
4. Dado un ciclo activo, cuando la sincronización detecta cambios en la jerarquía, entonces no se reasignan evaluaciones automáticamente y los casos se listan como excepciones.
5. Dado un fallo de conexión, cuando se ejecuta la sincronización, entonces se reintenta según política de backoff y se notifica al admin tras el tercer fallo.

---

### EP-02-02. Gestión de cambio de manager a mitad de ciclo
**Prioridad**: MVP

**Historia**
Como HRBP quiero decidir cómo se resuelve un cambio de manager durante el ciclo para que la evaluación la haga quien tiene elementos de juicio.

**Casos de uso**
- CU1: mantener al manager original.
- CU2: transferir al manager nuevo.
- CU3: solicitar evaluación a ambos con ponderación por tiempo.

**Criterios de aceptación**
1. Dado un cambio de manager detectado, entonces el caso aparece en la bandeja de excepciones con datos de ambos managers y la fecha del cambio.
2. Dado el caso, cuando elijo transferir, entonces el formulario en progreso pasa al nuevo manager conservando el borrador y se notifica a ambos.
3. Dado el caso, cuando elijo evaluación dual, entonces se generan dos formularios y el score final se pondera por meses de supervisión de cada uno.
4. Dado cualquier resolución, entonces queda registrada con autor, fecha y motivo, visible para auditoría.

---

### EP-02-03. Exclusión y reincorporación de participantes
**Prioridad**: MVP

**Historia**
Como Admin RRHH quiero excluir o reincorporar personas del ciclo para gestionar bajas, licencias y errores de población.

**Criterios de aceptación**
1. Dado un participante activo, cuando lo excluyo, entonces debo indicar motivo y sus formularios pasan a estado Excluido sin borrar respuestas.
2. Dado un empleado dado de baja, cuando se sincroniza su estado, entonces el sistema propone la exclusión automática y notifica al admin en vez de ejecutarla en silencio.
3. Dado un participante excluido, cuando lo reincorporo, entonces sus formularios vuelven a su estado anterior y se recalculan los pendientes.
4. Dado un evaluado excluido, entonces desaparece de los pendientes de todos sus evaluadores y estos son notificados.

---

### EP-02-04. Reasignación de evaluador inactivo
**Prioridad**: V2

**Historia**
Como Sistema quiero reasignar las evaluaciones de un evaluador dado de baja para que ningún formulario quede huérfano.

**Criterios de aceptación**
1. Dado un evaluador que pasa a estado inactivo, cuando tiene evaluaciones pendientes, entonces el sistema propone reasignarlas al superior jerárquico.
2. Dado que se acepta la reasignación, entonces el nuevo evaluador recibe notificación y accede a los borradores existentes en modo lectura como referencia.
3. Dado que no existe superior jerárquico, entonces el caso escala a HRBP.
4. Dado un evaluador de pares inactivo, cuando se reasigna, entonces se verifica que el nuevo no rompa el umbral de anonimato.

---

# EP-03. Gestión de objetivos

**Objetivo**: que la evaluación se apoye en compromisos definidos y medidos, no en percepción.

---

### EP-03-01. Crear objetivos individuales
**Prioridad**: V2 (MVP si el cliente evalúa por objetivos)

**Historia**
Como Empleado quiero registrar mis objetivos del periodo con métrica y meta para que mi evaluación se base en resultados acordados.

**Casos de uso**
- CU1: crear objetivo cuantitativo.
- CU2: crear objetivo cualitativo con hitos.
- CU3: alinear el objetivo a uno superior.

**Criterios de aceptación**
1. Dado que creo un objetivo, entonces debo indicar título, descripción, tipo, métrica, línea base, meta, unidad, peso y fecha límite.
2. Dado un objetivo cualitativo, entonces puedo definir hitos con fecha y el avance se calcula por hitos completados.
3. Dado que la suma de pesos de mis objetivos no es 100%, cuando intento enviarlos a aprobación, entonces el sistema lo impide indicando la diferencia.
4. Dado que alineo mi objetivo a uno de nivel superior, entonces aparece en el árbol de alineación de ese objetivo padre.
5. Dado un objetivo guardado sin enviar, entonces queda en estado Borrador y solo yo lo veo.

---

### EP-03-02. Aprobar objetivos
**Prioridad**: V2

**Historia**
Como Manager quiero revisar y aprobar los objetivos de mi equipo para asegurar que sean relevantes y medibles.

**Criterios de aceptación**
1. Dado un objetivo enviado a aprobación, entonces aparece en mi bandeja con el detalle completo y el árbol de alineación.
2. Dado un objetivo en revisión, cuando lo devuelvo, entonces es obligatorio un comentario y el empleado recibe notificación con ese comentario.
3. Dado un objetivo aprobado, entonces pasa a estado Activo y queda bloqueado para edición libre.
4. Dado que apruebo, entonces puedo ajustar el peso antes de aprobar, quedando registro del valor original.
5. Dada mi bandeja, entonces puedo aprobar en lote los objetivos de un mismo empleado.

---

### EP-03-03. Check-in de avance
**Prioridad**: V2

**Historia**
Como Empleado quiero actualizar periódicamente el avance de mis objetivos para dejar evidencia continua en lugar de reconstruir el año al final.

**Criterios de aceptación**
1. Dado un objetivo activo, cuando registro un check-in, entonces indico avance, estado semáforo (en curso, en riesgo, bloqueado, logrado) y comentario.
2. Dado un check-in con estado "en riesgo" o "bloqueado", entonces el comentario es obligatorio y se notifica al manager.
3. Dado un objetivo sin check-in en el periodo configurado, entonces recibo recordatorio y el objetivo se marca visualmente como desactualizado.
4. Dado el historial, entonces veo todos los check-ins con fecha, autor y valor reportado, sin posibilidad de borrarlos.
5. Dado un check-in, entonces puedo adjuntar evidencia (archivo o enlace).

---

### EP-03-04. Modificar objetivos a mitad de ciclo
**Prioridad**: V2

**Historia**
Como Manager quiero modificar o cancelar objetivos cuando cambian las prioridades del negocio para que la evaluación siga siendo justa.

**Criterios de aceptación**
1. Dado un objetivo activo, cuando solicito modificarlo, entonces debo indicar motivo y el cambio requiere aprobación del nivel superior si altera peso o meta.
2. Dado un objetivo cancelado, entonces se excluye del cálculo y su peso se redistribuye proporcionalmente entre los objetivos restantes.
3. Dado cualquier cambio aprobado, entonces se conserva el valor anterior en el historial y queda visible en el expediente.
4. Dado un ciclo en fase de evaluación, cuando intento modificar un objetivo, entonces el sistema lo impide.

---

### EP-03-05. Cálculo de cumplimiento
**Prioridad**: V2

**Historia**
Como Sistema quiero calcular el cumplimiento de objetivos al cierre para alimentar el score de la sección correspondiente.

**Criterios de aceptación**
1. Dado un objetivo cuantitativo con resultado registrado, entonces el cumplimiento se calcula sobre la meta y se acota entre el umbral mínimo y el de sobrecumplimiento configurados.
2. Dado un conjunto de objetivos, entonces el score de la sección es la media ponderada por peso.
3. Dado un objetivo sin resultado registrado al cierre, entonces se marca como pendiente y bloquea el cálculo hasta que el manager lo resuelva.
4. Dado el resultado calculado, entonces el manager puede ajustarlo con justificación obligatoria y el ajuste queda visible en el detalle.

---

# EP-04. Feedback continuo y 1:1

**Objetivo**: acumular evidencia durante el año para combatir el sesgo de recencia.

---

### EP-04-01. Dar feedback espontáneo
**Prioridad**: V2

**Historia**
Como Empleado quiero dar feedback a un colega en cualquier momento para reconocer o señalar algo mientras está fresco.

**Criterios de aceptación**
1. Dado que doy feedback, entonces selecciono destinatario, tipo (reconocimiento o mejora), competencia o valor asociado y escribo el comentario.
2. Dado el feedback, entonces elijo su visibilidad: solo el destinatario, destinatario y su manager, o público.
3. Dado un feedback enviado, entonces el destinatario recibe notificación y ya no puedo editarlo, solo eliminarlo dentro de los primeros 15 minutos.
4. Dado un feedback de mejora, entonces el sistema sugiere el formato situación, comportamiento, impacto.
5. Dado un feedback marcado como público, entonces aparece en el muro de reconocimientos de la organización.

---

### EP-04-02. Solicitar feedback
**Prioridad**: V2

**Historia**
Como Empleado quiero solicitar feedback a personas específicas sobre un tema concreto para obtener información accionable.

**Criterios de aceptación**
1. Dado que creo una solicitud, entonces selecciono hasta N destinatarios, escribo la pregunta y defino fecha límite.
2. Dado un destinatario, cuando recibe la solicitud, entonces puede responder, declinar con motivo opcional o ignorar.
3. Dada una solicitud vencida sin respuesta, entonces se envía un recordatorio único y luego se cierra automáticamente.
4. Dado que mi manager solicita feedback sobre mí a terceros, entonces yo veo que la solicitud existe y a quién se pidió, salvo que la configuración del ciclo indique lo contrario.

---

### EP-04-03. Bitácora privada del manager
**Prioridad**: V2

**Historia**
Como Manager quiero registrar notas privadas sobre cada persona de mi equipo para tener evidencia concreta al momento de evaluar.

**Criterios de aceptación**
1. Dada una nota creada, entonces solo yo puedo verla, ni el empleado ni RRHH ni mi superior tienen acceso.
2. Dada una nota, entonces puedo asociarla a una competencia o a un objetivo.
3. Dado que estoy llenando la evaluación, entonces veo mis notas de esa persona en un panel lateral y puedo insertarlas como texto editable.
4. Dado que dejo de ser manager de esa persona, entonces mis notas se conservan pero dejan de ser accesibles desde el perfil activo.
5. Dado un requerimiento legal formal, entonces solo un Admin global con doble aprobación puede exportarlas, y el acceso queda auditado.

---

### EP-04-04. Reuniones 1:1
**Prioridad**: V2

**Historia**
Como Manager quiero gestionar mis 1:1 con agenda y acuerdos para que el seguimiento no dependa de la memoria.

**Criterios de aceptación**
1. Dada una reunión 1:1, entonces ambos participantes pueden añadir temas a la agenda antes de la reunión.
2. Dada la reunión, entonces se registran notas compartidas y notas privadas separadas, claramente diferenciadas en la interfaz.
3. Dado un acuerdo registrado, entonces exige responsable y fecha, y aparece automáticamente en la agenda de la siguiente reunión hasta ser cerrado.
4. Dada una serie recurrente, entonces el historial completo es consultable en orden cronológico.
5. Dado que se cancela una reunión, entonces los acuerdos pendientes se arrastran a la siguiente.

---

# EP-05. Ciclo de evaluación

**Objetivo**: ejecutar el proceso formal de punta a punta con trazabilidad.

---

### EP-05-01. Nominar evaluadores
**Prioridad**: V2

**Historia**
Como Empleado quiero proponer a las personas que me evaluarán en el 360 para que opinen quienes realmente trabajan conmigo.

**Criterios de aceptación**
1. Dada la fase de nominación abierta, entonces puedo buscar y seleccionar entre el mínimo y el máximo de evaluadores configurados por tipo.
2. Dado que selecciono menos del mínimo, cuando intento enviar, entonces el sistema lo impide indicando cuántos faltan.
3. Dado que envío mi propuesta, entonces pasa a aprobación de mi manager y ya no puedo editarla.
4. Dado que no envío nada antes del cierre de la fase, entonces el sistema asigna evaluadores por defecto según reglas configuradas y me lo notifica.
5. Dado un evaluador propuesto que está inactivo o excluido del ciclo, entonces no aparece como seleccionable.

---

### EP-05-02. Aprobar nominaciones
**Prioridad**: V2

**Historia**
Como Manager quiero aprobar, rechazar o añadir evaluadores de mi equipo para asegurar una muestra representativa.

**Criterios de aceptación**
1. Dada una nominación recibida, entonces veo la lista propuesta con el área y la relación laboral de cada evaluador.
2. Dado que rechazo un evaluador, entonces el motivo es obligatorio y debo añadir un reemplazo para mantener el mínimo.
3. Dado que detecto reciprocidad total entre dos personas, entonces el sistema muestra una alerta informativa sin bloquear.
4. Dado que apruebo, entonces la lista se congela y los evaluadores reciben la invitación al abrir la fase correspondiente.

---

### EP-05-03. Completar autoevaluación
**Prioridad**: MVP

**Historia**
Como Empleado quiero completar mi autoevaluación con contexto de mi año para reflexionar y aportar mi punto de vista antes de la conversación con mi jefe.

**Casos de uso**
- CU1: completar en una sesión.
- CU2: guardar y retomar días después.
- CU3: intentar enviar con campos incompletos.
- CU4: solicitar reapertura tras enviar.

**Criterios de aceptación**
1. Dado que abro mi formulario, entonces veo en paneles de consulta: mis objetivos y su avance, el feedback recibido en el periodo, mi evaluación anterior y mi plan de desarrollo previo.
2. Dado que escribo respuestas, entonces se guardan automáticamente cada 20 segundos y al cambiar de sección, con indicador visible de "guardado".
3. Dado que pierdo la conexión, cuando vuelvo a entrar, entonces recupero el último borrador guardado sin pérdida de datos.
4. Dado que intento enviar con obligatorios incompletos, entonces el sistema bloquea, indica cuántos faltan y me lleva al primero.
5. Dado que envío el formulario, entonces se me pide confirmación explícita advirtiendo que no podré editarlo.
6. Dado un formulario enviado, entonces lo veo en modo lectura y dispongo de un botón para solicitar reapertura a RRHH con motivo.
7. Dada la fecha límite vencida sin envío, entonces el formulario pasa a Vencido, se notifica a mi manager y RRHH decide si se reabre.

---

### EP-05-04. Evaluar a mi equipo
**Prioridad**: MVP

**Historia**
Como Manager quiero evaluar a cada persona de mi equipo con toda la evidencia disponible para emitir una valoración fundamentada.

**Criterios de aceptación**
1. Dado mi panel de evaluaciones, entonces veo la lista de mi equipo con el estado de cada formulario, la fecha límite y un indicador de progreso.
2. Dado que abro una evaluación, entonces accedo a objetivos y cumplimiento, feedback recibido por esa persona, mis notas privadas y la evaluación del ciclo anterior.
3. Dada la configuración "ocultar autoevaluación hasta enviar", cuando abro el formulario, entonces no veo las respuestas del empleado hasta que envío el mío.
4. Dado que asigno la calificación mínima o máxima de la escala, entonces el comentario justificativo es obligatorio.
5. Dado que califico a todo mi equipo con el mismo valor en todas las preguntas, entonces el sistema muestra una advertencia antes del envío sin bloquearlo.
6. Dado que envío la evaluación, entonces pasa a la siguiente fase y el empleado no la ve hasta la publicación.
7. Dado mi panel, entonces puedo filtrar por estado y ordenar por fecha límite.

---

### EP-05-05. Evaluar como par o reporte directo
**Prioridad**: V2

**Historia**
Como Evaluador quiero responder una evaluación breve sobre un colega para aportar mi perspectiva sin invertir demasiado tiempo.

**Criterios de aceptación**
1. Dada la invitación, entonces accedo a un formulario reducido con la relación laboral indicada (par, reporte directo, cliente interno).
2. Dado el formulario anónimo, entonces se indica claramente que mi identidad no será revelada al evaluado.
3. Dado que tengo varias evaluaciones pendientes, entonces las completo desde una única bandeja con navegación entre ellas.
4. Dado que declino una evaluación, entonces indico motivo y se notifica a RRHH para posible reemplazo.
5. Dado un bloque anónimo que no alcanza el umbral mínimo de respuestas, entonces no se muestra al evaluado y su peso se redistribuye.

---

### EP-05-06. Aprobación de segundo nivel
**Prioridad**: MVP

**Historia**
Como Manager de segundo nivel quiero revisar las evaluaciones de mi equipo extendido para asegurar consistencia antes de publicar.

**Criterios de aceptación**
1. Dada la fase de aprobación, entonces veo todas las evaluaciones de mi organización con calificación propuesta, evaluador y comparativa con el promedio del área.
2. Dado que devuelvo una evaluación, entonces el comentario es obligatorio, el formulario vuelve a estado editable para el manager y se le notifica.
3. Dado que apruebo, entonces la evaluación queda lista para publicación y no puedo modificarla directamente.
4. Dada mi vista, entonces puedo aprobar en lote las evaluaciones que no presentan alertas.

---

### EP-05-07. Publicar y comunicar resultados
**Prioridad**: MVP

**Historia**
Como Admin RRHH quiero publicar los resultados según la matriz de visibilidad para liberar la información de forma controlada.

**Criterios de aceptación**
1. Dado un ciclo con todas las evaluaciones aprobadas, cuando ejecuto la publicación, entonces se calcula y congela el rating final de cada participante.
2. Dado que existen evaluaciones sin aprobar, cuando intento publicar, entonces el sistema muestra el listado pendiente y permite publicar solo el subconjunto aprobado.
3. Dada la publicación, entonces cada empleado recibe notificación y accede únicamente a los campos definidos como visibles para su rol.
4. Dado un resultado publicado, entonces queda bloqueado para edición y solo un Admin puede reabrirlo dejando registro de auditoría.

---

### EP-05-08. Registrar la reunión de retroalimentación
**Prioridad**: MVP

**Historia**
Como Manager quiero registrar que tuve la conversación de retroalimentación para dejar constancia del cierre del proceso.

**Criterios de aceptación**
1. Dado un resultado aprobado, entonces accedo a una vista consolidada y a una guía de conversación con puntos sugeridos.
2. Dado que registro la reunión, entonces indico fecha, duración y notas, y el estado del formulario cambia a "retroalimentado".
3. Dada una reunión no registrada después de N días de la publicación, entonces recibo recordatorio y el caso aparece en el panel de HRBP.

---

### EP-05-09. Acuse y derecho a réplica
**Prioridad**: MVP

**Historia**
Como Empleado quiero acusar recibo de mi evaluación y poder manifestar desacuerdo para que quede constancia de mi posición.

**Criterios de aceptación**
1. Dado un resultado publicado, entonces puedo firmarlo electrónicamente con sello de tiempo o marcar acuse de recibo, según la configuración del país.
2. Dado el acuse, entonces puedo añadir un comentario de cierre visible para mi manager y RRHH.
3. Dado que marco desacuerdo, entonces el motivo es obligatorio y se abre un caso asignado a HRBP con SLA de respuesta.
4. Dado un caso de desacuerdo, entonces su resolución se registra con decisión y justificación, y el expediente queda marcado.
5. Dado que no acuso recibo en el plazo configurado, entonces el sistema registra "no acusado" sin bloquear el cierre del ciclo.

---

### EP-05-10. Reabrir formularios
**Prioridad**: MVP

**Historia**
Como Admin RRHH quiero reabrir un formulario enviado para corregir errores materiales sin romper la trazabilidad.

**Criterios de aceptación**
1. Dado un formulario enviado, cuando lo reabro, entonces indico motivo obligatorio y se notifica al evaluador y al evaluado si el resultado ya era visible.
2. Dado un formulario reabierto, entonces se conserva una versión inmutable del envío original consultable desde el historial.
3. Dado un formulario reabierto y vuelto a enviar, entonces se recalculan automáticamente el score y los reportes afectados.
4. Dado un ciclo cerrado, cuando reabro un formulario, entonces el ciclo pasa a estado "reabierto parcialmente" y se registra en el log.

---

# EP-06. Calibración

**Objetivo**: reducir la varianza entre evaluadores y sostener la decisión con criterio colegiado.

---

### EP-06-01. Crear y gestionar sesiones de calibración
**Prioridad**: V2

**Historia**
Como HRBP quiero crear sesiones de calibración por unidad para revisar las calificaciones de forma colegiada.

**Criterios de aceptación**
1. Dado que creo una sesión, entonces defino nombre, alcance (unidad, área, nivel), facilitador, participantes y fecha.
2. Dado el alcance definido, entonces el sistema carga automáticamente a los evaluados correspondientes con sus calificaciones propuestas.
3. Dada una sesión, cuando la abro, entonces las calificaciones de ese alcance quedan bloqueadas para edición por parte de los managers.
4. Dada una sesión cerrada, entonces se genera un acta con asistentes, ajustes realizados y justificaciones.

---

### EP-06-02. Vista de calibración y ajuste de calificaciones
**Prioridad**: V2

**Historia**
Como Facilitador quiero ver y ajustar las calificaciones del grupo en una sola pantalla para corregir inconsistencias entre evaluadores.

**Criterios de aceptación**
1. Dada la vista, entonces veo por persona: calificación propuesta, evaluador, histórico de ratings, tiempo en el puesto y comentarios clave.
2. Dado que ajusto una calificación, entonces la justificación es obligatoria y se registra valor anterior, valor nuevo, autor y fecha.
3. Dada la vista, entonces puedo agrupar y ordenar por evaluador, área y calificación.
4. Dado un ajuste realizado, entonces el manager original recibe notificación con la justificación.

---

### EP-06-03. Matriz 9-box
**Prioridad**: V2

**Historia**
Como Dirección quiero ubicar a las personas en una matriz de desempeño y potencial para tomar decisiones de talento.

**Criterios de aceptación**
1. Dada la matriz, entonces cada persona se posiciona automáticamente según su rating de desempeño y su valoración de potencial.
2. Dado que arrastro una persona a otra celda, entonces la justificación es obligatoria y se actualiza su valoración de potencial.
3. Dada la matriz, entonces veo la cantidad y el porcentaje de personas por celda.
4. Dada la matriz, entonces puedo filtrar por unidad, nivel, país y antigüedad, y exportar la vista.

---

### EP-06-04. Control de distribución
**Prioridad**: V2

**Historia**
Como Admin RRHH quiero configurar una distribución objetivo para orientar la calibración hacia una curva razonable.

**Criterios de aceptación**
1. Dado que configuro la distribución, entonces elijo entre sin restricción, guiada o forzada, con el porcentaje objetivo por nivel de calificación.
2. Dada la modalidad guiada, entonces la sesión muestra en tiempo real la distribución actual frente a la objetivo, sin bloquear.
3. Dada la modalidad forzada, cuando intento cerrar la sesión fuera de la tolerancia definida, entonces el sistema lo impide e indica la desviación.
4. Dada cualquier modalidad, entonces la distribución final queda registrada en el acta.

---

### EP-06-05. Detección de sesgos
**Prioridad**: V3

**Historia**
Como HRBP quiero identificar patrones anómalos de calificación para intervenir sobre evaluadores con sesgo sistemático.

**Criterios de aceptación**
1. Dado el panel de sesgos, entonces veo por evaluador el promedio otorgado, la desviación estándar y la diferencia frente al promedio de su área.
2. Dado un evaluador con desviación superior al umbral configurado, entonces se marca como severidad o benevolencia sistemática.
3. Dado el panel, entonces se señalan patrones de respuesta uniforme, comentarios por debajo de la longitud media y evaluaciones completadas en tiempos anómalamente cortos.
4. Dado un caso marcado, entonces puedo registrar la acción tomada y su seguimiento.

---

# EP-07. Resultados y consecuencias

---

### EP-07-01. Cálculo del rating final
**Prioridad**: MVP

**Historia**
Como Sistema quiero calcular el rating final aplicando las ponderaciones configuradas para producir un resultado consistente y explicable.

**Criterios de aceptación**
1. Dado un conjunto de evaluaciones completas, entonces el score de cada sección se calcula como media ponderada de sus preguntas.
2. Dado el score por sección, entonces el score final aplica las ponderaciones de sección y de fuente definidas en el ciclo.
3. Dada una fuente sin respuestas suficientes, entonces su peso se redistribuye proporcionalmente entre las fuentes disponibles.
4. Dado el score final, entonces se traduce a la etiqueta correspondiente según los cortes configurados.
5. Dado el detalle del cálculo, entonces el empleado y el manager pueden ver el desglose por sección con su peso y aporte.

---

### EP-07-02. Matriz de mérito y propuesta de incremento
**Prioridad**: V3

**Historia**
Como Manager quiero recibir una sugerencia de incremento salarial basada en el rating y la posición en banda para proponer ajustes coherentes.

**Criterios de aceptación**
1. Dada la matriz configurada, entonces el sistema sugiere un porcentaje de incremento cruzando rating y compa-ratio.
2. Dado mi presupuesto asignado, entonces veo en tiempo real el consumo y el remanente al modificar propuestas.
3. Dado que excedo el presupuesto, cuando intento enviar, entonces el sistema lo impide o exige aprobación excepcional según configuración.
4. Dado que me aparto de la sugerencia, entonces la justificación es obligatoria.
5. Dado el envío, entonces la propuesta pasa al flujo de aprobación de compensación.

---

### EP-07-03. Plan de mejora (PIP)
**Prioridad**: V3

**Historia**
Como Manager quiero abrir y dar seguimiento a un plan de mejora para gestionar el bajo desempeño de forma documentada.

**Criterios de aceptación**
1. Dado un rating por debajo del umbral configurado, entonces el sistema propone abrir un PIP y notifica a HRBP.
2. Dado que creo un PIP, entonces defino objetivos de mejora, hitos con fecha, apoyo comprometido, fechas de revisión y consecuencias.
3. Dada una revisión programada, entonces manager y empleado registran su valoración y el estado se actualiza.
4. Dado el cierre del PIP, entonces se selecciona resultado (superado, extendido, no superado) con justificación.
5. Dado un PIP activo, entonces es visible para el empleado, su manager, el segundo nivel y HRBP, y para nadie más.

---

### EP-07-04. Marcado de talento y sucesión
**Prioridad**: V3

**Historia**
Como Dirección quiero identificar talento clave y sucesores de posiciones críticas para reducir el riesgo organizacional.

**Criterios de aceptación**
1. Dada una persona, entonces puedo marcarla como talento clave, con riesgo de fuga o ambas, con comentario.
2. Dada una posición marcada como crítica, entonces puedo asociar candidatos con grado de preparación (listo ya, 1 a 2 años, 3 o más años).
3. Dada una posición crítica sin sucesores, entonces aparece en un panel de alertas.
4. Dada la información de sucesión, entonces solo es visible para Dirección y HRBP, nunca para el empleado.

---

# EP-08. Desarrollo individual

---

### EP-08-01. Generar plan de desarrollo
**Prioridad**: V2

**Historia**
Como Empleado quiero un plan de desarrollo derivado de mi evaluación para saber qué hacer con el resultado.

**Criterios de aceptación**
1. Dado un resultado publicado, entonces el sistema propone las competencias con mayor brecha como focos de desarrollo.
2. Dado un foco de desarrollo, entonces añado acciones clasificadas en experiencia, exposición o formación, con responsable y fecha objetivo.
3. Dado un plan, entonces requiere la validación de mi manager para pasar a estado Activo.
4. Dado un plan activo, entonces puedo actualizar el estado de cada acción y aparece como punto fijo en la agenda de los 1:1.
5. Dado el cierre del ciclo siguiente, entonces el cumplimiento del plan anterior se muestra como contexto en la nueva evaluación.

---

### EP-08-02. Catálogo de acciones e integración con LMS
**Prioridad**: V3

**Historia**
Como Empleado quiero recibir sugerencias de acciones formativas concretas para no tener que inventar mi plan desde cero.

**Criterios de aceptación**
1. Dada una competencia con brecha, entonces el sistema sugiere acciones del catálogo asociadas a esa competencia y nivel.
2. Dado que selecciono un curso del LMS integrado, entonces se genera la inscripción y el estado de avance se sincroniza automáticamente.
3. Dado un curso completado en el LMS, entonces la acción del plan se marca como completada sin intervención manual.
4. Dada una integración caída, entonces la acción queda con estado "sin sincronizar" y se reintenta.

---

# EP-09. Analítica y reportes

---

### EP-09-01. Panel de avance del ciclo
**Prioridad**: MVP

**Historia**
Como Admin RRHH quiero ver el avance del ciclo en tiempo real para intervenir donde se está atrasando.

**Criterios de aceptación**
1. Dado el panel, entonces veo el porcentaje de completitud por fase, con desglose por unidad, país y manager.
2. Dado el panel, entonces identifico a los managers con menor avance y accedo al detalle de sus pendientes.
3. Dado el panel, entonces puedo enviar un recordatorio dirigido desde la misma vista.
4. Dado cualquier filtro aplicado, entonces puedo exportar la vista a CSV y Excel.
5. Dado el panel, entonces los datos se actualizan al menos cada 15 minutos.

---

### EP-09-02. Panel del manager
**Prioridad**: MVP

**Historia**
Como Manager quiero ver los resultados agregados de mi equipo para entender su composición y detectar riesgos.

**Criterios de aceptación**
1. Dado el panel, entonces veo la distribución de calificaciones de mi equipo y la comparación con el promedio de mi área.
2. Dado el panel, entonces veo las competencias con mayor brecha agregada.
3. Dado el panel, entonces se listan las personas por debajo del umbral definido como bajo desempeño.
4. Dado un equipo con menos de 4 personas, entonces las comparativas agregadas se ocultan para preservar la confidencialidad.

---

### EP-09-03. Resultado individual del empleado
**Prioridad**: MVP

**Historia**
Como Empleado quiero consultar mi resultado con su desglose y evolución para entender de dónde sale mi calificación.

**Criterios de aceptación**
1. Dado mi resultado publicado, entonces veo el rating final, el desglose por sección con su peso y los comentarios visibles según configuración.
2. Dado mi resultado, entonces veo la comparación entre mi autoevaluación y la evaluación recibida por competencia.
3. Dados ciclos anteriores, entonces veo la evolución de mi rating en el tiempo.
4. Dado mi expediente, entonces puedo descargar el PDF con el detalle completo de lo que me es visible.

---

### EP-09-04. Reportes de dirección
**Prioridad**: V2

**Historia**
Como Dirección quiero comparar unidades y periodos para tomar decisiones de talento a nivel organizacional.

**Criterios de aceptación**
1. Dado el reporte, entonces comparo distribución de calificaciones entre unidades, países y niveles.
2. Dado el reporte, entonces veo la evolución interanual del promedio y de la distribución.
3. Dado el reporte, entonces accedo al 9-box consolidado con filtros.
4. Dado un cruce con rotación, entonces veo la tasa de salida por nivel de desempeño en los últimos 12 meses.

---

### EP-09-05. Exportación y API
**Prioridad**: V2

**Historia**
Como Admin RRHH quiero exportar datos y exponerlos vía API para integrarlos con nuestras herramientas de BI.

**Criterios de aceptación**
1. Dada una exportación solicitada, entonces se genera de forma asíncrona y se notifica cuando está lista para descargar.
2. Dada una exportación masiva, entonces queda registrada en el log de auditoría con usuario, filtros y volumen.
3. Dada la API, entonces expone endpoints de solo lectura para ciclos, resultados, objetivos y participantes, con paginación y autenticación por token.
4. Dado un token, entonces su alcance se limita a los datos permitidos por el rol asociado.

---

# EP-10. Notificaciones y automatización

---

### EP-10-01. Motor de notificaciones
**Prioridad**: MVP

**Historia**
Como Admin RRHH quiero configurar qué se notifica, cuándo y por qué canal para sostener el ritmo del ciclo sin perseguir a la gente manualmente.

**Criterios de aceptación**
1. Dado el configurador, entonces puedo activar o desactivar cada evento notificable de forma independiente.
2. Dado un evento, entonces puedo definir canales (correo, in-app, Slack, Teams, push) y editar la plantilla por idioma.
3. Dada una notificación con variables, entonces la previsualización muestra el resultado con datos de ejemplo.
4. Dado un envío fallido, entonces se reintenta según política y el fallo persistente queda registrado.

---

### EP-10-02. Recordatorios escalonados y escalamiento
**Prioridad**: MVP

**Historia**
Como Admin RRHH quiero recordatorios automáticos que escalen jerárquicamente para reducir el trabajo manual de seguimiento.

**Criterios de aceptación**
1. Dada una tarea pendiente, entonces se envían recordatorios a 7, 3 y 1 día del vencimiento, configurable.
2. Dada una tarea vencida, entonces se notifica al superior jerárquico del responsable y luego a HRBP según la escalera configurada.
3. Dado un usuario que completa la tarea, entonces deja de recibir recordatorios de forma inmediata.
4. Dado un manager, entonces recibe un resumen semanal con todos los pendientes de su equipo en una sola notificación.

---

### EP-10-03. Preferencias de notificación
**Prioridad**: V2

**Historia**
Como Empleado quiero controlar qué notificaciones recibo y por qué canal para no saturarme.

**Criterios de aceptación**
1. Dadas mis preferencias, entonces puedo elegir canal por tipo de notificación.
2. Dadas notificaciones marcadas como obligatorias por RRHH, entonces no puedo desactivarlas y se indica el motivo.
3. Dado que activo el modo resumen, entonces recibo una sola notificación diaria agrupando lo no crítico.

---

# EP-11. Seguridad, permisos y auditoría

---

### EP-11-01. Matriz de permisos y visibilidad
**Prioridad**: MVP

**Historia**
Como Admin global quiero configurar qué ve y qué puede hacer cada rol en cada fase para garantizar la confidencialidad del proceso.

**Criterios de aceptación**
1. Dada la matriz, entonces defino por rol y por fase el acceso a cada sección del formulario: sin acceso, lectura o escritura.
2. Dado un rol, entonces defino su alcance: propio, equipo directo, equipo extendido, unidad o global.
3. Dado un usuario que intenta acceder a un recurso fuera de su alcance, entonces recibe error de permisos y el intento queda registrado.
4. Dado un cambio en la matriz, entonces se aplica de forma inmediata y queda auditado con autor y fecha.

---

### EP-11-02. Anonimato en evaluaciones 360
**Prioridad**: V2

**Historia**
Como Evaluador quiero que mi identidad esté protegida para poder dar feedback honesto sin temor a represalias.

**Criterios de aceptación**
1. Dado un bloque configurado como anónimo, entonces el evaluado no ve nombres, y los comentarios se presentan en orden aleatorio.
2. Dado un bloque con menos respuestas que el umbral configurado, entonces no se muestra ningún contenido de ese bloque y se indica el motivo de forma genérica.
3. Dado un reporte o exportación, entonces nunca se incluyen identificadores que permitan reconstruir la autoría de respuestas anónimas.
4. Dado un Admin, entonces tampoco puede ver la autoría desde la interfaz, y cualquier acceso técnico exige procedimiento excepcional auditado.

---

### EP-11-03. Log de auditoría
**Prioridad**: MVP

**Historia**
Como Auditor quiero consultar el registro completo de acciones para responder a requerimientos legales o de cumplimiento.

**Criterios de aceptación**
1. Dada cualquier acción sobre evaluaciones, calificaciones, permisos o exportaciones, entonces se registra usuario, acción, recurso, valores anterior y nuevo, fecha, hora e IP.
2. Dado el log, entonces es inmutable, ningún rol puede editarlo ni borrarlo.
3. Dado el log, entonces puedo filtrar por usuario, recurso, tipo de acción y rango de fechas, y exportar el resultado.
4. Dada la retención configurada por país, entonces los registros se conservan al menos ese periodo.

---

### EP-11-04. Derechos del titular de datos
**Prioridad**: V3

**Historia**
Como Empleado quiero ejercer mis derechos sobre mis datos personales para cumplir con la normativa de protección de datos.

**Criterios de aceptación**
1. Dada una solicitud de acceso, entonces recibo un paquete exportable con todos mis datos de desempeño en formato legible.
2. Dada una solicitud de rectificación, entonces se abre un caso con SLA asignado a RRHH y su resolución queda documentada.
3. Dado el vencimiento del periodo de retención, entonces los datos se anonimizan o eliminan de forma automática y verificable.
4. Dada una decisión asistida por IA, entonces se me informa explícitamente y puedo solicitar revisión humana.

---

# EP-12. Capa de IA

**Regla transversal**: la IA propone, nunca califica ni decide. Todo output es editable y queda marcado como asistido.

---

### EP-12-01. Asistente de redacción de feedback
**Prioridad**: V3

**Historia**
Como Manager quiero convertir mis notas sueltas en feedback estructurado para escribir mejor en menos tiempo.

**Criterios de aceptación**
1. Dado un texto en un campo de comentario, cuando solicito asistencia, entonces recibo una versión reestructurada en formato situación, comportamiento, impacto.
2. Dada la sugerencia, entonces se muestra junto al original y decido si la acepto, la edito o la descarto.
3. Dado que acepto una sugerencia, entonces el campo queda marcado internamente como asistido por IA sin que esto sea visible para el evaluado.
4. Dado un fallo del servicio de IA, entonces el formulario sigue funcionando normalmente y se indica que la asistencia no está disponible.
5. Dado un contenido con datos sensibles, entonces no se envía a procesamiento externo si el tenant tiene esa restricción activa.

---

### EP-12-02. Detector de sesgo en comentarios
**Prioridad**: V3

**Historia**
Como Manager quiero que se me alerte sobre lenguaje sesgado en mis comentarios para escribir evaluaciones más justas.

**Criterios de aceptación**
1. Dado un comentario escrito, entonces el sistema señala expresiones sobre rasgos de personalidad en lugar de conductas observables.
2. Dado un comentario, entonces se señala lenguaje con sesgo de género y generalizaciones sin ejemplo concreto.
3. Dada una alerta, entonces se explica el motivo y se propone una alternativa, sin bloquear el envío.
4. Dadas las alertas del ciclo, entonces HRBP accede a un reporte agregado y anonimizado de patrones detectados.

---

### EP-12-03. Síntesis de múltiples evaluadores
**Prioridad**: V3

**Historia**
Como Manager quiero un resumen de todas las evaluaciones recibidas por una persona para preparar la conversación sin leer 15 formularios.

**Criterios de aceptación**
1. Dadas las evaluaciones completadas, entonces se genera una síntesis con fortalezas, áreas de mejora y puntos de disenso entre evaluadores.
2. Dada la síntesis, entonces nunca se atribuye una opinión a un evaluador anónimo ni se reproducen frases textuales que permitan identificarlo.
3. Dada la síntesis, entonces se indica claramente que fue generada automáticamente y no reemplaza la lectura de los originales.
4. Dado un evaluado con menos respuestas que el umbral, entonces no se genera síntesis.

---

### EP-12-04. Sugerencia de objetivos y acciones de desarrollo
**Prioridad**: V3

**Historia**
Como Empleado quiero sugerencias de objetivos y acciones formativas para acelerar la definición de mi plan.

**Criterios de aceptación**
1. Dado mi puesto, nivel y los objetivos de mi área, entonces recibo entre 3 y 5 propuestas de objetivo con métrica sugerida.
2. Dada una sugerencia, entonces la edito antes de guardarla y nunca se guarda automáticamente.
3. Dada una competencia con brecha, entonces recibo acciones sugeridas clasificadas en experiencia, exposición y formación.
4. Dado que no hay datos suficientes del puesto, entonces el sistema lo indica en lugar de generar contenido genérico.

---

# Anexo A. Matriz de trazabilidad por prioridad

| Épica | MVP | V2 | V3 |
|---|---|---|---|
| EP-01 Configuración | 01, 02, 03, 04, 06, 07 | 05, 08 | |
| EP-02 Datos maestros | 01, 02, 03 | 04 | |
| EP-03 Objetivos | | 01, 02, 03, 04, 05 | |
| EP-04 Feedback continuo | | 01, 02, 03, 04 | |
| EP-05 Ciclo de evaluación | 03, 04, 06, 07, 08, 09, 10 | 01, 02, 05 | |
| EP-06 Calibración | | 01, 02, 03, 04 | 05 |
| EP-07 Resultados | 01 | | 02, 03, 04 |
| EP-08 Desarrollo | | 01 | 02 |
| EP-09 Analítica | 01, 02, 03 | 04, 05 | |
| EP-10 Notificaciones | 01, 02 | 03 | |
| EP-11 Seguridad | 01, 03 | 02 | 04 |
| EP-12 IA | | | 01, 02, 03, 04 |

**Total MVP**: 22 historias.

---

# Anexo B. Historias técnicas habilitadoras

| ID | Historia | Prioridad |
|---|---|---|
| TEC-01 | Modelo de datos multi-tenant con aislamiento por organización | MVP |
| TEC-02 | Máquina de estados del formulario individual con transiciones validadas | MVP |
| TEC-03 | Motor de cálculo de scores desacoplado y testeable de forma aislada | MVP |
| TEC-04 | Servicio de guardado automático con resolución de conflictos | MVP |
| TEC-05 | Versionado de catálogos y congelación por ciclo | MVP |
| TEC-06 | Cola asíncrona para notificaciones y exportaciones | MVP |
| TEC-07 | SSO SAML/OIDC y aprovisionamiento SCIM | V2 |
| TEC-08 | Motor de reglas de elegibilidad y lógica condicional | V2 |
| TEC-09 | Capa de abstracción de proveedores de IA con fallback | V3 |
| TEC-10 | Pruebas de carga para picos de concurrencia en cierre de fase | V2 |

---

# Anexo C. Riesgos del backlog

1. **Complejidad del motor de ponderaciones**: es el componente con más casos borde. Aislarlo desde el día uno y cubrirlo con pruebas exhaustivas.
2. **Cambios organizacionales a mitad de ciclo**: subestimarlo genera deuda técnica difícil de revertir. EP-02-02 es más grande de lo que parece.
3. **Anonimato**: una filtración de identidad destruye la confianza en el producto de forma irreversible. Tratar EP-11-02 como requisito crítico, no como funcionalidad.
4. **Adopción del módulo de objetivos**: sin bloqueo en la evaluación, muere en el primer ciclo.
5. **Picos de concurrencia**: entre el 70% y el 80% de los envíos ocurren en los últimos tres días de cada fase.
