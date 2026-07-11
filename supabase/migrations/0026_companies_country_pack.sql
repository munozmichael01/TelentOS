-- 0026_companies_country_pack.sql
-- Decisión de producto 2026-07-11: el pack de cálculo es una decisión de la
-- EMPRESA (entidad legal), no del empleado. La fuente de verdad de la selección
-- pasa a companies.country_pack; pay_profiles.country_pack queda como SNAPSHOT
-- de con qué pack se calculó/creó cada perfil (misma filosofía que los line
-- items del motor: los cambios posteriores no reescriben lo ya generado).
--
-- Hoy solo 'generic' está activo, así que el backfill es trivial: todo generic.
-- Cuando un pack pase a active, la UI de Ajustes → Payroll escribirá aquí y
-- los perfiles nuevos heredarán este valor en su snapshot.

alter table companies
  add column if not exists country_pack country_pack_code not null default 'generic';

comment on column companies.country_pack is
  'Pack de cálculo seleccionado por la empresa (fuente de verdad). Solo generic es operativo; ve/br/es en preview, co/mx coming_soon.';

comment on column pay_profiles.country_pack is
  'Snapshot: pack con el que se creó/calculó este perfil. La selección vigente vive en companies.country_pack.';

-- Backfill defensivo: perfiles que hayan quedado con el default histórico 've'
-- (0016 lo tenía como default antes de 0021) sin que la empresa haya elegido nada.
update pay_profiles set country_pack = 'generic'
  where country_pack = 've'
  and not exists (
    select 1 from companies c
    where c.id = pay_profiles.company_id and c.country_pack <> 'generic'
  );
