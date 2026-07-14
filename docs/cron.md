# Crons — trabajos de fondo agendados

> **Qué es esto:** el mapa único de los trabajos recurrentes de TalentOS. Un cron es
> cualquier trabajo **basado en tiempo que no debe esperar a que un usuario lo
> dispare**: refrescar dato derivado, disparar alertas, sincronizar con el exterior,
> enviar digests, limpiar. Este doc cubre el **patrón técnico** (cómo se construye uno,
> igual para todos) y el **catálogo funcional** (cuáles existen y cuáles son candidatos).
> **Regla de mantenimiento:** un cron nuevo se añade a la tabla del §3 en el mismo
> commit que lo crea. Un cron que no está aquí no existe.

---

## 1. El patrón (idéntico para todos los crons)

Todo cron de TalentOS se construye igual — copiar el de insights es la plantilla:

1. **Endpoint bajo `/api/cron/<nombre>`** (método `GET`). No tiene UI: es infraestructura.
2. **Auth por `CRON_SECRET`** (secreto compartido, no sesión de usuario). Vercel Cron
   envía `Authorization: Bearer ${CRON_SECRET}`; el handler compara y responde **401 si
   no coincide o si el secreto no está configurado** (*fail-closed*: sin secreto, no corre).
3. **Excluido del middleware de sesión** — `/api/cron/*` está en la lista pública de
   `middleware.ts` porque lo gobierna el bearer, no la cookie. Sin esto, el middleware
   redirige a `/login` (307) y el cron nunca llega a su handler.
4. **Registro en `vercel.json`** (`crons: [{ path, schedule }]`, schedule en cron-syntax UTC).
5. **Idempotente** — recalcula desde cero, no acumula. Correrlo dos veces = mismo estado.
6. **Resiliente por-ítem** — si procesa varias entidades (p. ej. todas las empresas), el
   fallo de una **no aborta el resto**: se registra (`console.error`) y sigue; el response
   devuelve un resumen `{ ok, failed, results }`.
7. **Consciente del coste** — si invoca IA, va por `runAgent` (presupuesto por empresa +
   auditoría) y solo cuando hay trabajo real (empresas sin señal → $0).
8. **`export const dynamic = "force-dynamic"`** + `maxDuration` acorde al barrido.

**Requisito de despliegue:** `CRON_SECRET` debe existir en el entorno de **Vercel
(Production)**. Es un valor aleatorio que se genera una vez (`openssl rand -hex 32`) y se
pega en Settings → Environment Variables. Sin él, el endpoint responde 401 y el cron no
corre — a propósito.

### Anatomía de referencia
- Endpoint: [`app/api/cron/insights/route.ts`](../app/api/cron/insights/route.ts)
- Lógica compartida (reutilizable por el disparador manual y el cron): [`lib/insights/generate.ts`](../lib/insights/generate.ts)
- Registro: [`vercel.json`](../vercel.json)
- Exclusión de middleware: [`middleware.ts`](../middleware.ts) (`/api/cron` en `isPublic`)

---

## 2. Cron ≠ dónde se ve el dato

Distinción que el nombre confunde. Son dos responsabilidades separadas:

- **El cron PRODUCE el dato:** background, agendado, escribe en una tabla (p. ej.
  `agent_insights`). No pinta nada.
- **La UI CONSUME el dato:** una o varias superficies leen esa tabla cuando el usuario
  abre la pantalla.

Consecuencia práctica: **añadir una nueva superficie que muestre insights (badge en
topbar, señales por módulo, etc.) NO requiere tocar el cron** — lee la misma tabla. El
cron mantiene el dato fresco; quién lo muestra es independiente y se decide por producto.

---

## 3. Catálogo — crons actuales y candidatos

| Cron | Estado | Qué hace (funcional) | Escribe/dispara | Frecuencia |
|---|---|---|---|---|
| **insights** (`/api/cron/insights`) | ✅ construido 2026-07-14 | Recalcula las "Sugerencias del agente" de **todas las empresas** (motor de señales determinista + redactor LLM). Activa el plano proactivo: al abrir el dashboard, las señales ya están frescas sin que nadie pulse "actualizar". | tabla `agent_insights` | diaria 06:00 UTC |
| **salary-baseline** (§8 roadmap agentes) | 🔲 candidato | Pipeline periódico que investiga/scrapea portales y reportes salariales (ES/VE/BR), con citas, y refresca la tabla de baseline por rol×ubicación. Nunca en vivo por oferta: el job-writer lee la tabla ya construida. | tabla de baseline salarial | semanal/mensual |
| **ai-spend-alert** (§9.1 Platform Console) | 🔲 candidato | Revisa el gasto de IA agregado y por-empresa (desde `agent_runs._usage`); si una empresa se acerca/supera su límite o hay un pico anómalo, dispara alerta al operador. | notificación al platform_admin | diaria u horaria |
| **module-signals** (extensión del proactivo) | 🔲 idea | Packs de señales más allá de reclutamiento (payroll: corridas sin revisar; ausencias: solapes de equipo) que alimentarían el mismo `agent_insights` o superficies por módulo. | `agent_insights` (misma tabla) | diaria |
| **digests / notificaciones** | 🔲 idea | Resúmenes agendados (p. ej. email semanal al owner con KPIs de su empresa). | envío de notificación | semanal |

**Cómo se lee esta tabla:** los ✅ existen y corren; los 🔲 son casos previstos que
seguimos el mismo patrón cuando toque. Documentarlos aquí antes de construirlos es
deliberado — deja claro que el cron de insights es la **plantilla de una familia**, no un
caso aislado, y evita reinventar la auth/estructura cada vez.

---

## 4. Probar un cron

- **Local:** poner `CRON_SECRET` en `.env.local` y `curl -H "Authorization: Bearer <secreto>"
  http://localhost:3001/api/cron/<nombre>`. Sin secreto correcto → 401 (verifica el fail-closed).
- **Producción:** Vercel dispara según `vercel.json`; el log del cron se ve en el dashboard
  de Vercel (Deployments → Functions / Crons). El response `{ ok, failed, ms, results }`
  resume el barrido.
