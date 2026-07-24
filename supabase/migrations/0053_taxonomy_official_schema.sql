-- Adopta el esquema OFICIAL de taxonomía que ya existía en el repo (lo consume
-- scripts/seed-taxonomy.mjs) y que nunca se había migrado/seedeado. Reemplaza el esquema
-- paralelo e inferior de 0052 (job_title_aliases): añade esco_uri, synonyms/translations por
-- tabla, enlaces JT↔skill con peso (essential/optional) y relaciones skill↔skill.
--
-- 0052 dejó job_titles / job_title_relations (se reutilizan) y job_title_aliases (queda
-- huérfana; el asistente se repunta a job_title_synonyms y se retira aparte).

-- job_titles: vincular a ESCO + categoría ESCO.
alter table job_titles add column if not exists category text;   -- categoría ESCO (label)
alter table job_titles add column if not exists esco_uri text;   -- ID de ocupación ESCO
-- skills: vincular a ESCO.
alter table skills add column if not exists esco_uri text;

create table if not exists job_title_translations (
  job_title_id uuid not null references job_titles(id) on delete cascade,
  locale text not null,
  name text not null,
  primary key (job_title_id, locale)
);

create table if not exists job_title_synonyms (
  id uuid primary key default gen_random_uuid(),
  job_title_id uuid not null references job_titles(id) on delete cascade,
  locale text,
  synonym text not null
);
create index if not exists job_title_synonyms_title_idx on job_title_synonyms (job_title_id);

create table if not exists skill_translations (
  skill_id uuid not null references skills(id) on delete cascade,
  locale text not null,
  name text not null,
  primary key (skill_id, locale)
);

create table if not exists skill_synonyms (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid not null references skills(id) on delete cascade,
  locale text,
  synonym text not null
);
create index if not exists skill_synonyms_skill_idx on skill_synonyms (skill_id);

-- Enlace JT↔skill con peso (essential 0.85-0.95 / optional 0.45-0.65) e is_core.
create table if not exists job_title_skills (
  job_title_id uuid not null references job_titles(id) on delete cascade,
  skill_id uuid not null references skills(id) on delete cascade,
  weight real not null default 0.5,
  is_core boolean not null default false,
  primary key (job_title_id, skill_id)
);

-- Grafo skill↔skill con peso.
create table if not exists skill_relations (
  a_id uuid not null references skills(id) on delete cascade,
  b_id uuid not null references skills(id) on delete cascade,
  weight real not null default 0.5,
  primary key (a_id, b_id)
);

-- Reference data pública: lectura anon/authenticated; escritura solo service_role (seed).
alter table job_title_translations enable row level security;
alter table job_title_synonyms enable row level security;
alter table skill_translations enable row level security;
alter table skill_synonyms enable row level security;
alter table job_title_skills enable row level security;
alter table skill_relations enable row level security;
create policy jtt_read on job_title_translations for select to anon, authenticated using (true);
create policy jts_read on job_title_synonyms for select to anon, authenticated using (true);
create policy skt_read on skill_translations for select to anon, authenticated using (true);
create policy sks_read on skill_synonyms for select to anon, authenticated using (true);
create policy jtsk_read on job_title_skills for select to anon, authenticated using (true);
create policy skr_read on skill_relations for select to anon, authenticated using (true);
