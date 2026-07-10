-- ─────────────────────────────────────────────────────────────────────────────
-- 0021_payprofiles_generic_default.sql
-- §8 Paso 1 (cont.): default de country_pack pasa a 'generic'
-- Separado de 0020 porque PG no permite usar un nuevo valor de enum en la
-- misma transacción en que se añadió con ADD VALUE.
-- ─────────────────────────────────────────────────────────────────────────────

alter table pay_profiles
  alter column country_pack set default 'generic';
