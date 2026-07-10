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

Se cablea todo lo siguiente (criterio: se mantiene lo que tiene sentido de producto, y todo esto lo tiene):

1. **Perfiles salariales**: creación en alta/contratación + desde roster; "Editar compensación", "Configurar compensación" y "Editar" (banco) conectados; historial effective-dated.
2. **Crear corrida desde la UI** (período + entidad) → **generación de líneas**: perfil vigente + novedades (pagos de banco de horas pendientes, ajustes puntuales, marca de ausencias no retribuidas). Aritmética de gestión; sin retenciones (eso es el pack).
3. **Revisión**: "Aprobar empleado", "Solicitar cambios", "Añadir ajuste" funcionales con la matriz RBAC.
4. **Ciclo de estados**: draft → in_review → approved → exported → paid desde la UI, con audit log.
5. **Exports**: Payroll Summary CSV y Accounting CSV reales. Bank file y Local Compliance quedan detrás del pack de país (mock con badge).
6. **Payslips**: registros generados al aprobar la corrida; "Ver recibo" del perfil muestra el último; modal de recibo de la corrida lee de `payslips`.
7. **Banco de horas**: renombrado + loop cerrado (§5).

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
