# Taxonomía (ESCO) · Matching · Ranking del board

Documentación técnica del sistema de taxonomía de job titles/skills y del ranking de
relevancia compartido por el board público y el asistente. Última actualización: 2026-07-24.

## 1. Modelo de datos (taxonomía)

Fuente: export oficial de la **API de ESCO v1.2.0** en `data/taxonomy/taxonomy.json`
(generado por `scripts/build-taxonomy-from-esco.mjs`). El JSON es solo **fuente de seed**;
el store en runtime es la BBDD.

| Tabla | Contenido |
|---|---|
| `job_titles` | Título canónico. `canonical_name`, `esco_uri`, `category`, `sector`, `source` (esco/agent/manual). |
| `job_title_translations` | Traducciones es/en/pt (`name`). PK (job_title_id, locale). |
| `job_title_synonyms` | Sinónimos por idioma (`synonym`). Formas alternativas buscables. |
| `job_title_relations` | Grafo título↔título con `weight` (roles relacionados). |
| `job_title_skills` | Enlace título→skill con `weight` (essential 0.85-0.95 / optional 0.45-0.65) e `is_core`. |
| `skills` | Skill canónica. `name`, `aliases[]`, `esco_uri`, `category`. |
| `skill_translations` / `skill_synonyms` | Traducciones y sinónimos de skill. |
| `skill_relations` | Grafo skill↔skill con `weight`. |

Todas son **datos de referencia públicos**: RLS con lectura para `anon`+`authenticated`,
escritura solo `service_role` (seeds). Migraciones `0052`, `0053`.

### Seeds
- `npm run seed:taxonomy` (`scripts/seed-taxonomy.mjs`): seedea todo el `taxonomy.json`
  (350 títulos + 1.766 skills con URIs, sinónimos, traducciones, relaciones, enlaces JT↔skill).
- `npm run seed:titles -- --sector=<nombre|all> [--dry]` (`scripts/seed-titles-from-esco.mjs`):
  trae ocupaciones REALES de la API de ESCO para los sectores del preset `SECTORS` (hostelería,
  software, it_ops, product_design, exec, people_hr, finance, marketing, customer, logistics,
  maintenance, retail). Abrir un sector nuevo = una entrada en ese mapa, no un script nuevo.
  Incluye un **filtro de relevancia**: la búsqueda de ESCO es difusa y para "human resources
  manager" devuelve también "human rights officer" o "library manager"; se exige compartir el
  token específico del término (los genéricos tipo *manager/officer* no bastan). `--dry` lista
  lo que entraría y lo descartado, para auditarlo antes de aplicar.
- `npm run seed:titles -- --enrich [--dry]`: completa lo que `build-taxonomy-from-esco.mjs`
  truncó en los títulos ya existentes — recorta sinónimos y skills a 8, y ahí se perdieron los
  acrónimos de ESCO (CEO, CTO, CIO) y skills core. Solo añade, nunca borra.
- `job_title_synonyms` tiene índice único (migr. 0064) sobre (título, locale, `lower(synonym)`):
  antes no lo tenía y re-ejecutar un seeder duplicaba filas.

### Modelo de DOS NIVELES (migr. 0066)

`job_titles` tiene dos niveles, porque el estándar internacional y el vocabulario real del
mercado no son lo mismo:

| `level` | Qué es | Trae |
|---|---|---|
| `esco` | **Ancla** estándar | `esco_uri`, etiqueta oficial, traducciones, sinónimos y skills |
| `market` | **Cargo real** que publican las empresas y buscan los candidatos | `parent_title_id` al ancla; **hereda sus skills** y puede añadir propias |

Ejemplo: `Frontend Engineer` y `Backend Engineer` son cargos de mercado con padre
`software developer` (19 skills heredadas cada uno); `Head of People` y `People Ops` cuelgan de
`human resources manager`.

**Regla anti-redundancia** (evita duplicar cargos, que es el riesgo principal):
- Misma ocupación dicha de otra forma (mesero/camarero/waiter · CEO/chief executive officer) →
  **sinónimo**, no crea fila.
- El mercado lo trata como puesto distinto —otras expectativas, otras skills, demanda de
  búsqueda propia— aunque ESCO lo agrupe en un genérico → **cargo `market`** con padre.
- Test: ¿lo buscaría un candidato con ese término **y** pondría el recruiter requisitos
  distintos? Los dos sí → cargo propio. Solo el primero → sinónimo.
- Las variantes de **seniority** no son cargos ("Senior Backend Engineer" no es otro puesto):
  eso vive en su columna.
- El nombre tiene índice único **normalizado**: "Sushiman" y "sushiman" no pueden coexistir.

### Curación del nivel `market` — `npm run taxonomy:market`

El vocabulario **se observa** de datos reales (`employees.role_title` + `jobs.title` limpiados,
con frecuencia mínima), nunca se inventa. El padre **no se asigna automáticamente**: la
heurística de similitud de tokens falla de forma peligrosa (probado: *Night Manager* → `night
auditor`, *Finance Analyst* → `financial manager`, *Técnico de Mantenimiento* →
`microelectronics maintenance technician`). Por eso el flujo es:

1. `--emit` vuelca `data/taxonomy/market-titles.json` con la propuesta y su score.
2. Se **revisa a mano**: `decision` = `market` | `synonym` | `skip`, y `parent` explícito. Lo que
   no tiene ancla adecuada se queda en `review` — **no se fuerza un padre incorrecto**.
3. `--apply` inserta solo lo curado. El fichero queda versionado en el repo y auditable en un PR.

### Relaciones con peso — `npm run build:relations`

`job_title_relations (a_id, b_id, weight)` es un grafo **no dirigido** (par normalizado `a<b`,
con PK) que alimenta el "relacionados por peso" del ranking del board y del asistente.
Se recalcula entero con **top-N por cargo** (antes había un `.slice(0, 600)` global que dejaba
sin vecinos a 371 de 590 cargos). Señales, todas deterministas: Jaccard de skills · solapamiento
léxico del nombre · misma área · **jerarquía** (padre↔hijo 0.90, hermanos 0.75).

## 2. Ofertas ↔ taxonomía

- `jobs.title`: texto **libre** (SEO/atractivo). Lo que ve y busca el candidato. No se toca.
- `jobs.job_title_id`: **título canónico estructurado** (FK a `job_titles`, nullable). Para
  matching y ranking. Migración `0055`.
  - **Nativas**: lo setea el picker de cargo del formulario de publicación (exacto).
  - **Importadas**: lo deriva el **matcher** (texto libre → título canónico) en
    `scripts/backfill-job-skills.mjs` y en `scripts/import-turijobs.mjs`. Best-effort (~57%).
- `job_skills`: skills de la oferta. Si el feed no las declara, se **heredan del job title**
  (`job_title_skills`). Cobertura actual ~37% del board.

## 3. Matching de skills (dedup)

`lib/skills.ts` → `resolveSkillIds(db, names[])`: texto libre → `skill_id` canónico.
Resuelve contra `skills.name` + `skills.aliases` + **`skill_synonyms`** (todo normalizado sin
acentos). Así "Excel" y "Microsoft Excel" caen en la **misma** skill (no duplica). Solo crea
skill nueva si no matchea nada. Usado por publicar oferta, aplicar, CV parsing, perfil.

## 4. Anclaje de la interpretación (asistente)

`lib/job-board/job-titles.ts`:
- `expandJobTitle(q)`: término de rol → sinónimos + variantes localizadas (para **recall**:
  "chef"→"cocinero", cross-idioma). Índice cacheado en memoria (TTL 15 min).
- `resolveTitleContext(q)`: término → `{ titleIds, relatedIds, relatedW }` para el **ranking**.
  Un término ("cocinero") resuelve a **varios** títulos (grill cook, cook…), igual que se
  mapean las ofertas.

El agente `agent-board-assistant` recibe además las categorías canónicas en el prompt y
devuelve la CLAVE de categoría directa (no texto libre).

## 5. Ranking de relevancia (board + asistente IGUAL)

RPC `board_rank_jobs(...)` (migración `0056`), consumido por `searchJobs` (`lib/job-board/search.ts`).
Puntúa cada oferta por su `job_title_id`:

```
exacto (job_title_id ∈ títulos de la query)      → 1000
relacionado (∈ relacionados)                     → 500 + peso*100
solo substring (q en título/descripción)         → 100
resto                                            → 0
```

Orden final: **aplicadas al final → relevancia desc → (salario si sort=salary) → recencia**.
Pagina en DB (orden consistente para board y "cargar más" del asistente).

- **Board**: `searchJobs` **auto-resuelve** el contexto de título desde `q`.
- **Asistente**: pasa `titleIds`/`relatedIds`/`relatedW` explícitos (q interpretado por el LLM)
  + `appliedIds` (aplicadas del usuario). El asistente tiene **cargar-más** (paginación en el
  chat); el board, paginación numerada. Ambos ordenan idéntico.

## 6. Evals

`npm run eval:board` (`scripts/eval-board-assistant.mjs`): casos dorados contra el endpoint
real (interpretación, intake, recall por sinónimo, ranking, narración i18n, orden por
aplicadas). Requiere dev server en :3001 + claves en `.env.local`.

## 7. Pendiente conocido
- Cobertura de `job_title_id`/`job_skills` (~57%/37%): los títulos ruidosos de Turijobs no
  matchean; se mejora ampliando el subset de hostelería en ESCO o limpiando títulos.
- Los títulos de hostelería (seed ESCO targeted) **no tienen `job_title_relations`** → el tier
  "relacionado" del ranking está vacío ahí (el tier exacto es el que da el valor).
- Fit aún no usa `skill_relations` (crédito parcial a skills relacionadas).
- Perfil IA usa un `JOB_TITLES` hardcodeado, no la taxonomía de BBDD.
