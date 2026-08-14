# Inventario venezolano — semilla y método

**Objetivo:** que el board tenga ofertas reales de Venezuela. Hoy hay **cero**: el inventario es
Turijobs (ES 2.538 · PT 429 · AD 58…) más 10 ofertas de demo en España y Remoto. Sin inventario
venezolano el eje país no se puede ni observar, los hubs de ciudad no tienen contenido y el board
sigue siendo una demo.

**Regla dura:** el scraper produce registros con la forma que ya consume
`scripts/import-turijobs.mjs`. Ese importador ya hace dedupe (`dedupe_hash`), emparejado con la
taxonomía y los tres campos geográficos. **No se crea un pipeline paralelo.**

## Semilla (de Michael, 13-ago-2026)

Nombres dados por el dueño del producto, que conoce el mercado. **No se sustituyen ni se amplían
con nombres generados de memoria** (regla 2 del proyecto: nunca inventar datos de referencia).

### Empleadores

**Banca y finanzas:** Banesco · Bancaribe · BNC · Bancamiga · Mercantil · Provincial

**Consumo y alimentación:** PepsiCo · Coca-Cola FEMSA · Empresas Polar · Cervecería Regional ·
Mondelez · Colgate-Palmolive · Farmatodo

**Tecnología y plataformas:** Cashea · Yummy · Ridery · MercadoLibre · Cuadro · Wawa

**Otros:** DHL · Telefónica · Grupo Parawa

### Job boards venezolanos

Vacantes.com · Conectados.ai · Kuentro

*(LinkedIn queda FUERA por decisión de Michael. Computrabajo VE se decide a conciencia después
del primer lote, no por inercia: es el líder del mercado pero **no expone API ni feed público**
—solo web manual o multiposter— así que sería raspado de HTML, que es el camino con exposición de
condiciones de uso. Ver `handoff/P1 Canales - panorama y shortlist.md`.)*

### Documento adicional pendiente de leer

https://docs.google.com/document/d/1s9QaqN-pi6eZnNbh-7b3Lvn7n26ELtxtb9fnvPVP9eY/edit

Requiere sesión de Google; no se ha leído todavía. **Leerlo antes de cerrar la tabla de fuentes**,
por si cambia la selección.

## Qué hay que averiguar de cada fuente

Una fila por sitio, y con esto se decide cuáles entran:

| Campo | Por qué importa |
|---|---|
| ¿Tiene sección de empleo pública? | Si no publica en abierto, no hay nada que traer |
| ¿ATS detrás? (Workday, SAP SuccessFactors, Oracle, Greenhouse…) | Muchos exponen listado JSON/XML estable — mejor que raspar HTML |
| Nº de ofertas activas en Venezuela | Separa las fuentes que rinden de las que no |
| `robots.txt` | Higiene mínima, se respeta siempre |
| Condiciones de uso | Los agregadores tienen exposición real; las webs de empleador, mucha menos |
| Esfuerzo de extracción | HTML frágil vs. feed estable |
| Recomendación | Entra / no entra / más adelante |

## Por qué se empieza por empleadores y no por agregadores

Tres razones, en este orden:

1. **Riesgo bajo** — es el propio empleador publicando en abierto, y quiere distribución.
2. **Dato canónico y fresco** — sin la capa de normalización (y de errores) del agregador.
3. **Es captación** — si le publicamos gratis a una empresa, ya hay conversación comercial. Esto
   ataca el cuello de botella real, que no es funcionalidad sino uso.

La investigación previa ya concluyó que en Venezuela **no hay un incumbente con API donde
enchufarse** y que el mercado es mayoritariamente informal; de ahí que la jugada sea el board
propio más distribución, no integrarse con un tercero que no existe.
