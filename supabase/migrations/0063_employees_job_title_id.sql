-- Puente del EMPLEADO a la taxonomía de cargos (job_titles). Mismo patrón, deliberadamente,
-- que jobs.job_title_id (migr. 0055): `role_title` sigue siendo el texto libre que se muestra
-- en la ficha, y `job_title_id` es el cargo CANÓNICO del que se derivan las competencias
-- esperadas del puesto (job_title_skills) para el módulo de Desempeño.
-- Es el prerequisito del bloque 1 del módulo: sin este FK no hay competencias por cargo.
-- Nullable: no toda ficha resuelve un cargo de la taxonomía (el backfill deja el resto a mano).
-- La RLS de employees ya scopea por company_id; añadir una columna no requiere política nueva.
alter table employees add column if not exists job_title_id uuid references job_titles(id) on delete set null;
create index if not exists employees_job_title_id_idx on employees (job_title_id);
