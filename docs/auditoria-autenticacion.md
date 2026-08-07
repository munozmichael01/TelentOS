# Auditoría de autenticación entre las cuatro superficies

**Fecha:** 2026-08-06 · **Motivo:** navegando entre productos se cruzaban las sesiones.
**Alcance:** `middleware.ts`, guards de página, formularios de entrada, cierre de sesión,
invitación al portal y el claim `audience`.

## El modelo actual, en una frase

Un navegador = **una** cookie de sesión de Supabase, y el reparto entre superficies se decide con
un solo claim, `app_metadata.audience`, con tres valores posibles: `candidate`, `employee` y
**ausente** (= personal de empresa).

Que el claim viva en `app_metadata` y no en `user_metadata` **está bien**: `user_metadata` lo puede
escribir el propio usuario con `auth.updateUser`, así que allí el gating sería decorativo.

De ahí salen los dos problemas de fondo: **una sola sesión no puede representar a dos identidades a
la vez**, y **la ausencia del claim se interpreta como permiso** (default-allow).

## Hallazgos

### 1. Bucle infinito de redirects — CRÍTICO, reproducido en producción

Un usuario con `audience=employee` y **sin ficha de empleado** queda encerrado:

```
/es-ve/app/dashboard 307 → /es-ve/me/profile 307 → /app/dashboard 307 → /es-ve/app/dashboard 307 → BUCLE
```

El navegador termina en `ERR_TOO_MANY_REDIRECTS`. La cuenta **no puede ni llegar al login para
salir**, porque cualquier ruta privada rebota. Dos reglas correctas por separado se muerden:

- `middleware.ts:74` — `audience=employee` en `/app/*` → va a `/me/profile`.
- `app/[locale]/me/layout.tsx:26` — sin ficha de empleado → va a `/app/dashboard`.

Cómo se llega a ese estado: se invita a alguien al portal y después RR.HH. **borra o desvincula su
ficha**; o la invitación falla a medias (marca la audiencia y no llega a vincular). Hoy hay una
cuenta así en producción: `qa-portal-check@talentos.dev` (la dejo sin tocar como caso de prueba).

**Arreglo:** ninguna de las dos reglas debe redirigir a ciegas. El portal, sin ficha, tiene que
enseñar una pantalla que explique la situación en vez de rebotar; y el middleware no debe mandar al
portal a quien no tiene ficha. La comprobación de ficha es la que sabe la verdad, así que manda ella.

### 2. Invitar al portal puede quitarle el admin a quien lo administra — CRÍTICO

`app/api/employees/[id]/invite/route.ts:63` fija `audience: "employee"` sobre una cuenta que **ya
existe**, sin mirar quién es. Si esa cuenta era del personal de empresa, a partir de ese momento el
middleware la expulsa de `/app/*` para siempre, y **no hay ninguna pantalla para revertirlo**.

Se dispara cuando la ficha aún no está vinculada (`employee.user_id is null`) y el email ya tiene
cuenta — que es exactamente el estado de todas las fichas al desplegar el portal por primera vez. Si
RR.HH. "invita a todo el mundo", incluida la ficha del owner, se cierra la puerta a sí mismo.

La misma línea rompe el caso inverso: invitar a un **ex-candidato** le cambia la audiencia de
`candidate` a `employee` y pierde `/cuenta/*` — sus candidaturas y su CV. El recorrido normal
(aplicas → te contratan → te invitan al portal) le borra el acceso a su propio historial.

*Este hallazgo sale de leer el código, no de ejecutarlo: comprobarlo en vivo habría dejado una
cuenta real bloqueada.*

**Arreglo:** la invitación no debe degradar a nadie. Si la cuenta ya es de empresa o de candidato,
o no se le pone `audience`, o el claim deja de ser un valor único y pasa a ser una lista.

### 3. El login de empresa acepta cuentas de candidato sin avisar — ALTO

`/es-ve/login` con sesión de candidato devuelve **200**: le enseña el formulario de "acceso interno"
a alguien que ya está dentro como candidato. Si mete unas credenciales de empresa, **su sesión de
candidato se reemplaza en silencio**. Y al revés: si un candidato se autentica ahí, `login-form.tsx:58`
hace `router.push("/")` y el middleware no redirige a candidatos desde la home — se queda en el
marketing, logueado, con la sensación de que no ha pasado nada.

Es el cruce que se notó navegando. El camino contrario **sí** está resuelto: `/cuenta/entrar` detecta
la sesión de empresa y avisa (`companySession`). Falta la simétrica.

**Arreglo:** el login de empresa debe avisar igual, y rechazar explícitamente una cuenta de
candidato en vez de dejarla entrar a ninguna parte.

### 4. Cerrar sesión desde el portal aterriza en la superficie equivocada — MEDIO

`components/app-shell.tsx:321` manda siempre a `/login`, y el shell lo comparten admin y portal. Un
empleado que cierra sesión en su portal acaba en una pantalla que dice *"ACCESO INTERNO · EQUIPO DE
RECLUTAMIENTO"*. La cuenta del candidato sí lo hace bien (`account-client.tsx:242` → `/cuenta/entrar`).

**Arreglo:** el destino sale de `variant` (`admin` → `/login`, `portal` → `/login` con su copy, o una
entrada propia del portal).

### 5. La ausencia del claim se interpreta como permiso — MEDIO

Hoy hay **14 cuentas sin `audience`** y todas se tratan como personal de empresa. Cualquier cuenta
creada por una vía que no fije el claim puede pedir `/app/*`. La barrera real la pone la RLS —sin
`company_members` no ve datos— así que no es una fuga, pero el modelo es *default-allow* y bastaría
una vía nueva de alta que olvide el claim para que aparezca en el admin.

**Arreglo:** derivar la audiencia de los hechos (`company_members` / `employees` / `candidates`) en
vez de confiar en un claim que hay que acordarse de poner, o fijarlo en el alta de empresa también.

### 6. El login pierde el locale y el destino — BAJO

`login-form.tsx` usa `useRouter` de `next/navigation` en vez del de `@/i18n/navigation`, y hace
`push("/")` fijo. Ignora el `?next=` de la URL, así que quien llega al login desde un enlace profundo
acaba en la home. Además encadena tres redirects hasta el destino real (`/` → `/app/dashboard` →
`/me/profile` para un empleado).

## Lo que sí está bien

- `audience` en `app_metadata`, no en `user_metadata`.
- La RLS es la barrera real de datos; el middleware solo enruta. Verificado en esta misma sesión:
  el empleado ve 11 jornadas de 163, el manager solo su equipo, RR.HH. la empresa entera.
- `/cuenta/entrar` avisa cuando hay una sesión de empresa abierta.
- Empleado con ficha, candidato y RR.HH. aterrizan donde deben (trazas de redirects verificadas).

## La decisión de producto que hay detrás

Los hallazgos 2 y 3 son el mismo problema: **hoy una persona solo puede ser una cosa**. Pero una
misma persona puede ser candidata en una empresa, empleada en otra y owner de la suya. Mientras
`audience` sea un valor único, cada alta nueva pisa la anterior.

Hay dos salidas y conviene elegir antes de parchear:

**(a) Una identidad, varias audiencias.** `audience` pasa a lista (`["candidate","employee"]`) y cada
superficie comprueba pertenencia. Una sola cuenta, un solo login, y el usuario cambia de producto con
un selector. Es más trabajo y obliga a revisar los siete sitios que hoy comparan con `===`.

**(b) Identidades separadas a propósito.** La cuenta de candidato y la de empresa son cuentas
distintas aunque compartan email — con el aviso claro de que entrar en una cierra la otra. Menos
trabajo, pero la fricción es permanente y el caso "me contrataron y perdí mis candidaturas" sigue ahí.

Recomiendo **(a)**: es la que sostiene el producto que estamos construyendo, donde el job board
alimenta al ATS y el ATS al portal — la misma persona recorre las tres superficies por diseño.

---

## Estado tras el arreglo (2026-08-07)

Se eligió la salida **(a)** con un matiz del dueño del producto: no "una identidad con varias
audiencias derivadas de los hechos", sino **alta explícita por producto** con el mismo email y
contraseña, y **sin selector** — para cambiar de producto se sale y se entra por su puerta.

| # | Hallazgo | Estado |
|---|---|---|
| 1 | Bucle infinito de redirects | ✅ Imposible por construcción: no se redirige entre productos |
| 2 | La invitación quitaba el admin / las candidaturas | ✅ `grantAudience` añade, nunca reescribe |
| 3 | El login de empresa aceptaba candidatos sin avisar | ✅ La puerta detecta la sesión sin alta y lo explica |
| 4 | Logout a la superficie equivocada | ✅ Vuelve a la puerta del producto en el que estabas |
| 5 | Sin claim = permiso (default-allow) | ✅ Sin alta no se entra a ninguno |
| 6 | El login perdía locale y destino | ✅ Router de i18n; el destino lo decide el middleware |

Verificado en producción con sesiones reales, 20 trazas de redirects: el bucle original, sin
sesión, rutas viejas, cada producto rechazando a quien no tiene su alta, y la misma persona
(owner + empleado) entrando en dos productos.

**Efecto secundario del despliegue:** el primer intento dejó las puertas dentro del layout que
exige sesión y tumbó el login en producción hasta el arreglo siguiente. La lección va en
CLAUDE.md: la puerta de un producto nunca puede colgar del layout que la exige.

**Queda sin cerrar:** hay fichas de candidato que coinciden por email con una cuenta pero cuyo
`user_id` apunta a otra (o a ninguna). No se pierde nada —darse de alta en `/candidate` las
vincula— pero conviene un barrido.
