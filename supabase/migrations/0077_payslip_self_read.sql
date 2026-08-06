-- El empleado puede leer SU recibo.
--
-- La migr. 0073 le abrió `pay_runs` y `pay_run_lines` (de ahí que el portal ya liste importes),
-- pero `payslips` y `pay_run_line_items` siguen siendo solo de RR.HH.: sin ellas no hay número de
-- recibo ni desglose de conceptos, que es justo lo que se descarga.
--
-- Se apoya en `my_visible_pay_run_ids()` (0073), que ya limita a las corridas CERRADAS: un
-- borrador o una nómina en cálculo no es un recibo, y enseñarla sería dar una cifra que aún puede
-- cambiar. Las políticas existentes de RR.HH. se dejan intactas; esto solo añade lectura propia.
create policy payslips_own_read on payslips for select to authenticated
  using (
    pay_run_line_id in (
      select prl.id from pay_run_lines prl
      where prl.employee_id in (select my_employee_ids())
        and prl.pay_run_id in (select my_visible_pay_run_ids())
    )
  );

create policy pay_run_line_items_own_read on pay_run_line_items for select to authenticated
  using (
    line_id in (
      select prl.id from pay_run_lines prl
      where prl.employee_id in (select my_employee_ids())
        and prl.pay_run_id in (select my_visible_pay_run_ids())
    )
  );
