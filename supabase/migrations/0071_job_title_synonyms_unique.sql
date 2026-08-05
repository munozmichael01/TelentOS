-- `job_title_synonyms` solo tenía PK en `id`, así que re-ejecutar un seeder de taxonomía
-- duplicaba sinónimos (rompe la regla 4: un concepto = una fila + sinónimos, sin duplicados).
-- Se limpian los duplicados existentes (había 1) y se blinda con un índice único
-- case/acento-insensible, que además permite upsert idempotente en los seeders.
-- Se compara por ctid (id es uuid, no ordenable de forma útil): se conserva una fila por
-- (título, locale, sinónimo normalizado) y se borran las repetidas.
delete from job_title_synonyms s
using job_title_synonyms s2
where s.ctid > s2.ctid
  and s.job_title_id = s2.job_title_id
  and s.locale = s2.locale
  and lower(s.synonym) = lower(s2.synonym);

create unique index if not exists job_title_synonyms_uniq
  on job_title_synonyms (job_title_id, locale, lower(synonym));
