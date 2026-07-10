-- Fix infinite recursion in company_members_admin_write policy.
-- The original "for all" caused the using-clause subquery (which SELECTs
-- from company_members) to re-trigger the same policy → infinite recursion.
-- Replace with separate write policies (insert/update/delete) so SELECT
-- only hits company_members_self_read (which has no recursive subquery).

drop policy if exists "company_members_admin_write" on company_members;

create policy "company_members_admin_insert" on company_members
  for insert to authenticated
  with check (
    exists (
      select 1 from company_members m
      where m.user_id = auth.uid()
        and m.role in ('owner', 'hr_admin')
    )
  );

create policy "company_members_admin_update" on company_members
  for update to authenticated
  using (
    exists (
      select 1 from company_members m
      where m.user_id = auth.uid()
        and m.role in ('owner', 'hr_admin')
    )
  );

create policy "company_members_admin_delete" on company_members
  for delete to authenticated
  using (
    exists (
      select 1 from company_members m
      where m.user_id = auth.uid()
        and m.role in ('owner', 'hr_admin')
    )
  );
