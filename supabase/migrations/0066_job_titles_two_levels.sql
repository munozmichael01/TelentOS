-- MODELO DE DOS NIVELES de la taxonomía de cargos.
--
-- Hasta ahora `job_titles` era, de hecho, la lista de ocupaciones de ESCO: el `canonical_name`
-- es la etiqueta de ESCO (en inglés) y todo lo que el mercado usa de verdad —"sushiman",
-- "Frontend Engineer", "Head of People"— se metía como SINÓNIMO. Eso es incorrecto y además
-- rompe la relevancia: un sinónimo le dice al motor de ranking que los dos términos son LO
-- MISMO, así que buscar "sushiman" puntúa igual a cualquier cocinero.
--
-- A partir de aquí la tabla tiene dos niveles:
--   · level='esco'   → ANCLA estándar. Trae `esco_uri`, sus skills y la etiqueta oficial.
--   · level='market' → cargo REAL de mercado (el que la gente busca y las empresas publican),
--                      que hace roll-up a su ancla vía `parent_title_id`.
--
-- Regla anti-redundancia (esto es lo que evita duplicar cargos):
--   · Misma ocupación dicha de otra forma (mesero/camarero/waiter, CEO/chief executive
--     officer) → SINÓNIMO, no crea fila.
--   · El mercado lo trata como puesto distinto —otras expectativas, otras skills y demanda de
--     búsqueda propia— aunque ESCO lo agrupe en un genérico → cargo de nivel 'market' con
--     parent_title_id al ancla.
--   Test: ¿lo buscaría un candidato con ese término Y pondría el recruiter requisitos
--   distintos? Los dos sí → cargo propio. Solo el primero → sinónimo.
--
-- Las skills del cargo de mercado se HEREDAN del ancla y se pueden ampliar con las propias
-- (sushiman añade "preparación de sushi"); no se duplican las del padre en cada hijo.
--
-- Una tabla y no dos: jobs.job_title_id, employees.job_title_id, job_title_skills,
-- job_title_relations, board_rank_jobs, los hubs y el sitemap ya apuntan aquí. Partirlo en dos
-- tablas obligaría a reescribir todo eso sin ganar nada que no dé `parent_title_id`, y forzaría
-- a duplicar los cargos en los que el término de ESCO YA es el de mercado (recepcionista).

alter table job_titles add column if not exists level text not null default 'esco';
alter table job_titles add column if not exists parent_title_id uuid references job_titles(id) on delete set null;

alter table job_titles drop constraint if exists job_titles_level_chk;
alter table job_titles add constraint job_titles_level_chk check (level in ('esco', 'market'));

-- Un ancla no cuelga de nadie; un cargo de mercado no puede colgar de sí mismo.
alter table job_titles drop constraint if exists job_titles_parent_only_market_chk;
alter table job_titles add constraint job_titles_parent_only_market_chk
  check (level = 'market' or parent_title_id is null);

alter table job_titles drop constraint if exists job_titles_parent_not_self_chk;
alter table job_titles add constraint job_titles_parent_not_self_chk
  check (parent_title_id is null or parent_title_id <> id);

create index if not exists job_titles_parent_title_id_idx on job_titles (parent_title_id);
create index if not exists job_titles_level_idx on job_titles (level);

-- Unicidad NORMALIZADA del nombre. El unique existente es exacto, así que "Sushiman" y
-- "sushiman" podrían convivir como dos cargos: justo la redundancia que hay que evitar.
create unique index if not exists job_titles_canonical_norm_uniq on job_titles (lower(canonical_name));

-- Las relaciones no tenían clave: se podían duplicar pares. Se normaliza el par (a<b) y se
-- blinda con PK. La tabla es NO dirigida: los consumidores buscan en ambas columnas.
delete from job_title_relations where a_id = b_id;
update job_title_relations set a_id = b_id, b_id = a_id where a_id::text > b_id::text;
delete from job_title_relations r using job_title_relations r2
  where r.ctid > r2.ctid and r.a_id = r2.a_id and r.b_id = r2.b_id;
alter table job_title_relations drop constraint if exists job_title_relations_pkey;
alter table job_title_relations add primary key (a_id, b_id);

comment on column job_titles.level is
  'esco = ancla estándar (trae esco_uri y skills base) · market = cargo real de mercado que hace roll-up al ancla vía parent_title_id.';
comment on column job_titles.parent_title_id is
  'Ancla ESCO a la que este cargo de mercado hace roll-up. Hereda sus skills. Solo en level=market.';
