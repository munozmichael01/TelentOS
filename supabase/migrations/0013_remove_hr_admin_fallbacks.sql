-- ─────────────────────────────────────────────────────────────────────────────
-- 0013_remove_hr_admin_fallbacks.sql
-- Security hardening: eliminar todos los fallbacks permisivos a 'hr_admin'
-- y añadir aislamiento por company_id en cada política RLS.
-- Un usuario sin fila en company_members no debe tener acceso a ningún dato.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Tablas de 0011 ───────────────────────────────────────────────────────────

-- compensation_records
drop policy if exists "compensation_records_admin_only" on compensation_records;
create policy "compensation_records_admin_only" on compensation_records
  for all to authenticated
  using (
    exists (
      select 1 from company_members cm
      where cm.user_id = auth.uid()
        and cm.company_id = compensation_records.company_id
        and cm.role in ('owner', 'hr_admin')
    )
  )
  with check (
    exists (
      select 1 from company_members cm
      where cm.user_id = auth.uid()
        and cm.company_id = compensation_records.company_id
        and cm.role in ('owner', 'hr_admin')
    )
  );

-- compliance_violations
drop policy if exists "compliance_violations_admin_only" on compliance_violations;
create policy "compliance_violations_admin_only" on compliance_violations
  for all to authenticated
  using (
    exists (
      select 1 from company_members cm
      where cm.user_id = auth.uid()
        and cm.company_id = compliance_violations.company_id
        and cm.role in ('owner', 'hr_admin')
    )
  )
  with check (
    exists (
      select 1 from company_members cm
      where cm.user_id = auth.uid()
        and cm.company_id = compliance_violations.company_id
        and cm.role in ('owner', 'hr_admin')
    )
  );

-- compliance_config
drop policy if exists "compliance_config_admin_only" on compliance_config;
create policy "compliance_config_admin_only" on compliance_config
  for all to authenticated
  using (
    exists (
      select 1 from company_members cm
      where cm.user_id = auth.uid()
        and cm.company_id = compliance_config.company_id
        and cm.role in ('owner', 'hr_admin')
    )
  )
  with check (
    exists (
      select 1 from company_members cm
      where cm.user_id = auth.uid()
        and cm.company_id = compliance_config.company_id
        and cm.role in ('owner', 'hr_admin')
    )
  );

-- ── Tablas de 0012 ───────────────────────────────────────────────────────────

-- employees: admin rw + recruiter read + manager read
drop policy if exists "employees_admin_rw" on employees;
drop policy if exists "employees_recruiter_read" on employees;
drop policy if exists "employees_manager_read" on employees;

create policy "employees_admin_rw" on employees
  for all to authenticated
  using (
    exists (
      select 1 from company_members cm
      where cm.user_id = auth.uid()
        and cm.company_id = employees.company_id
        and cm.role in ('owner', 'hr_admin')
    )
  )
  with check (
    exists (
      select 1 from company_members cm
      where cm.user_id = auth.uid()
        and cm.company_id = employees.company_id
        and cm.role in ('owner', 'hr_admin')
    )
  );

create policy "employees_recruiter_read" on employees
  for select to authenticated
  using (
    exists (
      select 1 from company_members cm
      where cm.user_id = auth.uid()
        and cm.company_id = employees.company_id
        and cm.role = 'recruiter'
    )
  );

create policy "employees_manager_read" on employees
  for select to authenticated
  using (
    exists (
      select 1 from company_members cm
      where cm.user_id = auth.uid()
        and cm.company_id = employees.company_id
        and cm.role = 'manager'
    )
    and (
      employees.id = my_employee_id()
      or employees.id in (select id from org_reports(auth.uid()))
    )
  );

-- absence_requests: admin rw + manager read/approve
drop policy if exists "absence_requests_admin_rw" on absence_requests;
drop policy if exists "absence_requests_manager_read" on absence_requests;
drop policy if exists "absence_requests_manager_approve" on absence_requests;

create policy "absence_requests_admin_rw" on absence_requests
  for all to authenticated
  using (
    exists (
      select 1 from company_members cm
      where cm.user_id = auth.uid()
        and cm.company_id = absence_requests.company_id
        and cm.role in ('owner', 'hr_admin')
    )
  )
  with check (
    exists (
      select 1 from company_members cm
      where cm.user_id = auth.uid()
        and cm.company_id = absence_requests.company_id
        and cm.role in ('owner', 'hr_admin')
    )
  );

create policy "absence_requests_manager_read" on absence_requests
  for select to authenticated
  using (
    exists (
      select 1 from company_members cm
      where cm.user_id = auth.uid()
        and cm.company_id = absence_requests.company_id
        and cm.role = 'manager'
    )
    and (
      absence_requests.employee_id = my_employee_id()
      or absence_requests.employee_id in (select id from org_reports(auth.uid()))
    )
  );

create policy "absence_requests_manager_approve" on absence_requests
  for update to authenticated
  using (
    exists (
      select 1 from company_members cm
      where cm.user_id = auth.uid()
        and cm.company_id = absence_requests.company_id
        and cm.role = 'manager'
    )
    and absence_requests.employee_id in (select id from org_reports(auth.uid()))
  )
  with check (
    exists (
      select 1 from company_members cm
      where cm.user_id = auth.uid()
        and cm.company_id = absence_requests.company_id
        and cm.role = 'manager'
    )
    and absence_requests.employee_id in (select id from org_reports(auth.uid()))
  );

-- time_entries: admin rw + manager read
drop policy if exists "time_entries_admin_rw" on time_entries;
drop policy if exists "time_entries_manager_read" on time_entries;

create policy "time_entries_admin_rw" on time_entries
  for all to authenticated
  using (
    exists (
      select 1 from company_members cm
      where cm.user_id = auth.uid()
        and cm.company_id = time_entries.company_id
        and cm.role in ('owner', 'hr_admin')
    )
  )
  with check (
    exists (
      select 1 from company_members cm
      where cm.user_id = auth.uid()
        and cm.company_id = time_entries.company_id
        and cm.role in ('owner', 'hr_admin')
    )
  );

create policy "time_entries_manager_read" on time_entries
  for select to authenticated
  using (
    exists (
      select 1 from company_members cm
      where cm.user_id = auth.uid()
        and cm.company_id = time_entries.company_id
        and cm.role = 'manager'
    )
    and (
      time_entries.employee_id = my_employee_id()
      or time_entries.employee_id in (select id from org_reports(auth.uid()))
    )
  );

-- onboarding_tasks: admin rw + manager read (sin company_id directo; join vía employees)
drop policy if exists "onboarding_tasks_admin_rw" on onboarding_tasks;
drop policy if exists "onboarding_tasks_manager_read" on onboarding_tasks;

create policy "onboarding_tasks_admin_rw" on onboarding_tasks
  for all to authenticated
  using (
    exists (
      select 1 from employees e
      inner join company_members cm on cm.company_id = e.company_id
      where e.id = onboarding_tasks.employee_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'hr_admin')
    )
  )
  with check (
    exists (
      select 1 from employees e
      inner join company_members cm on cm.company_id = e.company_id
      where e.id = onboarding_tasks.employee_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'hr_admin')
    )
  );

create policy "onboarding_tasks_manager_read" on onboarding_tasks
  for select to authenticated
  using (
    exists (
      select 1 from employees e
      inner join company_members cm on cm.company_id = e.company_id
      where e.id = onboarding_tasks.employee_id
        and cm.user_id = auth.uid()
        and cm.role = 'manager'
    )
    and onboarding_tasks.employee_id in (select id from org_reports(auth.uid()))
  );
