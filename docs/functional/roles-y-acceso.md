# Roles y control de acceso

## Qué es

Cada usuario que entra a TalentOS tiene un **rol** que determina qué módulos ve y qué acciones puede ejecutar. El rol es por empresa: si alguien pertenece a dos empresas en el futuro, tiene un rol distinto en cada una.

Hoy (Fase 1) la plataforma es de un solo tenant. El modelo está diseñado para multi-tenant desde el inicio: todas las filas de membresía viven en `company_members(company_id, user_id, role)`.

---

## Roles

| Rol | Quién es | Acceso |
|---|---|---|
| `owner` | Fundador o director de RRHH | Todo, incluyendo billing e invitar miembros |
| `hr_admin` | HR del día a día | Todo excepto billing |
| `recruiter` | Reclutador | Solo pipeline: ofertas, candidatos, career site, canales |
| `manager` | Responsable de equipo | Solo su subárbol del organigrama (Fase 2) |
| `employee` | Empleado en autoservicio | Solo lo propio: perfil, ausencias, fichaje (portal aparte, planificado) |

`manager` y `employee` no se construyen en Fase 1. El enum los incluye ya para no romper el esquema cuando lleguen.

---

## Matriz de permisos

`V` ver · `E` editar · `A` aprobar · `—` sin acceso · `*` solo lo propio o su equipo

| Módulo | owner | hr_admin | recruiter | manager | employee |
|---|---|---|---|---|---|
| Dashboard | V | V | V | V | — |
| Ofertas · Candidatos · Canales | VE | VE | VE | — | — |
| Career Site | VE | VE | VE | — | — |
| Empleados · Organigrama | VE | VE | V (directorio básico) | V* | V* (su ficha) |
| Ausencias · Calendario | VEA | VEA | — | VA* | VE* (pedir) |
| Horas · Fichaje | VE | VE | — | V* | VE* (fichar) |
| **Compensación** | VE | VE | **—** | **—** | **—** |
| **Compliance** | VE | VE | **—** | **—** | **—** |
| Ajustes (Empresa, Horarios, Ausencias) | VE | VE | — | — | — |
| Ajustes → **Compliance** | VE | VE | **—** | **—** | **—** |
| Billing · Invitaciones | VE | — | — | — | — |

**Regla invariante:** Compensación y Compliance son siempre `owner`/`hr_admin`. Nunca se relajan, ni en fases futuras.

---

## Membresía

```
company_members
  id          uuid
  company_id  uuid → companies
  user_id     uuid → auth.users
  role        text  (owner | hr_admin | recruiter | manager | employee)
  employee_id uuid → employees   ← puente para scoping de equipo en Fase 2
  invited_by  uuid → auth.users
  invited_at  timestamptz
  joined_at   timestamptz         ← null = invitación pendiente
```

Un usuario sin fila en `company_members` hereda acceso `hr_admin` durante el periodo de transición (para no romper cuentas existentes antes de que el owner asigne roles).

---

## Cómo se asigna el primer owner

El primer usuario registrado en la cuenta debe ser promovido manualmente a `owner` desde la consola de Supabase o mediante un script de seed, hasta que exista el flujo de onboarding de cuenta. Todos los usuarios posteriores se añaden por invitación desde el panel de Ajustes → Equipo (no construido aún).

---

## Implementación por fases

### Fase 1 — rol plano ✅
- Tabla `company_members` activa (`0011_company_members.sql`).
- `current_role_name()` — función `security definer` que lee el rol evitando recursión en RLS.
- **RLS restringido:** `compensation_records`, `compliance_violations` y `compliance_config` → solo `owner`/`hr_admin`. El resto seguía `using(true)`.
- **Menú de navegación** filtrado por rol en AppShell: recruiter no ve Ausencias/Horas/Compensación/Ajustes; manager no ve módulos de Reclutamiento.

### Fase 2 — alcance por equipo (manager) ✅
Implementada en `0012_rbac_phase2.sql`.

- `my_employee_id()` — devuelve el `employee_id` del usuario autenticado vía `company_members`.
- `org_reports(user_id)` — CTE recursiva sobre `employees.manager_id`; devuelve todos los IDs de empleados que reportan al usuario (directa o indirectamente).
- **RLS actualizado** en cuatro tablas:

| Tabla | owner / hr_admin | manager | recruiter |
|---|---|---|---|
| `employees` | todo | propio + subárbol (lectura) | todo (lectura, directorio básico) |
| `absence_requests` | todo | propio + equipo (lectura); equipo (aprobar) | — |
| `time_entries` | todo | propio + equipo (lectura) | — |
| `onboarding_tasks` | todo | equipo (lectura) | — |

**Comportamiento si `company_members` no tiene fila para el usuario:** `coalesce(current_role_name(), 'hr_admin')` garantiza acceso `hr_admin` durante el periodo de transición.

**Limitación conocida:** un manager sin empleados reportando (`org_reports` devuelve vacío) solo ve su propio registro de empleado. Para testear el scoping es necesario añadir empleados con `manager_id` apuntando al employee_id del manager.

### Fase 3 — empleado en autoservicio (pendiente)
- Rol `employee` activo con portal separado.
- Permiso de columna (edita su perfil pero no su salario) — a nivel de endpoint, no RLS de columna.
- Auditoría de accesos a Compensación/Compliance.
