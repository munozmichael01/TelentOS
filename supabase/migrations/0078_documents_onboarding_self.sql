-- Documentos y tareas de onboarding: de "toda la empresa" a permisos por rol.
--
-- Mismo patrón que ausencias y jornada, y aquí es lo más sensible de las tres: `employee_documents`
-- guarda contratos, nóminas firmadas y documentos de identidad, y hoy cualquier miembro de la
-- empresa —incluido cualquier empleado— puede leerlos, sustituirlos o borrarlos por API.
--
-- El empleado puede subir los suyos (justificantes, títulos) pero NO borrarlos: su contrato
-- firmado no es suyo para hacerlo desaparecer. Eso lo hace RR.HH.
create policy employee_documents_sel on employee_documents for select to authenticated
  using (
    employee_id in (select my_employee_ids())
    or employee_id in (select my_team_employee_ids())
    or (current_role_name() = any (array['owner','hr_admin'])
        and employee_id in (select e.id from employees e where e.company_id in (select auth_company_ids())))
  );
create policy employee_documents_ins on employee_documents for insert to authenticated
  with check (
    employee_id in (select my_employee_ids())
    or (current_role_name() = any (array['owner','hr_admin'])
        and employee_id in (select e.id from employees e where e.company_id in (select auth_company_ids())))
  );
create policy employee_documents_hr on employee_documents for update to authenticated
  using (current_role_name() = any (array['owner','hr_admin'])
         and employee_id in (select e.id from employees e where e.company_id in (select auth_company_ids())))
  with check (current_role_name() = any (array['owner','hr_admin'])
         and employee_id in (select e.id from employees e where e.company_id in (select auth_company_ids())));
create policy employee_documents_del on employee_documents for delete to authenticated
  using (current_role_name() = any (array['owner','hr_admin'])
         and employee_id in (select e.id from employees e where e.company_id in (select auth_company_ids())));
drop policy if exists employee_documents_tenant on employee_documents;

-- Onboarding: el empleado ve y marca las suyas; crear, editar el enunciado y borrar es de RR.HH.
-- El WITH CHECK ancla la fila a él, así que no puede reasignarse la tarea de otro.
create policy onboarding_tasks_sel on onboarding_tasks for select to authenticated
  using (
    employee_id in (select my_employee_ids())
    or employee_id in (select my_team_employee_ids())
    or (current_role_name() = any (array['owner','hr_admin'])
        and employee_id in (select e.id from employees e where e.company_id in (select auth_company_ids())))
  );
create policy onboarding_tasks_upd on onboarding_tasks for update to authenticated
  using (
    employee_id in (select my_employee_ids())
    or (current_role_name() = any (array['owner','hr_admin'])
        and employee_id in (select e.id from employees e where e.company_id in (select auth_company_ids())))
  )
  with check (
    employee_id in (select my_employee_ids())
    or (current_role_name() = any (array['owner','hr_admin'])
        and employee_id in (select e.id from employees e where e.company_id in (select auth_company_ids())))
  );
create policy onboarding_tasks_hr on onboarding_tasks for insert to authenticated
  with check (current_role_name() = any (array['owner','hr_admin'])
         and employee_id in (select e.id from employees e where e.company_id in (select auth_company_ids())));
create policy onboarding_tasks_del on onboarding_tasks for delete to authenticated
  using (current_role_name() = any (array['owner','hr_admin'])
         and employee_id in (select e.id from employees e where e.company_id in (select auth_company_ids())));
drop policy if exists onboarding_tasks_tenant on onboarding_tasks;
