-- El empleado puede leer SU PROPIO recibo de nómina.
--
-- `pay_runs` y `pay_run_lines` estaban restringidas a owner/hr_admin, lo cual es correcto para
-- la nómina de la empresa pero deja al empleado sin ver lo suyo: el portal mostraba "Aún no hay
-- recibos" aunque los tuviera. Se añaden políticas PERMISIVAS de solo lectura acotadas a uno
-- mismo; las existentes siguen intactas, así que RR.HH. no pierde nada.
--
-- Dos cierres importantes:
--   · Solo nóminas CERRADAS (approved/exported/paid). Un borrador o una nómina en revisión es
--     una cifra que aún puede cambiar, y no debe llegar al empleado ni por consulta directa.
--     El filtro va en la RLS, no solo en la página: así no depende de que la UI se acuerde.
--   · El vínculo es employees.user_id = auth.uid(), el mismo que usa el portal.
create policy pay_run_lines_own_read on pay_run_lines for select to authenticated
  using (
    employee_id in (select e.id from employees e where e.user_id = auth.uid())
    and pay_run_id in (select r.id from pay_runs r where r.status in ('approved', 'exported', 'paid'))
  );

create policy pay_runs_own_read on pay_runs for select to authenticated
  using (
    status in ('approved', 'exported', 'paid')
    and id in (
      select l.pay_run_id from pay_run_lines l
      join employees e on e.id = l.employee_id
      where e.user_id = auth.uid()
    )
  );
