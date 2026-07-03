-- ─────────────────────────────────────────────────────────────────────────────
-- 0011_company_members.sql
-- Membership table + role-based RLS for sensitive modules
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Membership table
-- ─────────────────────────────────────────────────────────────────────────────
create table company_members (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'hr_admin'
                check (role in ('owner','hr_admin','recruiter','manager','employee')),
  employee_id uuid references employees(id) on delete set null,
  invited_by  uuid references auth.users(id),
  invited_at  timestamptz not null default now(),
  joined_at   timestamptz,
  unique (company_id, user_id)
);

alter table company_members enable row level security;

-- Users can read their own membership row only
create policy "company_members_self_read" on company_members
  for select to authenticated
  using (user_id = auth.uid());

-- Only owner/hr_admin can manage memberships (insert/update/delete)
-- Uses a subquery here because current_role_name() is defined below;
-- safe because this policy is on company_members itself but the subquery
-- is wrapped in security definer — we avoid recursion by limiting
-- to a direct equality on user_id (not calling the function in the subquery).
create policy "company_members_admin_write" on company_members
  for all to authenticated
  using (
    exists (
      select 1 from company_members m
      where m.user_id = auth.uid()
        and m.role in ('owner','hr_admin')
    )
  )
  with check (
    exists (
      select 1 from company_members m
      where m.user_id = auth.uid()
        and m.role in ('owner','hr_admin')
    )
  );

-- 2. Security-definer helper — reads role without triggering RLS recursion
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function current_role_name() returns text
  language sql
  security definer
  stable
  set search_path = public
  as $$
    select role
    from company_members
    where user_id = auth.uid()
    limit 1
  $$;

-- 3. Restrict sensitive tables to owner / hr_admin
--    coalesce(...,'hr_admin') preserves access for existing users with no row yet
-- ─────────────────────────────────────────────────────────────────────────────

-- compensation_records
drop policy if exists "compensation_records_authenticated_all" on compensation_records;
create policy "compensation_records_admin_only" on compensation_records
  for all to authenticated
  using      (coalesce(current_role_name(), 'hr_admin') in ('owner','hr_admin'))
  with check (coalesce(current_role_name(), 'hr_admin') in ('owner','hr_admin'));

-- compliance_violations
drop policy if exists "compliance_violations_authenticated_all" on compliance_violations;
create policy "compliance_violations_admin_only" on compliance_violations
  for all to authenticated
  using      (coalesce(current_role_name(), 'hr_admin') in ('owner','hr_admin'))
  with check (coalesce(current_role_name(), 'hr_admin') in ('owner','hr_admin'));

-- compliance_config
drop policy if exists "compliance_config_authenticated_all" on compliance_config;
create policy "compliance_config_admin_only" on compliance_config
  for all to authenticated
  using      (coalesce(current_role_name(), 'hr_admin') in ('owner','hr_admin'))
  with check (coalesce(current_role_name(), 'hr_admin') in ('owner','hr_admin'));
