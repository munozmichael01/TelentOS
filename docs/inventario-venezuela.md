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

---

# Recon de fuentes — resultados (13-ago-2026)

Nivel de evidencia: **COMPROBADO** = respuesta HTTP real verificada · **INFERIDO** = deducido de
indicios · **no verificado** = no se pudo comprobar. Ninguna celda se rellenó a ojo.

## Primer lote — con volumen VE verificado

| # | Fuente | Ofertas VE | Esfuerzo | Nota |
|---|---|---|---|---|
| 1 | **Banesco** · `POST empleos.banesco.com/ExtVacancies/GetVacancies` (body `{}`) → 200 JSON | **202** | BAJO | El mayor inventario del estudio, y **con estado geográfico** → alimenta directo el orden local-first. Ver la advertencia legal abajo |
| 2 | **OIM** · Oracle Recruiting Cloud REST, sin auth | **24** (todas Caracas) | BAJO | Probada de punta a punta |
| 3 | **ReliefWeb API** · cubre ACNUR, UNICEF, PMA, IRC, DRC, HIAS… | por medir | BAJO tras trámite | **Camino crítico: exige `appname` pre-aprobado desde nov-2025.** Pedirlo ANTES de escribir conector |
| 4 | **BBVA Provincial** · Workday tenant `bbva`, site `BBVA` | **16** | BAJO | `robots.txt` lo permite explícitamente (`Allow: /BBVA/`) |
| 5 | **Valatam** · Workable | por medir | BAJO | Divisas. Falta extraer el token del JS |
| 6 | **Computrabajo VE** | por medir | MEDIO | Mayor volumen del mercado; `robots` permite `/ofertas-de-trabajo/`. Después de los cuatro primeros |

### Endpoints verificados

```
# OIM — 200 OK, JSON, SIN autenticación. 24 vacantes VE.
https://fa-evlj-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/
  recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.workLocation
  &finder=findReqs;siteNumber=CX_1,limit=200,sortBy=POSTING_DATES_DESC
# filtrar cliente-side por PrimaryLocationCountry == "VE"

# ReliefWeb — gratuita, 1.000 resultados/llamada, 1.000 llamadas/día
https://api.reliefweb.int/v2/jobs?appname={APROBADO}&profile=full&limit=200
  &filter[field]=country.iso3&filter[value]=ven&sort[]=date.created:desc
# Alta del appname: docs.google.com/forms/d/e/1FAIpQLScR5EE_SBhweLLg_2xMCnXNbT6md4zxqIB00OL0yZWyrqX_Nw/viewform
# La WEB de reliefweb devuelve HTTP 444 "not available for scraping" → la API es la ÚNICA vía legítima
```

## Donde la respuesta es NO, y por qué

- **BAT** — `robots.txt` veta explícitamente `/search-jobs/`. Solo por acuerdo.
- **Banco Plaza** — sus condiciones prohíben la reproducción y distribución sin autorización.
- **unvacancies.org** — declara `Content-Signal: ai-train=no`, una reserva expresa de derechos.
- **Bancamiga** — geobloqueo Cloudflare; inaccesible sin IP venezolana.

Se anotan como **decisión consciente** para que nadie los reintente por rastreo dentro de tres meses.

## Sin career site rastreable — cómo se resuelve

Seis de los ocho bancos, Digitel y varias marcas de retail **no tienen inventario propio**. Cuatro
carriles, de más a menos preferible:

1. **Feed inverso — el empleador publica en nuestro `/employer`.** BNC recoge candidaturas con un
   **Google Form** y Mercantil con un **buzón de correo**: el listón a superar es bajísimo y el
   argumento comercial se escribe solo. Es a la vez inventario y captación.
2. **Agregadores con licencia, no rastreo.** Computrabajo VE y Talent.com. Preferir siempre el
   acuerdo de partner al raspado: es la diferencia entre un canal y un riesgo.
3. **`schema.org/JobPosting` como red de arrastre.** Las páginas de empleo modernas incrustan
   JSON-LD para Google for Jobs — marcado puesto ahí **para ser leído por máquinas**. Un extractor
   genérico resuelve muchos casos "sin API" sin un parser por empresa. Probar en Farmatodo, Inter,
   SLB y EY.
4. **Descubrir ATS inspeccionando el JS, no adivinando.** Resultado negativo importante: se
   probaron **35 tokens** en Greenhouse y Lever y **todos dieron 404** salvo `shepherd` (200, cero
   ofertas). La hipótesis "las empresas de remoto LatAm usan Greenhouse/Lever" **no se sostiene**
   con los nombres obvios. Hay que leer las llamadas XHR reales de cada career site: media hora por
   empresa, y convierte un ALTO en un BAJO.

## Advertencia sobre Banesco

Es el activo más valioso **y** el más flojo jurídicamente: portal propio, sin condiciones
publicadas, no un ATS con contrato de distribución pública como Workday o Greenhouse. **Ausencia de
términos no es permiso.** Con 202 de las ~242 ofertas verificadas del primer lote, es además una
dependencia demasiado concentrada para apoyarla en un endpoint sin acuerdo. Entrar por conversación
comercial, no por rastreo silencioso.

## Sin verificar (pendiente, no descartado)

Consumo y retail (Polar da 403 a cliente no-navegador, Coca-Cola FEMSA, Cervecería Regional,
Locatel, Traki, Central Madeirense, Excelsior Gama), parte de tecnología (Cashea, Yummy, Ridery,
Wawa, Cuadro, PedidosYa), telecom (Telefónica, Inter) y remoto (BruntWork, BairesDev, Stefanini).
Los job boards venezolanos **no aportan**: Vacantes.com no tiene ni una oferta de Venezuela,
Conectados.ai solo publica blog y Kuentro devuelve un sitemap vacío.
