-- Corrige la RECURSIÓN INFINITA que introdujo 0072 (Postgres 42P17).
--
-- Las dos políticas se referenciaban entre sí: la de `pay_run_lines` consultaba `pay_runs`
-- para filtrar por estado, y la de `pay_runs` consultaba `pay_run_lines` para saber si la
-- nómina era mía. Dentro de una política las subconsultas se evalúan con la RLS del propio
-- usuario, así que el ciclo es infinito y **cualquier** SELECT sobre esas tablas revienta.
-- Es exactamente el bug de la migración 0050 (candidates↔applications), reintroducido.
--
-- Se rompe el ciclo con funciones SECURITY DEFINER, el mismo patrón que `auth_company_ids()`:
-- por dentro no aplican políticas, así que no hay recursión posible.

create or replace function my_employee_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from employees where user_id = auth.uid()
$$;

-- Nóminas CERRADAS en las que esta persona tiene una línea. El corte por estado vive aquí,
-- no en la página: un borrador no puede filtrarse ni por consulta directa.
create or replace function my_visible_pay_run_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select distinct l.pay_run_id
  from pay_run_lines l
  join employees e on e.id = l.employee_id
  join pay_runs r on r.id = l.pay_run_id
  where e.user_id = auth.uid()
    and r.status in ('approved', 'exported', 'paid')
$$;

grant execute on function my_employee_ids() to authenticated;
grant execute on function my_visible_pay_run_ids() to authenticated;

drop policy if exists pay_run_lines_own_read on pay_run_lines;
create policy pay_run_lines_own_read on pay_run_lines for select to authenticated
  using (
    employee_id in (select my_employee_ids())
    and pay_run_id in (select my_visible_pay_run_ids())
  );

drop policy if exists pay_runs_own_read on pay_runs;
create policy pay_runs_own_read on pay_runs for select to authenticated
  using (id in (select my_visible_pay_run_ids()));
