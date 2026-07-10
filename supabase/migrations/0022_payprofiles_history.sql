-- ─────────────────────────────────────────────────────────────────────────────
-- 0022_payprofiles_history.sql
-- §8 Paso 2: historial salarial effective-dated
-- ─────────────────────────────────────────────────────────────────────────────

-- Quitar la restricción unique que impedía tener más de un perfil por empleado.
-- Nombre canónico de Supabase para la constraint definida en 0016.
alter table pay_profiles
  drop constraint if exists pay_profiles_company_id_employee_id_key;

-- Fecha de cierre del registro (null = vigente ahora).
alter table pay_profiles
  add column if not exists effective_to date;

-- Índice para encontrar el perfil activo en O(1).
create index if not exists pay_profiles_active
  on pay_profiles(employee_id, company_id)
  where effective_to is null;
