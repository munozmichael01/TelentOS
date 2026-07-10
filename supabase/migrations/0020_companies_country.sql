-- ─────────────────────────────────────────────────────────────────────────────
-- 0020_companies_country.sql
-- §8 Paso 1: campo country en companies + valor 'generic' en el enum de packs
-- Nota: el ALTER DEFAULT de pay_profiles va en 0021 (restricción de PG: el
--       nuevo valor de enum no puede usarse en la misma transacción que ADD VALUE).
-- ─────────────────────────────────────────────────────────────────────────────

alter type country_pack_code add value if not exists 'generic';

alter table companies
  add column if not exists country text;
