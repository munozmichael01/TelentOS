# Productos, acceso y mercados

> Actualizado el 12-ago-2026, tras separar TalentOS en tres productos y cerrar todos los
> mercados menos Venezuela. La versión anterior de este documento (jul 2026) describía una sola
> aplicación con roles; eso ya no es exacto.

## El modelo en una frase

TalentOS no es una aplicación con vistas distintas según quién entra: son **tres productos**
con puerta propia, más un job board público. Dentro de cada producto, el **rol** decide qué se
ve y qué se puede hacer.

Son dos preguntas encadenadas y conviene no mezclarlas:

1. **¿A qué producto puedo entrar?** Lo decide el **alta** (`app_metadata.audiences`).
2. **Una vez dentro, ¿qué puedo hacer?** Lo decide el **rol** (`company_members.role`), y lo
   impone la RLS en base de datos.

---

## Los tres productos

| Producto | Entrada | Quién entra | Cómo se da de alta |
|---|---|---|---|
| **Job board** | `/{locale}/empleos` | Cualquiera | No hace falta cuenta |
| **Admin B2B** | `/{locale}/employer/sign-in` | Empresa: owner, hr_admin, recruiter, manager | Registro propio (crea la empresa) o invitación al equipo |
| **Portal del empleado** | `/{locale}/employee/sign-in` | Plantilla | **Solo por invitación de su empresa.** No hay autoservicio |
| **Cuenta del candidato** | `/{locale}/candidate/sign-in` | Candidatos | Registro propio desde el board |

**Una persona se da de alta en cada producto por separado**, y puede usar el mismo email y la
misma contraseña en los tres. Tener cuenta en el board no da el admin. Es habitual tener varias:
un fundador es owner de su empresa, empleado de ella, y puede ser candidato en otra.

**No hay selector de contexto.** Para cambiar de producto se sale y se entra por su puerta. Si
una persona tiene alta en varios, la puerta a la que llega le enseña enlaces a los otros.

**Nunca se salta de un producto a otro automáticamente.** Quien pide un producto en el que no
tiene alta llega a la puerta de *ese* producto, que le explica la situación. Esta regla no es un
detalle de implementación: saltar entre productos producía un bucle infinito de redirects que
dejaba cuentas encerradas sin poder ni cerrar sesión (`docs/auditoria-autenticacion.md`).

### Qué pasa si el alta deja de sostenerse

El alta da acceso a la **puerta**; lo que se ve dentro lo mandan los datos. Si a alguien le
retiran su ficha de empleado, el portal caduca su alta y su puerta se lo dice. No se le manda a
otro producto.

---

## Mercados e idiomas

El locale es **idioma-país** (`es-ve`, `en-ve`). Hoy hay **un solo mercado abierto, Venezuela, en
español e inglés**. La plataforma admite 3 idiomas × 4 países; abrir un mercado nuevo es añadirlo
a `ACTIVE_COUNTRIES` en `i18n/routing.ts` y hereda toda la lógica de abajo sin más trabajo.

**Qué significa el país:**

- **En el job board**, y solo ahí: se ven **todas** las ofertas, salgan de donde salgan. Las del
  país seleccionado aparecen **primero**, y el resto se ordenan por la relevancia propia del
  buscador. El país **ordena, no filtra**. Nadie ve una lista vacía por elegir un mercado.
- **Fuera del board no significa nada.** Marketing, admin y portal solo distinguen idioma; lo
  legal y de nómina se configura por empresa dentro del producto, no por la URL.

Las URLs de mercados cerrados **no dan 404**: redirigen al equivalente abierto conservando el
idioma (`en-us` → `en-ve`). Si el idioma también está cerrado, van al español; y como los slugs
del board están traducidos, la ruta cae a la raíz del board (`/pt-br/vagas` → `/es-ve/empleos`).

---

## Roles

| Rol | Quién es | Acceso |
|---|---|---|
| `owner` | Fundador o director de RRHH | Todo, incluyendo billing e invitar miembros |
| `hr_admin` | HR del día a día | Todo excepto billing |
| `recruiter` | Reclutador | Solo pipeline: ofertas, candidatos, career site, canales |
| `manager` | Responsable de equipo | Solo su subárbol del organigrama (Fase 2) |
| `employee` | Empleado en autoservicio | Solo lo propio, y en el portal del empleado (producto aparte) |

Un miembro con rol `employee` **no entra al admin B2B**: su producto es el portal. El resto de
roles sí, y muchos de ellos son además plantilla, así que tienen las dos altas.

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
