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

---

# Recon — segunda tanda: tecnología, telecom y logística (13-ago-2026)

Cifras contadas contra la respuesta real de cada API, con verificación cruzada.

## Nuevas fuentes con volumen VE verificado

| Fuente | Ofertas VE | ATS | Endpoint | Esfuerzo | Recomendación |
|---|---|---|---|---|---|
| **Cashea** | **57** de 74 | Teamtailor | `GET cashea.na.teamtailor.com/jobs.json` (y `.rss`) → 200 | BAJO | **ENTRA — la mejor fuente VE de todo el estudio** |
| **Ridery** | **10**, todas VE | Odoo Recruitment | `GET ridery-odoo.ridery.app/jobs` (HTML limpio + sitemap) | BAJO | **ENTRA** — `robots.txt` sin un solo `Disallow` |
| **Telefónica / Movistar** | **7** | SAP SuccessFactors | sitemap (291 locs); RSS/JSON devuelven HTML | MEDIO | **ENTRA con reservas** — ver riesgo de caducidad |
| **DHL** | **6** | Phenom sobre Avature | `POST careers.dhl.com/widgets` → 200, sin auth | BAJO | **ENTRA** |
| **Kuehne+Nagel** | **1** | Phenom sobre SuccessFactors | `POST jobs.kuehne-nagel.com/widgets` → 200 | BAJO | **ENTRA** — mismo adaptador que DHL, coste marginal ~0 |
| **Inter** | 51 registros = **2 cargos reales** | Ninguno (PHP propio) | `GET inter.com.ve/ajax/postulacion.php` → 200, 51 registros | BAJO | **ENTRA con dedupe obligatorio** |

**Un solo adaptador Phenom** sirve para DHL, Kuehne+Nagel y UPS. El `body` del POST:
`{"ddoKey":"refineSearch","from":0,"size":100,"jobs":true,"counts":true,"selected_fields":{"country":["Venezuela"]}}`

**La etiqueta de país NO es uniforme** entre fuentes: DHL usa `"Venezuela"`, K+N
`"Venezuela (Bolivarian Republic of)"`, SmartRecruiters `country=ve`. Normalizar a `VE` en el
conector, nunca confiar en la cadena de origen.

## Descartadas, con motivo

| Empresa | Por qué |
|---|---|
| **MercadoLibre** | **0 vacantes VE** (907 globales). Validado contra Argentina 153, Brasil 450, Chile 116 antes de aceptar el cero |
| **UPS** | 0 — Venezuela ni aparece en su facet de 48 países |
| **PedidosYa** | 1 sola oferta, de **abril de 2024**: evergreen rancia |
| **Yummy** | Su web enlaza a `jobs.lever.co/yummysuperapp`, que da **404**. 12 tokens probados en Lever, Teamtailor, PeopleForce, Greenhouse, Ashby y Workable: ninguno vivo. Sin board público → captación por correo |
| **Wawa (La Wawa)** | Webflow con formulario; no publica vacantes |
| **Digitel** | No existe página de empleo: 15 rutas y 3 subdominios probados. Y sus condiciones prohíben expresamente reproducción y distribución |
| **Cuadro** | **No identificada.** Lo más cercano, `cuadro.app` (contabilidad, EE. UU.) y `somoscuadro.com` (indumentaria), no encajan. **Pendiente de que Michael aclare a qué empresa se refería** |

## Cuatro advertencias operativas

1. **Cashea declara `Content-Signal: ai-train=no, ai-input=yes`** — permite ingesta para uso en
   vivo pero se opone al entrenamiento de modelos. El pipeline debe respetarlo: publicar sus
   ofertas sí, usarlas para entrenar no.
2. **Inter infla el índice.** Sus 51 registros son **2 cargos replicados en 28 ciudades**, todos con
   vigencia fija 2026. Deduplicar por `CarCod` + `CiuOrigen` y marcarlas como oferta permanente, no
   como vacante fresca. Sin eso, dos puestos parecerían 51 y ensuciarían el board entero.
3. **Telefónica tiene fecha de caducidad.** Anunció su salida de Venezuela (nov-2025) y la venta
   está en pausa. Sus 7 vacantes son las más cualificadas del estudio (DBA, Data Engineer, Core/OSS,
   SAP), pero el conector puede quedarse sin fuente.
4. **Un 200 no confirma la empresa.** `apply.workable.com/.../yummy` responde 200 pero es "Yummy
   Pear"; `.../wawa` es la cadena de tiendas de EE. UU. Los tres devolvían `jobs: []`. Verificar
   siempre la identidad, no solo el código de respuesta.

## Condiciones de uso — el hueco que queda

Quedan **"no verificado" en casi todo el estudio**: las páginas legales de DHL, UPS, K+N y
Telefónica devolvieron 404 o quedaron tras protección anti-bot. Solo se recuperaron avisos de
privacidad de candidato, sin cláusulas de reuso. **No hay prohibición comprobada, pero tampoco
permiso comprobado.** Revisarlas desde un navegador real antes de producción.

## Inventario VE verificado hasta ahora

Banesco 202 · **Cashea 57** · OIM 24 · BBVA Provincial 16 · Ridery 10 · Telefónica 7 · DHL 6 ·
Inter 2 (tras dedupe) · Kuehne+Nagel 1 → **~325 ofertas**, más todo el bloque ONG vía ReliefWeb,
aún sin medir.

---

# Recon — tercera tanda: consumo y retail (13-ago-2026)

## Nuevas fuentes con volumen VE verificado

| Fuente | Ofertas VE | ATS | Endpoint | Esfuerzo | Recomendación |
|---|---|---|---|---|---|
| **Mondelez** | **~24** (Caracas, Valencia, Maracay, Barquisimeto, Maracaibo, Coro) | Workday `mdlz/External` | `POST mdlz.wd3.myworkdayjobs.com/wday/cxs/mdlz/External/jobs` body `{"appliedFacets":{},"limit":20,"offset":0,"searchText":"Venezuela"}` → 200, `total: 26` | BAJO | **ENTRA** |
| **Excelsior Gama** | **25, todas VE** | HiringRoom | `somosgama.hiringroom.com/jobs` — HTML server-rendered (37 KB). Sin JSON: `/api/jobs`, `/jobs/api` y `api.hiringroom.com/v1/jobs` dan 404 | BAJO-MEDIO | **ENTRA — el mejor local, 100 % VE** |
| **Colgate-Palmolive** | **3–8** (Caracas, Valencia) | SAP SuccessFactors RMK | `jobs.colgate.com/sitemap.xml` **no es un sitemap: es un feed RSS de Google Jobs** (6,6 MB, 540 items) con `g:location`, `g:job_function`, `g:expiration_date` | BAJO | **ENTRA** — el feed es más completo que su propio buscador |

**Mondelez no tiene faceta de país.** Las facetas expuestas son `jobFamilyGroup`, `workerSubType`,
`timeType`, `remoteType` y `locationMainGroup`, y la última no devuelve valores anidados. Hay que
filtrar por `searchText: "Venezuela"` y **post-filtrar por `locationsText`**: de las 26 que devuelve,
2 son falsos positivos (una LatAm, una México).

**PepsiCo — asimetría a respetar.** El front `pepsicojobs.com` permite rastreo (`Allow: /`,
`crawl-delay: 5`) y expone `GET /api/jobs?country=Venezuela` → 200. Pero el ATS de detrás
(`globalcareers-pepsico.icims.com`) declara `User-agent: * / Disallow: /`. **Consumir solo el
front, nunca el iCIMS.** Hoy son 1 sola oferta, así que MÁS ADELANTE.

## Descartadas, con motivo

| Empresa | Por qué |
|---|---|
| **Coca-Cola FEMSA** | Portal HiringRoom con 11 vacantes: 7 Argentina, 4 Uruguay, **cero Venezuela**, pese a que su web dice operar aquí. El corporativo está tras Akamai (403 a todo) |
| **Empresas Polar** | `empresaspolar.com/vacantes` son 970 caracteres: un título y un botón que **manda a LinkedIn**. Cero vacantes. Además `Content-Signal: ai-train=no` — reserva expresa de derechos (art. 4 Directiva UE 2019/790) |
| **Farmatodo** | Su career real es un **Google Sites** con 16 cargos genéricos sin fecha ni ubicación, y un Google Form. Es un buzón de CVs, no un job board |
| **Cervecería Regional** | Sin sección de empleo, y sus términos **prohíben el scraping textualmente** ("robot, araña, raspador u otro dispositivo automático"). Doble motivo |
| **Locatel** | `locatel.com.ve/empleo` devuelve el fallback de búsqueda de VTEX: dos productos. No hay career page. `robots.txt` **vacío** (0 bytes) |
| **Traki** | `traki.com.ve/empleo` → 301 → `traki.com` = "Volvemos pronto". Sitio en migración |
| **Central Madeirense** | Sitio caído: DNS resuelve pero todas las conexiones dan timeout. Último snapshot de su zona de empleo, **nov-2021** |

## La lectura que más importa

**De los cinco minoristas venezolanos puros —Polar, Farmatodo, Locatel, Traki y Central
Madeirense— ninguno publica ofertas estructuradas en su web.** Cuatro no tienen career site
funcional y Polar te manda directo a LinkedIn.

Eso **refuerza la tesis del board propio**: el canal no está ocupado, es que **no existe**. Y
explica por qué el mercado venezolano vive en LinkedIn y en canales informales.

El patrón de multinacionales se confirma a medias: Workday y SuccessFactors sí están, pero el
"portal global con cero Venezuela" es real — Coca-Cola FEMSA 0, PepsiCo 1. **Solo Mondelez tiene
volumen venezolano de verdad.**

## Aviso de higiene

Ni la ausencia de `robots.txt` ni un `Allow: /` equivalen a permiso de reutilización. En Cervecería
Regional el veto es explícito y en Polar el `Content-Signal: ai-train=no` es una reserva formal.
Para las tres que sí entran —Mondelez, Gama y Colgate— **no se pudieron verificar los términos de
uso**; conviene revisarlos antes de producción, en especial HiringRoom, cuyos T&C no aparecen en
las URLs habituales.

## Inventario VE verificado, acumulado

Banesco 202 · Cashea 57 · **Excelsior Gama 25** · OIM 24 · **Mondelez 24** · BBVA Provincial 16 ·
Ridery 10 · Telefónica 7 · DHL 6 · **Colgate 5** · Inter 2 · Kuehne+Nagel 1 → **~379 ofertas
venezolanas**, más el bloque ONG vía ReliefWeb, aún sin medir.

---

# Recon — cuarta tanda: otros + job boards VE (13-ago-2026)

## ⚠️ Corrige a las tandas anteriores

**Kuentro NO está vacío.** La primera tanda concluyó "sitemap con 0 `<loc>`" y lo descartó. Era la
lectura equivocada: es una SPA, así que el sitemap es solo el shell. **Tiene API JSON abierta**:
`POST api.kuentro.ai/api/jobs/searchFeeFull` body `{"page":1}`, sin auth → 200, y su `count_items`
declara **3.712 ofertas, 100 % venezolanas** en la muestra. **Es el mayor inventario VE-nativo del
estudio.** Límite comprobado ejecutando la paginación: anónimamente se agota en **exactamente 30
ofertas únicas** y a partir de ahí el metadata se rompe (además hay un off-by-one: pides `page:1`
y responde `page:2`). Para las 3.712 hace falta token → **conversación con ellos**.

**Vacantes.com pasa de "MÁS ADELANTE" a NO.** Sus términos prohíben el scraping textualmente, y su
`robots.txt` incluye **un bloque específico para ClaudeBot que no permite `/vacantes/`**. Además no
es venezolana (Delaware/Andorra) y solo tiene 12 ofertas VE.

## Nuevas fuentes

| Fuente | Ofertas VE | Stack | Endpoint | Esfuerzo | Recomendación |
|---|---|---|---|---|---|
| **Kuentro** | **3.712** declaradas · **30** accesibles sin token | SPA React + Laravel | `POST api.kuentro.ai/api/jobs/searchFeeFull` → 200 sin auth | BAJO-MEDIO | **ENTRA** — el único VE-nativo con JSON abierto y volumen real. Pedirles token |
| **Bumeran VE** | **756** URLs de oferta | — | `sitemap_avisos_bum.xml`; `robots.txt` sin Disallow global | BAJO | **ENTRA** — no estaba en el encargo y es la mejor alternativa a Kuentro |
| **Grupo Parawa** | **20–21, 100 % VE** | HiringRoom | `grupoparawa.hiringroom.com/jobs`, HTML renderizado en servidor | BAJO | **ENTRA** — más volumen VE que EY, Deloitte y BAT juntos |
| **EY Venezuela** | **8** (Caracas, Valencia, Pto. La Cruz) | SuccessFactors RMK | `careers.ey.com/sitemap.xml` (7.545 ofertas, `lastmod` diario) + filtro país por URL | BAJO | **ENTRA** |

## Bloqueadas por sus propios términos — decisión consciente

| Fuente | Ofertas VE | Por qué NO |
|---|---|---|
| **SLB** | **34** (Maturín 31, Anaco 3) | La mejor API técnica del estudio —Coveo con token público en el HTML, las 34 en una llamada— pero sus términos **prohíben el scraping Y el uso de IA sobre su contenido**: *"does not provide permission to you copy, scrape, archive… Use artificial intelligence or machine learning algorithms on the content of this Website"*. No se resuelve por vía técnica: requiere acuerdo |
| **BAT** | 3 | `Disallow:/search-jobs/` justo en el endpoint útil, **y** términos que describen literalmente nuestro caso de uso: *"you may not make any part of the Site available as part of another website, whether by scraping, crawling, hyperlink framing…"* |
| **Vacantes.com** | 12 | *"Realizar actividades de scraping, crawling, extracción automatizada de datos […] sin autorización previa y por escrito"* + bloque ClaudeBot en robots |
| **Deloitte VE** | 3 | WAF bloquea todo lo que no sea navegador, incluido `/robots.txt`. Tres ofertas no justifican pelearlo |
| **Computrabajo VE** | el mayor del mercado | Sin feed ni API: robots no declara sitemap y `/sitemap.xml` da 302. **Solo por acuerdo comercial** |
| **Conectados.ai** | no verificado | Es panameña (Humanet Group). AppSync GraphQL 401, `api.conectados.ai` 403. Sin superficie pública |

## Tres hipótesis mías que resultaron falsas

1. **SLB no usa Workday ni Phenom** — es **Coveo**.
2. **EY no usa Taleo ni Oracle** — es **SuccessFactors RMK**, igual que Deloitte y BAT: los tres
   grandes comparten familia de plataforma.
3. **Grupo Parawa sí tiene career site**, y con 20 ofertas VE tiene más volumen venezolano que EY,
   Deloitte y BAT juntos.

## Secuenciado sugerido

**Grupo Parawa y EY primero** — esfuerzo bajo, cero bloqueos. **Kuentro y Bumeran VE en paralelo**
para volumen. **SLB merece una petición formal de permiso**: 34 ofertas cualificadas y una API
impecable, pero es la restricción más dura de todo el estudio.

---

# Recon — quinta tanda: ONG y organismos internacionales (13-ago-2026)

## Lo que más cambia el plan: son 2 conectores, no 12

**El patrón dominante del sector no es Oracle, es Workday**, y su API es idéntica en todos:
`POST /wday/cxs/{tenant}/{site}/jobs`, mismo body, mismo JSON. **Un solo conector parametrizado
por tenant+site** cubre IRC, WFP y UNHCR — y también **BBVA Provincial y Mondelez** de las tandas
anteriores. Con el conector Oracle de OIM, dos piezas de código cubren la mayor parte del sector.

## Fuentes con volumen VE verificado

| Organización | Vacantes VE | ATS | Endpoint | Recomendación |
|---|---|---|---|---|
| **IRC** | **20** (de 364) | Workday `theirc.wd1` | `POST theirc.wd1.myworkdayjobs.com/wday/cxs/theirc/External_Careers/jobs` → 200 | **ENTRA — prioridad 1** |
| **HIAS** | **14** (de 21) | ClearCompany | `hias.hrmdirect.com/employment/job-openings.php?search=true&dept=54319` → 200 HTML | **ENTRA — prioridad 2** |
| **DRC** | **8** (de 55) | Propio (Umbraco) | `drc.ngo/en/jobs/` → 200, toda la bolsa en un HTML sin paginación, con `data-country="Venezuela"` | **ENTRA — prioridad 3** |
| **IFRC** | 2 (de 28) | Lumesse/TalentLink | `/fo/rest/jobs` → **403** server-side | MÁS ADELANTE |
| **PMA / WFP** | 1 (de 97) | Workday | `POST wd3.myworkdaysite.com/wday/cxs/wfp/job_openings/jobs` → 200. **Ojo al host**: `myworkdaysite.com`, no `myworkdayjobs.com` | **ENTRA** — coste marginal, mismo conector |

**Cobertura resultante con OIM incluido: 69 vacantes en Venezuela** (OIM 24 · IRC 20 · HIAS 14 ·
DRC 8 · IFRC 2 · WFP 1), con **2 conectores + 2 scrapers HTML triviales**.

## Trampas comprobadas al integrar

- **Workday: `limit` máximo 20.** Con 50 devuelve error. Paginar con `offset`.
- **No filtrar por `searchText`.** En IRC devuelve 26, pero el barrido completo de las 364 filtrando
  por `locationsText` da **20 realmente en Venezuela**: el buscador engancha menciones en
  descripciones y puestos regionales. **Filtrar por ubicación, nunca por texto.**
- **`careers.rescue.org` es solo fachada** (Phenom sobre Azure). El ATS real es Workday `theirc.wd1`.
  Atacar el HTML de Phenom sería un error: el JSON está debajo.
- **HIAS: el `dept=54319` puede cambiar.** Releer el `<select>` en cada ejecución en vez de
  hardcodearlo (el propio desplegable declara "HIAS Venezuela - 14 Jobs").

## Descartadas, con motivo

- **UNICEF** — PageUp devuelve **202 con 0 bytes** a cualquier petición programática, incluso a un
  `fetch()` desde el navegador con cookies. Y tiene 0 vacantes en Venezuela.
- **`venezuela.un.org/es/jobs`** — **1 sola vacante** en toda la página, `rss.xml` con 0 items, y
  facetas de cierre que van de 2019 a 2030. Es un índice global abandonado para Venezuela.
- **ACNUR / UNHCR** — 0 en su Workday **pese a tener operación activa en Venezuela**, porque
  **contrata allí vía UNOPS**: sus vacantes de Caracas salen como contratos LICA con números
  `JR24xxxxx` anunciados por UNOPS. Para capturar ACNUR/Venezuela hay que ir a UNOPS.
- **CICR/ICRC** — sitemap limpio y permitido, pero 0 vacantes VE hoy. Reevaluar.
- **unvacancies.org** — su `/api/v1/jobs` es abierto y riquísimo (53 campos, 46 ofertas VE), **pero
  su `robots.txt` marca `Disallow: /api/*`** y su `Content-Signal: ai-train=no, use=reference` es
  una reserva de derechos. Además es un **scraper de segundo nivel**: sus propios `source_url`
  apuntan al Workday del IRC. Ir a la fuente primaria, que es justo lo que cubren los conectores de
  arriba. Si algún día interesa, se pide permiso a `hello@unvacancies.org`.

## Pendiente de esta tanda

PNUD/UNDP, UN Careers, UNOPS, FAO, OPS/OMS y UNFPA — hosts y `siteNumber` de Oracle Recruiting
Cloud. **UNOPS es la vía real de las vacantes de ACNUR en Venezuela**, así que es la más relevante
de las que faltan.

---

# Recon — sexta tanda: agencias de la ONU (13-ago-2026)

## Un aviso honesto antes de la tabla

**Solo hay 3 vacantes ONU en Venezuela verificadas hoy** (UNDP 2 en Caracas y Maracaibo, ambas de
UNOCHA; Secretaría 1 en Caracas), más las 24 de OIM. El volumen venezolano del sistema ONU es
**estructuralmente muy bajo**. Estos conectores valen por **cobertura regional y por marca**, no
por número de vacantes locales. Si el criterio de entrada es volumen VE, hay que priorizar por otro
eje: Kuentro, Banesco, Cashea y Bumeran pesan muchísimo más.

## El hallazgo de mejor relación coste/beneficio

**Un tenant Oracle compartido**, `estm.fa.em2.oraclecloud.com`, aloja varias agencias a la vez:

| Agencia | `siteNumber` | Reqs totales | Vacantes VE |
|---|---|---|---|
| **UNDP / PNUD** | `CX_2` | 383 | **2** (Caracas, Maracaibo — ambas UNOCHA) |
| **UNFPA** | `CX_2003` | 67 | 0 |
| *sin identificar* | `CX_1001` | 62 | por mapear |
| *sin identificar* | `CX_3001` | 99 | por mapear |

**El conector de OIM ya escrito las cubre todas cambiando host y `siteNumber`.** Mapear `CX_1001` y
`CX_3001` es coste marginal cero y probablemente añade dos agencias más.

El tenant de UNDP aloja además **UN Women, UNOCHA y UNV**, así que sus vacantes salen por el mismo
sitio.

## Fuentes que entran

| Org | ATS | Endpoint | VE | Esfuerzo |
|---|---|---|---|---|
| **UNDP + UNFPA** | Oracle RC | `estm.fa.em2.oraclecloud.com/hcmRestApi/…/recruitingCEJobRequisitions?…siteNumber={CX_2\|CX_2003},limit=200` → 200. Máx. **200** por request, paginar con `offset`. El detalle de cada vacante también es público (`recruitingCEJobRequisitionDetails`) | 2 · 0 | BAJO |
| **UN Careers** (Secretaría) | SPA Angular + API propia sobre MongoDB — **no es Inspira** | `POST careers.un.org/api/public/opening/jo/list/filteredV2/en` con `{"filterConfig":{"jle":[],"jc":[]},"pagination":{"page":0,"itemPerPage":2000,"sortBy":"startDate","sortDirection":-1}}` → 200, 426 vacantes con descripción completa. **Sin `sortBy` devuelve 500** (error de Mongo filtrándose — confirma que no hay capa de auth) | 1 | BAJO |
| **PAHO / OPS** | **Workday**, no el Taleo de WHO | `POST paho.wd5.myworkdayjobs.com/wday/cxs/paho/pahocareers/jobs` → 200, total 16 | 0 | BAJO |

## Descartadas

- **UNOPS** — Avature. Sin API (todo 404), pero **sí scrapeable con curl puro**:
  `careers.unops.org/careersmarketplace/SearchJobs?jobOffset=N`, 6 por página. Recorridas las 14
  páginas: 79 vacantes, **0 en Venezuela**. Esfuerzo MEDIO, sin premio hoy. *(Nota: la tanda
  anterior identificó UNOPS como la vía de contratación de ACNUR en Venezuela; ese canal **no
  aparece** en su marketplace público.)*
- **FAO** y **WHO/OMS** — ambas **Oracle Taleo**, el muro del estudio. `POST
  /careersection/rest/jobboard/searchjobs` devuelve **HTTP 500 "An Error Occurred in TEE"** incluso
  ejecutándolo desde dentro de la página con sesión válida. Taleo hace POST de formulario con
  render en servidor: **no hay XHR que interceptar**. Exige navegador headless con sesión pegajosa.
  FAO 114 vacantes, WHO 72, **0 en Venezuela** en ambas. WHO no tiene ni una vacante en las
  Américas — confirma que esa región se gestiona aparte, por el Workday de PAHO.

## Balance de conectores de todo el recon

Tres patrones cubren prácticamente todo lo que merece la pena:

1. **Oracle Recruiting Cloud** — OIM, UNDP, UNFPA (+ los dos sites por mapear).
2. **Workday CXS** (`POST /wday/cxs/{tenant}/{site}/jobs`) — IRC, WFP, UNHCR, PAHO, **BBVA
   Provincial** y **Mondelez**. `limit` topa en 20.
3. **API propia de `careers.un.org`**.

Más scrapers HTML triviales para DRC, HIAS, Excelsior Gama, Grupo Parawa y Ridery.

---

# Recon — séptima tanda: contratación remota desde Venezuela (13-ago-2026)

## La única con etiqueta país = Venezuela explícita

| Fuente | Ofertas | ATS | Endpoint | VE | Recomendación |
|---|---|---|---|---|---|
| **Valatam** | 18 | Workable | `apply.workable.com/api/v1/widget/accounts/valatam` → 200, con `title, country, city, telecommuting, url` | **3 explícitas** (Email & SMS Marketing Manager, Marketing & Social Media Specialist, Recruitment Manager LATAM) | **ENTRA — la más limpia del bloque.** `robots` con `Disallow:` vacío |

Reparto de Valatam: Ecuador 8 · Colombia 7 · **Venezuela 3** · Argentina 2 · Perú 1 · Nicaragua 1 ·
Guatemala 1. Es la **única de todo el estudio cuyo feed nombra Venezuela como país de la oferta**.

## Limpias y sin bloqueos

| Fuente | Ofertas | ATS | Endpoint | Nota |
|---|---|---|---|---|
| **Nortal / Nearsure** | 47 (**45 "Latin America - Remote"**) | Greenhouse `nortal` | `boards-api.greenhouse.io/v1/boards/nortal/jobs?content=true` → 200 | **Nearsure fue adquirida por Nortal**; su cartera LATAM sigue viva bajo ese token |
| **CloudDevs** | **332** | WP Job Manager | `clouddevs.com/wp-json/wp/v2/job-listings?per_page=100` → 200, `X-WP-Total: 332` | REST completo + taxonomías. Títulos en formato `Cliente: Rol` |
| **Ubiminds** | 21 | Lever | `api.lever.co/v0/postings/Ubiminds?mode=json` → 200 | **El token distingue mayúsculas**: `Ubiminds` funciona, `ubiminds` da 404. Sobre todo Brasil |
| **DistantJob** | 13 | Greenhouse `distantjob` | `boards-api.greenhouse.io/v1/boards/distantjob/jobs` → 200 | Pequeño pero trivial |

## Volumen enorme, pero con una decisión que tomar antes

| Fuente | Volumen | Por qué no es automático |
|---|---|---|
| **Torre** | **297.622** en corpus · `{"location":{"term":"Venezuela"}}` → **77.506** · abiertas 39.879 | `POST search.torre.co/opportunities/_search`, sin auth, paginado, con `locations[]`, `remote`, `compensation` en USD. **`torre.ai` prohíbe `/search/jobs?*` a los crawlers, pero el host de la API es otro y no tiene `robots.txt`.** Aprovechar esa separación de hosts es precisamente el tipo de decisión que conviene tomar a conciencia |
| **Somewhere** (ex Shepherd) | **~2.100–2.400** · 553 LATAM | Recruit CRM. **`albatross.recruitcrm.io/robots.txt` es `Disallow: /`**, y el endpoint **exige falsificar `Origin` y `Referer`** para responder. Eso es un control de acceso deliberado, no un descuido |
| **Athyna** | 74, LATAM puro | Mismo Recruit CRM, mismo `Disallow: /`, mismo requisito de cabeceras |

**La vía limpia para las tres es pedir acuerdo de sindicación** — que además da atribución y logo,
que es lo que quiere el empleador. Los términos de Somewhere no prohíben scraping; lo que lo
desaconseja es el `robots` del host de su API y el tener que suplantar cabeceras.

## Descartadas

- **Virtual Latinos** — sus términos **prohíben el scraping expresamente**: *"Systematic retrieval
  of data […] to create or compile a collection, compilation, database or directory without written
  permission"* y *"any automated use of the system, such as data mining, robots…"*. Además el
  marketplace exige registro.
- **Stefanini LATAM** — API Gupy limpia (`employability-portal.gupy.io/api/v1/jobs?companyId=54256`,
  181 ofertas), pero **0 en Venezuela** y mayoría presencial o híbrida. Reevaluar solo si se abre
  es-mx o es-pe.
- **BruntWork** — sin API y sin señal VE. `bruntwork.co` además veta `/job/` en robots.
- **Turing** — su tablero de Greenhouse es **solo contratación corporativa** (Palo Alto, Bengaluru,
  São Paulo); el marketplace de desarrolladores no está expuesto.
- **BairesDev** — el detalle por oferta **sí es público** (`applicants.bairesdev.com/api/JobPosting?JobPostingId={id}`,
  schema.org sin auth) y su `applicantLocationRequirements` **nombra Venezuela**, pero **no hay
  endpoint de listado**: solo se enumeraría por fuerza bruta de ids. Sirve para *enriquecer*, no
  para descubrir. *(Dato curioso: su `robots.txt` permite explícitamente ClaudeBot y GPTBot.)*
- Howdy · TECLA · Alluxi · Revelo · Remote Latinos — sin feed público. Listopro fue absorbida por
  Revelo, cuyo sitemap solo expone hubs SEO, no ofertas.

## Trampas comprobadas, para el conector

1. **El widget de Workable miente por omisión.** Un token inexistente da 404, pero **varias cuentas
   existen y devuelven 200 con `"jobs":[]`** — `somewhere`, `bruntwork`, `bairesdev`, `howdy`,
   `ubiminds`, `athyna`, `near`, `revelo`, `alluxi`. Un 200 no es un feed.
2. **Recruit CRM tiene rate-limit por IP y lo señala mal**: tras ~110 peticiones devuelve
   `{"message":"You are not allowed to access this URL."}` **con HTTP 200**, no 429. Hay que
   detectar ese mensaje como fallo, no como respuesta vacía.
3. **El `search_data` de Recruit CRM no filtra en servidor** en ninguna de las formas probadas: hay
   que traerse el catálogo entero y filtrar en nuestro lado.
4. **Alluxi devuelve soft-404s**: HTTP 200 con HTML para cualquier ruta inventada. Comprobar
   `content-type` antes de creerse un 200.
5. **Dos adquisiciones cambian la lista**: Nearsure → Nortal, Listopro → Revelo.
