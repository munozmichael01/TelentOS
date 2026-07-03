-- ─────────────────────────────────────────────────────────────────────────────
-- 0012_rbac_phase2.sql
-- Manager org-scoping: recursive team lookup + scoped RLS
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Helpers
-- ─────────────────────────────────────────────────────────────────────────────

-- Returns the employee_id of the current authenticated user (via company_members)
create or replace function my_employee_id() returns uuid
  language sql security definer stable
  set search_path = public
  as $$
    select employee_id
    from company_members
    where user_id = auth.uid()
    limit 1
  $$;

-- Returns all employee IDs that report (directly or indirectly) to the current user.
-- Uses employees.manager_id recursively to walk the org tree.
-- Returns empty set if the user has no employee_id in company_members.
create or replace function org_reports(p_user_id uuid)
  returns table (id uuid)
  language sql security definer stable
  set search_path = public
  as $$
    with recursive subtree as (
      -- anchor: direct reports (employees whose manager_id = this user's employee)
      select e.id
      from employees e
      inner join company_members cm on e.manager_id = cm.employee_id
      where cm.user_id = p_user_id
        and cm.employee_id is not null

      union all

      -- recursive: reports of reports
      select e.id
      from employees e
      inner join subtree s on e.manager_id = s.id
    )
    select id from subtree
  $$;

-- 2. employees — scoped by role
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "employees_authenticated_all" on employees;

-- owner / hr_admin: read + write all
create policy "employees_admin_rw" on employees
  for all to authenticated
  using      (coalesce(current_role_name(), 'hr_admin') in ('owner', 'hr_admin'))
  with check (coalesce(current_role_name(), 'hr_admin') in ('owner', 'hr_admin'));

-- recruiter: read all (directorio básico)
create policy "employees_recruiter_read" on employees
  for select to authenticated
  using (coalesce(current_role_name(), 'hr_admin') = 'recruiter');

-- manager: read own record + direct/indirect reports
create policy "employees_manager_read" on employees
  for select to authenticated
  using (
    coalesce(current_role_name(), 'hr_admin') = 'manager'
    and (
      id = my_employee_id()
      or id in (select id from org_reports(auth.uid()))
    )
  );

-- 3. absence_requests — scoped by role
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "absence_requests_authenticated_all" on absence_requests;

-- owner / hr_admin: full access
create policy "absence_requests_admin_rw" on absence_requests
  for all to authenticated
  using      (coalesce(current_role_name(), 'hr_admin') in ('owner', 'hr_admin'))
  with check (coalesce(current_role_name(), 'hr_admin') in ('owner', 'hr_admin'));

-- manager: read own + team; update (approve/reject) team only
create policy "absence_requests_manager_read" on absence_requests
  for select to authenticated
  using (
    coalesce(current_role_name(), 'hr_admin') = 'manager'
    and (
      employee_id = my_employee_id()
      or employee_id in (select id from org_reports(auth.uid()))
    )
  );

create policy "absence_requests_manager_approve" on absence_requests
  for update to authenticated
  using (
    coalesce(current_role_name(), 'hr_admin') = 'manager'
    and employee_id in (select id from org_reports(auth.uid()))
  )
  with check (
    coalesce(current_role_name(), 'hr_admin') = 'manager'
    and employee_id in (select id from org_reports(auth.uid()))
  );

-- 4. time_entries — scoped by role
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "time_entries_authenticated_all" on time_entries;

-- owner / hr_admin: full access
create policy "time_entries_admin_rw" on time_entries
  for all to authenticated
  using      (coalesce(current_role_name(), 'hr_admin') in ('owner', 'hr_admin'))
  with check (coalesce(current_role_name(), 'hr_admin') in ('owner', 'hr_admin'));

-- manager: read own + team
create policy "time_entries_manager_read" on time_entries
  for select to authenticated
  using (
    coalesce(current_role_name(), 'hr_admin') = 'manager'
    and (
      employee_id = my_employee_id()
      or employee_id in (select id from org_reports(auth.uid()))
    )
  );

-- 5. onboarding_tasks — scoped by role
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "onboarding_tasks_authenticated_all" on onboarding_tasks;

-- owner / hr_admin: full access
create policy "onboarding_tasks_admin_rw" on onboarding_tasks
  for all to authenticated
  using      (coalesce(current_role_name(), 'hr_admin') in ('owner', 'hr_admin'))
  with check (coalesce(current_role_name(), 'hr_admin') in ('owner', 'hr_admin'));

-- manager: read team's onboarding tasks
create policy "onboarding_tasks_manager_read" on onboarding_tasks
  for select to authenticated
  using (
    coalesce(current_role_name(), 'hr_admin') = 'manager'
    and employee_id in (select id from org_reports(auth.uid()))
  );
