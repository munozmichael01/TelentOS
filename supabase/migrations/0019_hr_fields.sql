-- ─────────────────────────────────────────────────────────────────────────────
-- 0019_hr_fields.sql
-- ATS→Nómina trazabilidad: captura de términos de oferta en candidaturas y
-- campos de identidad/datos personales en empleados y empresas.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Oferta aceptada en candidaturas ──────────────────────────────────────────
-- Captura los términos económicos acordados en la etapa "Oferta" para que
-- hire/route.ts pueda auto-crear el pay_profile sin reintroducir datos.

alter table applications
  add column if not exists offer_salary     numeric(14,2),
  add column if not exists offer_currency   char(3),
  add column if not exists offer_frequency  payment_frequency,
  add column if not exists offer_start_date date;

-- ── Datos personales del empleado ─────────────────────────────────────────────
-- national_id: cédula (V-XXXXXXXX) requerida para recibo de pago VE / IVSS.
-- birth_date / address: opcionales; se capturan en tareas de onboarding.

alter table employees
  add column if not exists national_id  text,
  add column if not exists birth_date   date,
  add column if not exists address      text;

-- ── RIF de empresa (Venezuela) ───────────────────────────────────────────────

alter table companies
  add column if not exists rif text;
