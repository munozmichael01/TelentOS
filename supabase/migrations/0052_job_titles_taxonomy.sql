-- Taxonomía de JOB TITLES en la BBDD (antes vivía solo como data/taxonomy/taxonomy.json,
-- un archivo estático de 3 MB). Se promueve a un modelo relacional porque tiene que:
--  · crecer por sector (un agente puebla hostelería, etc.),
--  · consultarse por término en cualquier idioma/sinónimo (lookup indexado),
--  · relacionarse con categorías (title → área) y servir de ancla al asistente.
-- El JSON queda solo como FUENTE de seed (export ESCO), no como store en runtime.

create table if not exists job_titles (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null unique,          -- forma canónica (en), del export ESCO
  category_key text,                            -- clave de categoría canónica (soft ref a categories.json)
  sector text,                                  -- etiqueta de sector (people_hr, hospitality_food, …)
  source text not null default 'esco',          -- esco | agent | manual
  created_at timestamptz not null default now()
);

-- Formas buscables: traducciones (es/en/pt) y sinónimos. `norm` = label normalizado
-- (minúsculas, sin acentos) para el lookup del asistente.
create table if not exists job_title_aliases (
  id uuid primary key default gen_random_uuid(),
  title_id uuid not null references job_titles(id) on delete cascade,
  locale text,                                  -- es | en | pt | null
  label text not null,
  kind text not null default 'synonym',         -- translation | synonym | canonical
  norm text not null
);
create index if not exists job_title_aliases_norm_idx on job_title_aliases (norm);
create index if not exists job_title_aliases_title_idx on job_title_aliases (title_id);

-- Grafo de roles relacionados (ESCO jobTitleRelations): a ~ b con un peso.
create table if not exists job_title_relations (
  a_id uuid not null references job_titles(id) on delete cascade,
  b_id uuid not null references job_titles(id) on delete cascade,
  weight real not null default 0.5,
  primary key (a_id, b_id)
);

-- Datos de referencia PÚBLICOS (el board es público): lectura para anon+authenticated;
-- la escritura es solo service_role (seed / agente de poblado). No es data de tenant.
alter table job_titles enable row level security;
alter table job_title_aliases enable row level security;
alter table job_title_relations enable row level security;

create policy job_titles_read on job_titles for select to anon, authenticated using (true);
create policy job_title_aliases_read on job_title_aliases for select to anon, authenticated using (true);
create policy job_title_relations_read on job_title_relations for select to anon, authenticated using (true);
