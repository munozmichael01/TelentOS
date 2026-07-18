-- 0040_jobs_closes_at.sql — fecha de cierre/expiración de la oferta. Alimenta
-- `validThrough` del JSON-LD JobPosting (recomendado por Google for Jobs) y `expiresAt`
-- de los feeds de sindicación. Nullable: sin fecha = oferta sin caducidad declarada.
alter table jobs add column if not exists closes_at timestamptz;
