-- La jornada deja de ser legible por toda la empresa.
--
-- `time_entries` y `timer_state` tenían una única política `for all` con alcance de EMPRESA:
-- cualquier empleado podía leer —por API directa— las horas de sus compañeros. El portal lo
-- convierte en exposición real, así que se separa lectura de escritura:
--   · escritura: igual que antes (alcance de empresa) → no se rompe ningún flujo del admin.
--   · lectura: la propia, la del equipo si eres su manager, o la de la empresa si eres RR.HH.
--
-- `my_team_employee_ids()` es SECURITY DEFINER como el resto (`auth_company_ids`,
-- `my_employee_ids`): si consultara `employees` desde dentro de la política, la RLS de
-- `employees` se evaluaría otra vez y volveríamos a la recursión de la migr. 0073.
create or replace function my_team_employee_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select e.id from employees e
  where e.manager_id in (select id from employees where user_id = auth.uid())
$$;
grant execute on function my_team_employee_ids() to authenticated;

drop policy if exists time_entries_tenant on time_entries;
create policy time_entries_ins on time_entries for insert to authenticated
  with check (company_id in (select auth_company_ids()));
create policy time_entries_upd on time_entries for update to authenticated
  using (company_id in (select auth_company_ids())) with check (company_id in (select auth_company_ids()));
create policy time_entries_del on time_entries for delete to authenticated
  using (company_id in (select auth_company_ids()));
create policy time_entries_sel on time_entries for select to authenticated
  using (
    employee_id in (select my_employee_ids())
    or employee_id in (select my_team_employee_ids())
    or (current_role_name() = any (array['owner','hr_admin'])
        and company_id in (select auth_company_ids()))
  );

drop policy if exists timer_state_tenant on timer_state;
create policy timer_state_ins on timer_state for insert to authenticated
  with check (employee_id in (select e.id from employees e where e.company_id in (select auth_company_ids())));
create policy timer_state_upd on timer_state for update to authenticated
  using (employee_id in (select e.id from employees e where e.company_id in (select auth_company_ids())));
create policy timer_state_del on timer_state for delete to authenticated
  using (employee_id in (select e.id from employees e where e.company_id in (select auth_company_ids())));
create policy timer_state_sel on timer_state for select to authenticated
  using (
    employee_id in (select my_employee_ids())
    or employee_id in (select my_team_employee_ids())
    or (current_role_name() = any (array['owner','hr_admin'])
        and employee_id in (select e.id from employees e where e.company_id in (select auth_company_ids())))
  );
