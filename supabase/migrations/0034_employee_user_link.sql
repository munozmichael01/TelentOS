-- 0034_employee_user_link.sql — enlace opcional user ↔ employee (brief §3.7).
-- Un `user` (acceso: login + rol) puede además ser plantilla (employee). Este es
-- el único puente entre ambos; el onboarding NUNCA crea empleado. Nullable: la
-- mayoría de empleados no son users, y la mayoría de users no son empleados.

alter table employees
  add column if not exists user_id uuid references auth.users(id) on delete set null;

-- Un user se vincula a lo sumo a una ficha por empresa.
create unique index if not exists employees_company_user_uq
  on employees(company_id, user_id) where user_id is not null;
