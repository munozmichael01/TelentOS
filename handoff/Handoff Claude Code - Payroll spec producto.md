# Spec de producto — Módulo Payroll (decisiones cerradas)

> **Fecha:** 2026-07-10 · **Estado:** decisiones de producto acordadas; pendiente de implementación.
> Contexto completo del diagnóstico en la conversación de análisis PM+HR (resumen en §0). Esta spec recoge las decisiones tomadas y define el alcance de "funcional".

---

## 0. Diagnóstico que motiva esta spec (resumen)

- "Compensación" nombra 3 cosas distintas: banco de horas (`compensation_records`), perfil salarial (`pay_profiles`+`pay_components`) y la corrida (`pay_runs`). No se hablan entre sí: **el banco de horas tipo "pago" nunca llega a nómina** (0 referencias a `compensation_records` en `app/api/payroll`).
- **No existe camino de creación** de perfiles salariales ni de corridas desde la app (solo seeds 0017/0018). El `PUT` de perfiles solo hace update. No hay motor de generación de líneas.
- Botones muertos: `pay-profile.tsx` "Ver recibo" (:92), "Editar compensación" (:97), "Configurar compensación" (:112), "Editar" banco (:153); `pay-run-detail.tsx` "Aprobar empleado" (:189), "Solicitar cambios", "Añadir ajuste", los 4 exports (:387-390). `payslips` nunca se escribe (`currentPayslip: null` hardcodeado).
- **404s payroll→run**: el dashboard lista corridas con admin client (bypassa RLS) pero `runs/[id]/page.tsx` valida con cliente RLS (`pay_runs_admin` = solo owner/hr_admin) → `notFound()`. Inconsistencia de modelo de acceso.
- Contradicción de esquema: `pay_profiles.effective_from` implica historial salarial pero `unique(company_id, employee_id)` lo prohíbe.
- Tensión de mercado: payroll construido para Venezuela (pack `ve`, SSO/RPE/FAOV, USD hardcodeado) vs producto orientado a España (EUR en ofertas, compliance de fichaje).

---

## 1. Decisión: modelo de país

**País base por empresa** (`companies.country`, nuevo campo). Da forma a todo el producto: moneda por defecto, calendario de festivos, reglas de compliance de fichaje, formato de fechas, y el módulo legal de nómina. Es lo único que el usuario configura (en Ajustes de empresa).

**Invariante de nómina:** una corrida nunca mezcla países. La corrida hereda el país de su entidad (`pay_runs.entity_name` ya existe); hoy entidad = empresa = un país.

**`pay_profiles.country_pack` se mantiene** pero pasa a heredar del país de la empresa (no editable por empleado). Es el camino de crecimiento a multi-país/multi-entidad sin migración: el día que haga falta, se convierte en override por entidad legal.

**No bloqueante:** el "modo sin país" es el pack `generic` — gestión pura (bruto = base + componentes + novedades, neto = bruto, sin retenciones). Elegir país activa el pack legal cuando exista; mientras, muestra el mock.

### 1.1 Regla de moneda (resuelve la tensión EUR/USD)

Principio: **la moneda es una propiedad de cada registro, nunca un global que se sobrescribe**. El esquema ya lo cumple (`jobs.salary_currency`, `pay_profiles.currency`, `pay_runs.currency`); lo que falta es la regla de uso:

1. **El país de la empresa fija *defaults por dominio*, y los dominios pueden diferir legítimamente.** Ofertas = moneda del mercado de talento; nómina = moneda de pago. Venezuela es la prueba de que "unificar" sería la regla equivocada: su mercado laboral cotiza en USD y su nómina es dual VES/USD. España: EUR en ambos.
2. **El dinero nunca fluye automáticamente del ATS a nómina.** La banda salarial de la oferta es informativa; al contratar, el perfil salarial se crea en un paso explícito donde RR.HH. introduce el importe en la moneda de nómina (puede diferir de la moneda de la oferta). TalentOS **no convierte divisas** — sin motor FX en el alcance.
3. **Elegir país no migra datos existentes.** Cambia solo los defaults de registros *nuevos*. Ofertas EUR bajo una empresa VE siguen siendo válidas: son registros históricos con su propia moneda, y se muestran tal cual.
4. **Migración concreta:** (a) `pay_profiles.currency` y `jobs.salary_currency` pasan a defaultear desde `companies.country` en la creación (hoy hardcodean 'USD' y 'EUR' respectivamente); (b) el bug real es de UI, no de datos — `fmtUSD` está hardcodeado en 3 componentes de payroll y debe leer la moneda del registro (`formatMoney(amount, currency)` en el `lib/format.ts` de la auditoría).

## 2. Decisión: packs legales modulares (VE / BR / ES como preview)

Contrato `CountryPack` con `status: 'active' | 'preview' | 'coming_soon'`. El enum ya existe (`'ve','br','es','co','mx'` en 0016) y se convierte en el catálogo.

| Pack | Estado | Contenido mostrado en el mock |
|---|---|---|
| 🇻🇪 Venezuela | `preview` | SSO / RPE / FAOV / INCES, utilidades, prestaciones sociales, bono alimentación, doble moneda VES/USD con tasa del período |
| 🇧🇷 Brasil | `preview` | INSS, FGTS, IRRF, 13º salário, férias + 1/3, vale-refeição/transporte |
| 🇪🇸 España | `preview` | IRPF con tramos, cotizaciones SS (cuota empresa/trabajador), pagas extraordinarias (12/14), SMI, finiquito |
| 🇨🇴 🇲🇽 | `coming_soon` | Solo card |

**Regla de honestidad para la demo:** los packs en `preview` llevan badge visible "Vista previa — cálculos no operativos", acciones de cálculo deshabilitadas con tooltip, y la corrida muestra nota "sin retenciones legales aplicadas" mientras el pack no esté `active`. Todo lo demás de la corrida es funcional de verdad.

## 3. Decisión: naming

- Nav "Compensación" → **"Banco de horas"** (`/horas/compensacion`).
- **"Pay Runs" se mantiene** como término.
- La tab "Compensación" de la ficha del empleado pasa a mostrar el perfil salarial (ver §4); el banco de horas del empleado se muestra dentro de "Horas".

## 4. Decisión: la compensación vive en el empleado

- Quitar `unique(company_id, employee_id)` de `pay_profiles`; añadir `effective_to` → **historial salarial effective-dated** (fila vigente = `effective_to is null`).
- La ficha del empleado gana la sección real de **Compensación** (salario, componentes, historial), con permisos owner/hr_admin.
- `/payroll/profiles` se mantiene como **vista de roster** (misma fuente de datos, vista operativa para nómina: quién tiene perfil configurado, quién no).
- **Momento de creación:** al dar de alta un empleado (formulario de alta y flujo de contratación desde el ATS) se ofrece configurar compensación; también desde el roster. El `PUT` actual pasa a upsert o se añade `POST`.

## 5. Decisión: cerrar el loop del banco de horas

Confirmar compensación tipo **"pago"** crea una **novedad de nómina pendiente** que la siguiente corrida del empleado consume como line item. Estados: `pending → included (run X) → paid`. La UI del banco de horas muestra ese estado (hoy el registro muere en `compensation_records`).

Controles añadidos al flujo de confirmación:
- Unicidad empleado+período (no confirmar dos veces el mismo mes) — verificar si existe constraint, añadirla si no.
- (Futuro) visibilidad/aceptación del empleado — la compensación de horas extra requiere trazabilidad de acuerdo en varias jurisdicciones.

## 6. RBAC de payroll (roles existentes)

Separación de funciones: **quien prepara no aprueba**.

| Acción | owner | hr_admin | manager | employee | recruiter |
|---|---|---|---|---|---|
| Configurar país / packs | ✅ | — | — | — | — |
| Crear/editar compensación (perfil salarial) | ✅ | ✅ | — | ver la suya (futuro) | — |
| Crear corrida / generar líneas | ✅ | ✅ | — | — | — |
| Revisar líneas, solicitar cambios, añadir ajustes | ✅ | ✅ | — | — | — |
| **Aprobar corrida / marcar pagada** | ✅ | ❌ | — | — | — |
| Exports (tras aprobación) | ✅ | ✅ | — | — | — |
| Banco de horas: confirmar horas | ✅ | ✅ | sus reports (futuro) | — | — |
| Banco de horas: convertir a compensación | ✅ | ✅ | ❌ | ❌ | — |
| Ver payslips | ✅ todos | ✅ todos | — | los suyos (futuro) | — |

- Toda transición de estado se escribe en `pay_run_audit_log` con actor (la tabla ya existe).
- En empresas donde owner = hr_admin (misma persona), la separación colapsa sin fricción.
- **Una sola matriz de permisos aplicada igual en páginas y API** — hoy dashboard usa admin client y el detalle usa RLS, lo que causa los 404. Unificar (misma fuente de autorización en ambos) elimina el bug y la ambigüedad.

## 7. Alcance de "funcional hasta la gestión de payroll"

Se cablea todo lo siguiente (criterio: se mantiene lo que tiene sentido de producto, y todo esto lo tiene). **Cada bloque lleva sus criterios de aceptación (AC)** — son la definición de "hecho" y la base de los tests.

1. **Perfiles salariales**: creación en alta/contratación + desde roster; "Editar compensación", "Configurar compensación" y "Editar" (banco) conectados; historial effective-dated.
   - **AC-1a:** dar de alta un empleado ofrece configurar compensación; al guardar existe fila en `pay_profiles` con `effective_from` = hoy y `effective_to` = null, en la moneda default del país de la empresa.
   - **AC-1b:** editar el salario con vigencia futura produce 2 filas (la anterior cerrada con `effective_to`, la nueva vigente); la ficha del empleado muestra el historial con ambas.
   - **AC-1c:** "Configurar compensación" desde el empty state crea el perfil sin tocar la DB a mano; el empleado sin perfil aparece en el roster como "sin configurar".

2. **Crear corrida desde la UI** (período + entidad) → **generación de líneas**: perfil vigente + novedades (pagos de banco de horas pendientes, ajustes puntuales, marca de ausencias no retribuidas). Aritmética de gestión; sin retenciones (eso es el pack).
   - **AC-2a (el caso canónico):** empresa con 3 empleados con perfil + 1 sin perfil + 1 pago de banco de horas pendiente → crear la corrida de junio genera **3 líneas**; el empleado sin perfil aparece como **incidencia**, no como línea; el pago del banco aparece como line item en la línea de su empleado; el registro del banco pasa a `included`.
   - **AC-2b:** gross de cada línea = base vigente + componentes activos + line items; gross de la corrida = suma de líneas (cuadra en UI y en DB).
   - **AC-2c:** crear una segunda corrida del mismo período+entidad se bloquea con mensaje explícito.
   - **AC-2d:** la línea usa el perfil **vigente en el período de la corrida**, no el actual (verifica el historial effective-dated).

3. **Revisión**: "Aprobar empleado", "Solicitar cambios", "Añadir ajuste" funcionales con la matriz RBAC.
   - **AC-3a:** "Añadir ajuste" de −100 recalcula la línea y el total de la corrida al instante y crea un line item visible.
   - **AC-3b:** "Solicitar cambios" deja la línea en un estado que **impide aprobar la corrida** hasta resolverse.
   - **AC-3c:** cada acción escribe en `pay_run_audit_log` con actor y timestamp.

4. **Ciclo de estados**: draft → in_review → approved → exported → paid desde la UI, con audit log.
   - **AC-4a:** como `hr_admin`, draft→in_review funciona; in_review→approved devuelve 403 **y** el botón está deshabilitado en la UI (permiso aplicado en las dos capas).
   - **AC-4b:** como `owner`, aprobar solo es posible con todas las líneas aprobadas.
   - **AC-4c:** ninguna transición se salta pasos (draft→paid directo = rechazado).

5. **Exports**: Payroll Summary CSV y Accounting CSV reales. Bank file y Local Compliance quedan detrás del pack de país (mock con badge).
   - **AC-5a:** en corrida `approved`, "Exportar CSV" descarga un archivo con una fila por línea cuyos totales cuadran con la UI, y registra la exportación en `payroll_exports`.
   - **AC-5b:** Bank file y Compliance muestran el badge del pack en preview y **no** descargan nada; en corrida no aprobada, los exports están deshabilitados.

6. **Payslips**: registros generados al aprobar la corrida; "Ver recibo" del perfil muestra el último; modal de recibo de la corrida lee de `payslips`.
   - **AC-6a:** aprobar la corrida crea 1 fila en `payslips` por línea.
   - **AC-6b:** "Ver recibo" en el perfil del empleado abre el del último período; sin corridas aprobadas, muestra estado vacío (nunca botón muerto).

7. **Banco de horas**: renombrado + loop cerrado (§5).
   - **AC-7a:** la nav dice "Banco de horas"; "Pay Runs" se mantiene.
   - **AC-7b:** confirmar 6h como "pago" crea una novedad `pending` visible; tras generarse la corrida, el registro muestra "Incluido en <corrida>" y tras pagarse, `paid`.
   - **AC-7c:** confirmar tipo "tiempo libre" **no** genera novedad de nómina.
   - **AC-7d:** confirmar dos veces el mismo empleado+período se bloquea.

### Fuera de alcance (por ahora)
- Cálculo legal de retenciones (packs en preview).
- Multi-entidad / multi-país por empresa (el esquema queda preparado).
- Portal del empleado (ver su salario/payslips) — marcado como "futuro" en la matriz.
- Aceptación del empleado en compensación de horas.

---

## 8. Orden de implementación sugerido

1. `companies.country` + herencia en `pay_profiles` + selector en Ajustes (desbloquea moneda/formato en todo el módulo).
2. Historial salarial (migración: drop unique, add `effective_to`) + creación/edición de perfiles (UI + upsert).
3. Novedades de nómina + loop del banco de horas.
4. Crear corrida + generación de líneas.
5. Revisión/aprobación con RBAC unificado (arregla también los 404).
6. Payslips + exports CSV.
7. Cards de country packs con estados y mocks VE/BR/ES.
8. Renaming de nav.
