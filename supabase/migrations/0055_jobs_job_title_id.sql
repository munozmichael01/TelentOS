-- Vincula cada oferta a su TÍTULO canónico de la taxonomía (job_titles). Habilita el ranking
-- de relevancia compartido por board y asistente (exacto → relacionado por peso). El title de
-- la oferta sigue siendo texto libre (SEO/atractivo); job_title_id es el ancla estructurada.
-- Se setea por el matcher de títulos (backfill de importadas) y por el picker del formulario
-- en ofertas nativas. Nullable: no toda oferta matchea un título ESCO.
alter table jobs add column if not exists job_title_id uuid references job_titles(id) on delete set null;
create index if not exists jobs_job_title_id_idx on jobs (job_title_id);
