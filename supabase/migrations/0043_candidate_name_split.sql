-- 0043_candidate_name_split.sql
-- Nombre y apellido separados (decisión producto): en el alta MANUAL no hay CV/LLM que
-- separe, y un campo único deja ambiguo qué es el nombre de pila para personalizar
-- comunicaciones/segmentación. Añadimos first_name/last_name a candidates y
-- candidate_profiles; se conserva `name`/`full_name` como nombre completo compuesto.
-- Backfill: primer token = nombre, resto = apellido (heurística para datos existentes).

alter table candidates add column if not exists first_name text;
alter table candidates add column if not exists last_name  text;
alter table candidate_profiles add column if not exists first_name text;
alter table candidate_profiles add column if not exists last_name  text;

update candidates set
  first_name = split_part(name, ' ', 1),
  last_name  = case when position(' ' in name) > 0
                    then nullif(trim(substring(name from position(' ' in name) + 1)), '')
                    else null end
where name is not null and btrim(name) <> '' and first_name is null;

update candidate_profiles set
  first_name = split_part(full_name, ' ', 1),
  last_name  = case when position(' ' in full_name) > 0
                    then nullif(trim(substring(full_name from position(' ' in full_name) + 1)), '')
                    else null end
where full_name is not null and btrim(full_name) <> '' and first_name is null;
