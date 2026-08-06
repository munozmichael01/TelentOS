-- Ausencias y bolsas: de "toda la empresa, lectura y escritura" a permisos por rol.
--
-- `absence_requests` tenía una sola política `for all` con alcance de empresa y los empleados son
-- `company_members` con rol `employee`, así que hoy cualquiera puede, por API directa:
--   · leer las ausencias de todos sus compañeros,
--   · **cambiar el estado de su propia solicitud a `approved`** — aprobarse las vacaciones,
--   · borrar la solicitud de otro.
-- Abrir "solicitar ausencia" en el portal convierte esto en un agujero real, así que se cierra
-- antes de exponer el formulario.
--
-- Mismo criterio en las bolsas (`employee_allowances`, `allowance_policies`,
-- `allowance_adjustment_log`): quien pudiera escribirlas se regalaría saldo, y el saldo es lo que
-- valida la solicitud.

-- ── absence_requests ────────────────────────────────────────────────────────
drop policy if exists absence_requests_tenant on absence_requests;

-- Ver: la propia · la de mi equipo si soy su manager · toda la empresa si soy RR.HH.
create policy absence_requests_sel on absence_requests for select to authenticated
  using (
    employee_id in (select my_employee_ids())
    or employee_id in (select my_team_employee_ids())
    or (current_role_name() = any (array['owner','hr_admin'])
        and company_id in (select auth_company_ids()))
  );

-- Crear: RR.HH. por cualquiera de su empresa; el resto solo por sí mismo.
-- El estado inicial se limita: quien no es RR.HH. solo puede nacer en `pending`, o en `approved`
-- si el propio tipo de ausencia no exige aprobación (una baja médica, por ejemplo).
create policy absence_requests_ins on absence_requests for insert to authenticated
  with check (
    company_id in (select auth_company_ids())
    and (
      current_role_name() = any (array['owner','hr_admin'])
      or (
        employee_id in (select my_employee_ids())
        and (
          status = 'pending'
          or exists (
            select 1 from absence_types t
            where t.id = absence_type_id and t.requires_approval = false
          )
        )
      )
    )
  );

-- Modificar: RR.HH. y managers resuelven (aprobar/rechazar); el empleado solo puede llegar a
-- `cancelled` sobre lo suyo. El WITH CHECK mira la fila resultante, que es lo que impide la
-- autoaprobación.
create policy absence_requests_upd on absence_requests for update to authenticated
  using (
    (current_role_name() = any (array['owner','hr_admin'])
     and company_id in (select auth_company_ids()))
    or employee_id in (select my_team_employee_ids())
    or employee_id in (select my_employee_ids())
  )
  with check (
    (current_role_name() = any (array['owner','hr_admin'])
     and company_id in (select auth_company_ids()))
    or employee_id in (select my_team_employee_ids())
    or (employee_id in (select my_employee_ids()) and status in ('pending','cancelled'))
  );

-- Borrar: solo RR.HH. Lo del empleado se cancela, no se borra — el histórico es su expediente.
create policy absence_requests_del on absence_requests for delete to authenticated
  using (
    current_role_name() = any (array['owner','hr_admin'])
    and company_id in (select auth_company_ids())
  );

-- ── Bolsas: leer la propia, escribir solo RR.HH. ────────────────────────────
drop policy if exists employee_allowances_tenant on employee_allowances;
create policy employee_allowances_sel on employee_allowances for select to authenticated
  using (
    employee_id in (select my_employee_ids())
    or employee_id in (select my_team_employee_ids())
    or (current_role_name() = any (array['owner','hr_admin'])
        and employee_id in (select e.id from employees e where e.company_id in (select auth_company_ids())))
  );
create policy employee_allowances_write on employee_allowances for all to authenticated
  using (
    current_role_name() = any (array['owner','hr_admin'])
    and employee_id in (select e.id from employees e where e.company_id in (select auth_company_ids()))
  )
  with check (
    current_role_name() = any (array['owner','hr_admin'])
    and employee_id in (select e.id from employees e where e.company_id in (select auth_company_ids()))
  );

drop policy if exists allowance_adjustment_log_tenant on allowance_adjustment_log;
create policy allowance_adjustment_log_sel on allowance_adjustment_log for select to authenticated
  using (
    employee_allowance_id in (
      select ea.id from employee_allowances ea
      where ea.employee_id in (select my_employee_ids())
         or ea.employee_id in (select my_team_employee_ids())
    )
    or (current_role_name() = any (array['owner','hr_admin'])
        and employee_allowance_id in (
          select ea.id from employee_allowances ea
          join employees e on e.id = ea.employee_id
          where e.company_id in (select auth_company_ids())))
  );
create policy allowance_adjustment_log_write on allowance_adjustment_log for all to authenticated
  using (
    current_role_name() = any (array['owner','hr_admin'])
    and employee_allowance_id in (
      select ea.id from employee_allowances ea
      join employees e on e.id = ea.employee_id
      where e.company_id in (select auth_company_ids()))
  )
  with check (
    current_role_name() = any (array['owner','hr_admin'])
    and employee_allowance_id in (
      select ea.id from employee_allowances ea
      join employees e on e.id = ea.employee_id
      where e.company_id in (select auth_company_ids()))
  );

-- El catálogo (tipos de ausencia y políticas) lo lee todo el mundo de la empresa —el formulario
-- del portal lo necesita— pero solo RR.HH. lo toca.
drop policy if exists allowance_policies_tenant on allowance_policies;
create policy allowance_policies_sel on allowance_policies for select to authenticated
  using (company_id in (select auth_company_ids()));
create policy allowance_policies_write on allowance_policies for all to authenticated
  using (current_role_name() = any (array['owner','hr_admin']) and company_id in (select auth_company_ids()))
  with check (current_role_name() = any (array['owner','hr_admin']) and company_id in (select auth_company_ids()));

drop policy if exists absence_types_tenant on absence_types;
create policy absence_types_sel on absence_types for select to authenticated
  using (company_id in (select auth_company_ids()));
create policy absence_types_write on absence_types for all to authenticated
  using (current_role_name() = any (array['owner','hr_admin']) and company_id in (select auth_company_ids()))
  with check (current_role_name() = any (array['owner','hr_admin']) and company_id in (select auth_company_ids()));
