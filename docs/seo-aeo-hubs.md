# Hubs SEO/AEO del Job Board — arquitectura, dependencias y desbloqueo

Documentación técnica de la estrategia de URLs de hub, SSR, structured data (JSON-LD),
sitemap e indexación (Google Indexing API). Pensado para **SEO** (Google Search / Google
Jobs) **y AEO** (Answer Engine Optimization: ChatGPT, Perplexity, Google AI Overviews,
Gemini). Estado: PLAN (Pieza 2 del épico de búsqueda). Fecha: 2026-07-24.

## 1. Por qué (y el error que corregimos)

El buscador del board se construyó **client-side** (SPA: al buscar hace `fetch` y actualiza la
lista sin cambiar la URL). Eso lo hace **invisible para SEO/AEO**: los crawlers ven un shell
sin contenido y no hay URLs indexables por cargo/categoría/ubicación. Se rehace para que cada
búsqueda estructurada sea una **URL real, server-rendered y con structured data**.

## 2. Esquema de URLs (matriz)

```
/empleos                                  → todas las ofertas (índice)
/empleos/{A}                              A = categoría | cargo | ubicación
/empleos/{A}/{B}                          A = categoría | cargo ; B = ubicación (ciudad|región|país)
```
- **Ubicación** = ciudad, región (admin1) o país. Slugs localizados es/en/pt.
- Ejemplos: `/es-ve/empleos/camarero`, `/es-ve/empleos/barcelona`,
  `/es-ve/empleos/camarero/barcelona`, `/es-ve/empleos/hosteleria/espana`.
- **Slugs localizados por mercado**: `/es-ve/empleos/camarero` · `/en-us/jobs/waiter` ·
  `/pt-br/vagas/garcom` (de las traducciones de la taxonomía + gazetteer).

### Resolución sin colisiones
Un único `resolveHub(seg1, seg2, locale)` clasifica cada segmento **en prioridad fija**:
**categoría → cargo → ubicación**. Cada slug pertenece a un solo tipo (los slugs localizados
casi nunca colisionan); si colisionara, gana la prioridad. `seg2` siempre es ubicación. Si no
resuelve → 404 real.

### Política de hubs sin ofertas
- Hub con **≥1 oferta activa** → `index,follow` + en sitemap.
- Hub que **resuelve pero 0 ofertas ahora** → **HTTP 200 + `noindex,follow`** + mostrar
  ofertas/hubs relacionados. **NO 404, NO redirect a home** (preserva la URL y su autoridad;
  se re-indexa cuando vuelvan ofertas; el redirect masivo = soft-404).
- **Oferta individual caducada/eliminada** → 404/410.

## 3. SSR (Server-Side Rendering)

Cada hub es un **Server Component** que ejecuta `searchJobs` (RPC `board_rank_jobs`) en el
servidor y devuelve el **HTML con las ofertas ya renderizadas**. Los crawlers (Googlebot,
GPTBot, PerplexityBot, etc.) reciben contenido real, no un shell JS. Incluye:
- `<h1>` semántico ("Empleos de Camarero en Barcelona"), intro textual del hub.
- Lista de ofertas con enlaces internos a cada oferta (crawl path).
- `breadcrumb` visible + navegación a hubs hermanos (interlinking = distribuye autoridad).
- `<link rel="canonical">` a sí mismo; `hreflang` a las variantes es/en/pt.
- `meta robots` condicional (noindex si 0 ofertas).

## 4. Structured data / JSON-LD (SEO + AEO)

Requisito de la Indexing API y clave para Google Jobs y para que los answer engines citen.
- **Página de oferta**: `JobPosting` completo (title, description, datePosted, validThrough,
  hiringOrganization, jobLocation, baseSalary, employmentType). Elegible para el widget de
  Google Jobs.
- **Hub**: `ItemList` de las ofertas + `BreadcrumbList`. Opcional `FAQPage` ("¿Cuánto gana un
  camarero en Barcelona?", "¿Cuántas vacantes hay?") — muy fuerte para **AEO**.
- **Board/Org**: `WebSite` + `Organization` en el layout.

## 5. AEO (Answer Engine Optimization)

Los motores de respuesta necesitan, además del SSR + JSON-LD:
- **Contenido textual** en el hub (no solo cards): resumen del mercado laboral del cargo/ciudad,
  rango salarial, nº de vacantes — texto que un LLM puede citar.
- **Semántica limpia**: headings jerárquicos, listas, tablas de datos (salario por ciudad).
- **`FAQPage` JSON-LD** con preguntas naturales.
- **Crawlabilidad para bots de IA**: `robots.txt` permite GPTBot/PerplexityBot/Google-Extended
  (decisión de negocio); un `llms.txt` opcional con el mapa del sitio y qué ofrece.
- **Datos frescos y fechados** (`datePosted`/`validThrough`) — los answer engines priorizan
  recencia.

## 6. Sitemap + Indexing API (los 4 puntos del dueño)

1. **Indexar todo hub con ≥1 oferta activa.**
2. **Sitemap diario** (cron) con SOLO esos hubs → subir a `/sitemap.xml` + **ping a Google**
   (`https://www.google.com/ping?sitemap=...`) para que lo relea.
3. **Indexing API en tiempo real**: al aparecer la 1ª oferta de un hub (o hub nuevo) →
   `URL_UPDATED`; al caducar/eliminar la última oferta del hub → `URL_DELETED`. Así Google
   siempre sabe qué está vivo. (La Indexing API es oficial para `JobPosting`.)
4. **JSON-LD `JobPosting`** en cada oferta y `ItemList` en cada hub (requisito).

## 7. Dependencias e instrucciones de DESBLOQUEO (Google)

La Indexing API + Search Console requieren accesos que son del **dueño** (yo dejo el código
listo; esto lo enchufa):

1. **Google Search Console**: verificar la propiedad `telent-os-mu.vercel.app` (o el dominio
   final). Método recomendado: registro DNS o meta-tag.
2. **Google Cloud**: crear un proyecto → habilitar **Indexing API** → crear un **Service
   Account** → generar una **clave JSON**.
3. **Enlazar**: en Search Console, añadir el email del service account como **Propietario**
   (Owner) de la propiedad. (Sin esto, la Indexing API responde 403.)
4. **Env vars en Vercel** (prod): `GOOGLE_INDEXING_SA_EMAIL`, `GOOGLE_INDEXING_SA_KEY`
   (la private key del JSON), `PUBLIC_SITE_URL`.
5. **Cuotas**: la Indexing API da ~200 URLs/día por defecto; se puede pedir ampliación. El
   sitemap diario cubre el grueso; la Indexing API es para altas/bajas puntuales.

Mientras no estén las credenciales: **el sitemap diario + ping funcionan sin service account**
(no requieren auth). Solo la Indexing API (UPDATE/DELETE en tiempo real) queda en pausa hasta
tener los pasos 1-4.

## 8. Slices de implementación

- **2a** · `resolveHub` (categoría|cargo|ubicación, slugs localizados) + `p_country` en el RPC
  + rutas SSR `/empleos/[a]` y `/empleos/[a]/[b]` con ofertas rankeadas, H1/breadcrumb,
  canonical/hreflang, noindex condicional, y JSON-LD (`JobPosting`/`ItemList`/`BreadcrumbList`).
- **2b** · El buscador **navega** las selecciones estructuradas a la URL del hub (SSR) en vez
  de `fetch` client-side.
- **2c** · Sitemap diario (cron) + cliente Indexing API (UPDATE/DELETE) + `FAQPage`/AEO. Enchufe
  con las credenciales de Google (sección 7).
