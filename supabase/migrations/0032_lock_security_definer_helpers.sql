-- 0032_lock_security_definer_helpers.sql — endurece los helpers SECURITY DEFINER.
--
-- Los helpers heredaban EXECUTE vía el grant implícito a PUBLIC, así que `anon` podía
-- invocarlos por /rest/v1/rpc/*. Se revoca de PUBLIC y se concede solo a `authenticated`
-- (la RLS los usa bajo el rol authenticated; el career site anónimo no los necesita).

revoke execute on function auth_company_ids() from public;
grant execute on function auth_company_ids() to authenticated;
revoke execute on function current_role_name() from public;
grant execute on function current_role_name() to authenticated;
revoke execute on function my_employee_id() from public;
grant execute on function my_employee_id() to authenticated;
revoke execute on function org_reports(uuid) from public;
grant execute on function org_reports(uuid) to authenticated;

-- search_path mutable en el trigger de payroll (aviso del linter).
alter function touch_payroll_updated_at() set search_path = public;
