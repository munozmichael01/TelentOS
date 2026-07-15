-- 0031_multitenant_rls.sql — Convierte la RLS de single-tenant a MULTI-TENANT.
--
-- Contexto: la app se construyó single-tenant. En prod: `distribution_plans` sin RLS,
-- ~27 tablas con `authenticated_all → using(true)`, y las tablas por-rol (employees,
-- pay_*, compliance…) sin scope de empresa. Resultado: un usuario de una empresa veía
-- datos de otra (fuga cross-tenant, confirmada por el linter de Supabase).
--
-- Diseño (dos niveles):
--   1) TODA tabla con datos de empresa se scopea por la empresa del usuario, vía su
--      ruta FK a companies (directo `company_id`, o `job_id→jobs`, `employee_id→employees`,
--      `pay_run_id→pay_runs`, etc.). Helper: auth_company_ids().
--   2) Las tablas SENSIBLES (nómina, compensación, compliance) exigen ADEMÁS rol
--      owner/hr_admin (defensa en profundidad; el API ya lo gatea, esto lo respalda).
--   Referencia global sin company_id (channels, evaluation_templates, skills) → lectura
--   para autenticados. Se preservan los accesos públicos (anon) del career site.

-- ── Helper: empresas del usuario ────────────────────────────────────────────
create or replace function auth_company_ids() returns setof uuid
  language sql stable security definer set search_path = public as $$
  select company_id from company_members where user_id = auth.uid()
$$;
revoke execute on function auth_company_ids() from anon;
-- Endurecimiento que pide el linter en los helpers existentes:
alter function current_role_name() set search_path = public;
revoke execute on function current_role_name() from anon;
alter function my_employee_id() set search_path = public;
revoke execute on function my_employee_id() from anon;

-- ── Drop de TODAS las políticas de las tablas objetivo (limpio, por nombre dinámico) ──
do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public' and tablename = any (array[
      'jobs','job_stages','campaigns','distribution_plans','job_skills',
      'candidates','candidate_education','candidate_experiences','candidate_languages','candidate_skills',
      'applications','application_events','interviews','interview_feedback','notes',
      'channels','evaluation_templates','skills','companies','career_site_pages','career_site_events',
      'employees','employee_documents','employee_allowances','employee_schedules','onboarding_tasks',
      'timer_state','time_entries','allowance_adjustment_log',
      'absence_types','absence_requests','allowance_types','allowance_policies','company_holidays',
      'work_schedule_templates','work_schedule_weeks','work_schedule_days',
      'agent_runs','agent_insights',
      'pay_runs','pay_profiles','pay_components','pay_run_lines','pay_run_line_items','payslips',
      'payroll_exports','pay_run_audit_log','compensation_records','compliance_config','compliance_violations'
    ])
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

alter table distribution_plans enable row level security;

-- ── Categoría A · company_id directo (miembro de la empresa: RW) ─────────────
create policy jobs_tenant on jobs for all to authenticated
  using (company_id in (select auth_company_ids())) with check (company_id in (select auth_company_ids()));
create policy absence_types_tenant on absence_types for all to authenticated
  using (company_id in (select auth_company_ids())) with check (company_id in (select auth_company_ids()));
create policy allowance_types_tenant on allowance_types for all to authenticated
  using (company_id in (select auth_company_ids())) with check (company_id in (select auth_company_ids()));
create policy allowance_policies_tenant on allowance_policies for all to authenticated
  using (company_id in (select auth_company_ids())) with check (company_id in (select auth_company_ids()));
create policy company_holidays_tenant on company_holidays for all to authenticated
  using (company_id in (select auth_company_ids())) with check (company_id in (select auth_company_ids()));
create policy work_schedule_templates_tenant on work_schedule_templates for all to authenticated
  using (company_id in (select auth_company_ids())) with check (company_id in (select auth_company_ids()));
create policy career_site_pages_tenant on career_site_pages for all to authenticated
  using (company_id in (select auth_company_ids())) with check (company_id in (select auth_company_ids()));
create policy agent_runs_tenant on agent_runs for all to authenticated
  using (company_id in (select auth_company_ids())) with check (company_id in (select auth_company_ids()));
create policy agent_insights_tenant on agent_insights for all to authenticated
  using (company_id in (select auth_company_ids())) with check (company_id in (select auth_company_ids()));
create policy absence_requests_tenant on absence_requests for all to authenticated
  using (company_id in (select auth_company_ids())) with check (company_id in (select auth_company_ids()));
create policy time_entries_tenant on time_entries for all to authenticated
  using (company_id in (select auth_company_ids())) with check (company_id in (select auth_company_ids()));
create policy career_site_events_tenant on career_site_events for all to authenticated
  using (company_id in (select auth_company_ids())) with check (company_id in (select auth_company_ids()));

-- companies: la empresa propia
create policy companies_tenant on companies for all to authenticated
  using (id in (select auth_company_ids())) with check (id in (select auth_company_ids()));

-- ── Categoría B · job_id → jobs.company_id ───────────────────────────────────
create policy job_stages_tenant on job_stages for all to authenticated
  using (job_id in (select id from jobs where company_id in (select auth_company_ids())))
  with check (job_id in (select id from jobs where company_id in (select auth_company_ids())));
create policy campaigns_tenant on campaigns for all to authenticated
  using (job_id in (select id from jobs where company_id in (select auth_company_ids())))
  with check (job_id in (select id from jobs where company_id in (select auth_company_ids())));
create policy distribution_plans_tenant on distribution_plans for all to authenticated
  using (job_id in (select id from jobs where company_id in (select auth_company_ids())))
  with check (job_id in (select id from jobs where company_id in (select auth_company_ids())));
create policy job_skills_tenant on job_skills for all to authenticated
  using (job_id in (select id from jobs where company_id in (select auth_company_ids())))
  with check (job_id in (select id from jobs where company_id in (select auth_company_ids())));
create policy applications_tenant on applications for all to authenticated
  using (job_id in (select id from jobs where company_id in (select auth_company_ids())))
  with check (job_id in (select id from jobs where company_id in (select auth_company_ids())));

-- ── Categoría C · application_id → applications → jobs ───────────────────────
create policy application_events_tenant on application_events for all to authenticated
  using (application_id in (select a.id from applications a join jobs j on j.id = a.job_id where j.company_id in (select auth_company_ids())))
  with check (application_id in (select a.id from applications a join jobs j on j.id = a.job_id where j.company_id in (select auth_company_ids())));
create policy interviews_tenant on interviews for all to authenticated
  using (application_id in (select a.id from applications a join jobs j on j.id = a.job_id where j.company_id in (select auth_company_ids())))
  with check (application_id in (select a.id from applications a join jobs j on j.id = a.job_id where j.company_id in (select auth_company_ids())));
create policy notes_tenant on notes for all to authenticated
  using (application_id in (select a.id from applications a join jobs j on j.id = a.job_id where j.company_id in (select auth_company_ids())))
  with check (application_id in (select a.id from applications a join jobs j on j.id = a.job_id where j.company_id in (select auth_company_ids())));
create policy interview_feedback_tenant on interview_feedback for all to authenticated
  using (interview_id in (select i.id from interviews i join applications a on a.id = i.application_id join jobs j on j.id = a.job_id where j.company_id in (select auth_company_ids())))
  with check (interview_id in (select i.id from interviews i join applications a on a.id = i.application_id join jobs j on j.id = a.job_id where j.company_id in (select auth_company_ids())));

-- ── Categoría D · candidates y candidate_* (vía applications a mis jobs) ─────
create policy candidates_tenant on candidates for all to authenticated
  using (id in (select a.candidate_id from applications a join jobs j on j.id = a.job_id where j.company_id in (select auth_company_ids())))
  with check (true); -- insert de candidato lo hace el flujo; el read/update queda scopeado por using
create policy candidate_education_tenant on candidate_education for all to authenticated
  using (candidate_id in (select a.candidate_id from applications a join jobs j on j.id = a.job_id where j.company_id in (select auth_company_ids())))
  with check (candidate_id in (select a.candidate_id from applications a join jobs j on j.id = a.job_id where j.company_id in (select auth_company_ids())));
create policy candidate_experiences_tenant on candidate_experiences for all to authenticated
  using (candidate_id in (select a.candidate_id from applications a join jobs j on j.id = a.job_id where j.company_id in (select auth_company_ids())))
  with check (candidate_id in (select a.candidate_id from applications a join jobs j on j.id = a.job_id where j.company_id in (select auth_company_ids())));
create policy candidate_languages_tenant on candidate_languages for all to authenticated
  using (candidate_id in (select a.candidate_id from applications a join jobs j on j.id = a.job_id where j.company_id in (select auth_company_ids())))
  with check (candidate_id in (select a.candidate_id from applications a join jobs j on j.id = a.job_id where j.company_id in (select auth_company_ids())));
create policy candidate_skills_tenant on candidate_skills for all to authenticated
  using (candidate_id in (select a.candidate_id from applications a join jobs j on j.id = a.job_id where j.company_id in (select auth_company_ids())))
  with check (candidate_id in (select a.candidate_id from applications a join jobs j on j.id = a.job_id where j.company_id in (select auth_company_ids())));

-- ── Categoría E · employee_id → employees.company_id ────────────────────────
create policy employee_documents_tenant on employee_documents for all to authenticated
  using (employee_id in (select id from employees where company_id in (select auth_company_ids())))
  with check (employee_id in (select id from employees where company_id in (select auth_company_ids())));
create policy employee_allowances_tenant on employee_allowances for all to authenticated
  using (employee_id in (select id from employees where company_id in (select auth_company_ids())))
  with check (employee_id in (select id from employees where company_id in (select auth_company_ids())));
create policy employee_schedules_tenant on employee_schedules for all to authenticated
  using (employee_id in (select id from employees where company_id in (select auth_company_ids())))
  with check (employee_id in (select id from employees where company_id in (select auth_company_ids())));
create policy onboarding_tasks_tenant on onboarding_tasks for all to authenticated
  using (employee_id in (select id from employees where company_id in (select auth_company_ids())))
  with check (employee_id in (select id from employees where company_id in (select auth_company_ids())));
create policy timer_state_tenant on timer_state for all to authenticated
  using (employee_id in (select id from employees where company_id in (select auth_company_ids())))
  with check (employee_id in (select id from employees where company_id in (select auth_company_ids())));

-- ── Categoría F · cadenas más largas (schedules/allowance log) ──────────────
create policy work_schedule_weeks_tenant on work_schedule_weeks for all to authenticated
  using (template_id in (select id from work_schedule_templates where company_id in (select auth_company_ids())))
  with check (template_id in (select id from work_schedule_templates where company_id in (select auth_company_ids())));
create policy work_schedule_days_tenant on work_schedule_days for all to authenticated
  using (week_id in (select w.id from work_schedule_weeks w join work_schedule_templates t on t.id = w.template_id where t.company_id in (select auth_company_ids())))
  with check (week_id in (select w.id from work_schedule_weeks w join work_schedule_templates t on t.id = w.template_id where t.company_id in (select auth_company_ids())));
create policy allowance_adjustment_log_tenant on allowance_adjustment_log for all to authenticated
  using (employee_allowance_id in (select ea.id from employee_allowances ea join employees e on e.id = ea.employee_id where e.company_id in (select auth_company_ids())))
  with check (employee_allowance_id in (select ea.id from employee_allowances ea join employees e on e.id = ea.employee_id where e.company_id in (select auth_company_ids())));

-- ── employees: lectura para miembros de la empresa; escritura solo owner/hr_admin ──
create policy employees_read_tenant on employees for select to authenticated
  using (company_id in (select auth_company_ids()));
create policy employees_write_tenant on employees for all to authenticated
  using (company_id in (select auth_company_ids()) and current_role_name() in ('owner','hr_admin'))
  with check (company_id in (select auth_company_ids()) and current_role_name() in ('owner','hr_admin'));

-- ── Categoría K · SENSIBLES: empresa + rol owner/hr_admin ───────────────────
create policy pay_runs_tenant on pay_runs for all to authenticated
  using (company_id in (select auth_company_ids()) and current_role_name() in ('owner','hr_admin'))
  with check (company_id in (select auth_company_ids()) and current_role_name() in ('owner','hr_admin'));
create policy pay_profiles_tenant on pay_profiles for all to authenticated
  using (company_id in (select auth_company_ids()) and current_role_name() in ('owner','hr_admin'))
  with check (company_id in (select auth_company_ids()) and current_role_name() in ('owner','hr_admin'));
create policy compensation_records_tenant on compensation_records for all to authenticated
  using (company_id in (select auth_company_ids()) and current_role_name() in ('owner','hr_admin'))
  with check (company_id in (select auth_company_ids()) and current_role_name() in ('owner','hr_admin'));
create policy compliance_config_tenant on compliance_config for all to authenticated
  using (company_id in (select auth_company_ids()) and current_role_name() in ('owner','hr_admin'))
  with check (company_id in (select auth_company_ids()) and current_role_name() in ('owner','hr_admin'));
create policy compliance_violations_tenant on compliance_violations for all to authenticated
  using (company_id in (select auth_company_ids()) and current_role_name() in ('owner','hr_admin'))
  with check (company_id in (select auth_company_ids()) and current_role_name() in ('owner','hr_admin'));
create policy pay_components_tenant on pay_components for all to authenticated
  using (pay_profile_id in (select id from pay_profiles where company_id in (select auth_company_ids())) and current_role_name() in ('owner','hr_admin'))
  with check (pay_profile_id in (select id from pay_profiles where company_id in (select auth_company_ids())) and current_role_name() in ('owner','hr_admin'));
create policy pay_run_lines_tenant on pay_run_lines for all to authenticated
  using (pay_run_id in (select id from pay_runs where company_id in (select auth_company_ids())) and current_role_name() in ('owner','hr_admin'))
  with check (pay_run_id in (select id from pay_runs where company_id in (select auth_company_ids())) and current_role_name() in ('owner','hr_admin'));
create policy pay_run_line_items_tenant on pay_run_line_items for all to authenticated
  using (line_id in (select prl.id from pay_run_lines prl join pay_runs pr on pr.id = prl.pay_run_id where pr.company_id in (select auth_company_ids())) and current_role_name() in ('owner','hr_admin'))
  with check (line_id in (select prl.id from pay_run_lines prl join pay_runs pr on pr.id = prl.pay_run_id where pr.company_id in (select auth_company_ids())) and current_role_name() in ('owner','hr_admin'));
create policy payslips_tenant on payslips for all to authenticated
  using (pay_run_line_id in (select prl.id from pay_run_lines prl join pay_runs pr on pr.id = prl.pay_run_id where pr.company_id in (select auth_company_ids())) and current_role_name() in ('owner','hr_admin'))
  with check (pay_run_line_id in (select prl.id from pay_run_lines prl join pay_runs pr on pr.id = prl.pay_run_id where pr.company_id in (select auth_company_ids())) and current_role_name() in ('owner','hr_admin'));
create policy payroll_exports_tenant on payroll_exports for all to authenticated
  using (pay_run_id in (select id from pay_runs where company_id in (select auth_company_ids())) and current_role_name() in ('owner','hr_admin'))
  with check (pay_run_id in (select id from pay_runs where company_id in (select auth_company_ids())) and current_role_name() in ('owner','hr_admin'));
create policy pay_run_audit_log_tenant on pay_run_audit_log for all to authenticated
  using (pay_run_id in (select id from pay_runs where company_id in (select auth_company_ids())) and current_role_name() in ('owner','hr_admin'))
  with check (pay_run_id in (select id from pay_runs where company_id in (select auth_company_ids())) and current_role_name() in ('owner','hr_admin'));

-- ── Referencia global (sin company_id): lectura para autenticados ───────────
create policy channels_read on channels for select to authenticated using (true);
create policy evaluation_templates_read on evaluation_templates for select to authenticated using (true);
create policy skills_read on skills for select to authenticated using (true);

-- ── Accesos PÚBLICOS (anon) del career site — se preservan ──────────────────
create policy jobs_anon_read_active on jobs for select to anon using (status = 'active');
create policy companies_anon_read on companies for select to anon using (true);
create policy career_site_pages_anon_read on career_site_pages for select to anon using (is_published = true);
create policy candidates_anon_insert on candidates for insert to anon with check (true);
create policy applications_anon_insert on applications for insert to anon with check (true);
create policy career_site_events_anon_insert on career_site_events for insert to anon with check (true);
