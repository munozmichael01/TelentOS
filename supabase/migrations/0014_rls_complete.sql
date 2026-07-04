-- ─────────────────────────────────────────────────────────────────────────────
-- 0014_rls_complete.sql
-- RLS completa para todas las tablas que aún tienen authenticated_all using true.
-- Patrón: aislamiento por company_id vía company_members, sin fallbacks.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── ATS: tablas con company_id directo ───────────────────────────────────────

-- jobs (mantener anon read para career site)
drop policy if exists "jobs_authenticated_all" on jobs;
create policy "jobs_member_rw" on jobs
  for all to authenticated
  using (
    exists (
      select 1 from company_members cm
      where cm.user_id = auth.uid() and cm.company_id = jobs.company_id
    )
  )
  with check (
    exists (
      select 1 from company_members cm
      where cm.user_id = auth.uid() and cm.company_id = jobs.company_id
    )
  );
-- anon policy already exists from 0001; recreate with if not exists pattern
drop policy if exists "jobs_anon_read_active" on jobs;
create policy "jobs_anon_read_active" on jobs
  for select to anon using (status = 'active');

-- ── ATS: tablas via job_id → jobs.company_id ────────────────────────────────

-- job_stages
drop policy if exists "job_stages_authenticated_all" on job_stages;
create policy "job_stages_member_rw" on job_stages
  for all to authenticated
  using (
    exists (
      select 1 from jobs j
      inner join company_members cm on cm.company_id = j.company_id
      where j.id = job_stages.job_id and cm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from jobs j
      inner join company_members cm on cm.company_id = j.company_id
      where j.id = job_stages.job_id and cm.user_id = auth.uid()
    )
  );

-- campaigns
drop policy if exists "campaigns_authenticated_all" on campaigns;
create policy "campaigns_member_rw" on campaigns
  for all to authenticated
  using (
    exists (
      select 1 from jobs j
      inner join company_members cm on cm.company_id = j.company_id
      where j.id = campaigns.job_id and cm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from jobs j
      inner join company_members cm on cm.company_id = j.company_id
      where j.id = campaigns.job_id and cm.user_id = auth.uid()
    )
  );

-- distribution_plans
drop policy if exists "distribution_plans_authenticated_all" on distribution_plans;
create policy "distribution_plans_member_rw" on distribution_plans
  for all to authenticated
  using (
    exists (
      select 1 from jobs j
      inner join company_members cm on cm.company_id = j.company_id
      where j.id = distribution_plans.job_id and cm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from jobs j
      inner join company_members cm on cm.company_id = j.company_id
      where j.id = distribution_plans.job_id and cm.user_id = auth.uid()
    )
  );

-- ── ATS: candidates (global, sin company_id directo) ────────────────────────
-- anon puede insertar (career site); autenticados leen solo candidatos de sus jobs.
drop policy if exists "candidates_authenticated_all" on candidates;

create policy "candidates_anon_insert" on candidates
  for insert to anon with check (true);

create policy "candidates_member_read" on candidates
  for select to authenticated
  using (
    exists (
      select 1 from applications a
      inner join jobs j on j.id = a.job_id
      inner join company_members cm on cm.company_id = j.company_id
      where a.candidate_id = candidates.id and cm.user_id = auth.uid()
    )
  );

create policy "candidates_member_update" on candidates
  for update to authenticated
  using (
    exists (
      select 1 from applications a
      inner join jobs j on j.id = a.job_id
      inner join company_members cm on cm.company_id = j.company_id
      where a.candidate_id = candidates.id and cm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from applications a
      inner join jobs j on j.id = a.job_id
      inner join company_members cm on cm.company_id = j.company_id
      where a.candidate_id = candidates.id and cm.user_id = auth.uid()
    )
  );

-- ── ATS: tablas via application_id ──────────────────────────────────────────

-- applications
drop policy if exists "applications_authenticated_all" on applications;
create policy "applications_member_rw" on applications
  for all to authenticated
  using (
    exists (
      select 1 from jobs j
      inner join company_members cm on cm.company_id = j.company_id
      where j.id = applications.job_id and cm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from jobs j
      inner join company_members cm on cm.company_id = j.company_id
      where j.id = applications.job_id and cm.user_id = auth.uid()
    )
  );

-- applications: anon insert (apply from career site)
create policy "applications_anon_insert" on applications
  for insert to anon with check (true);

-- application_events
drop policy if exists "application_events_authenticated_all" on application_events;
create policy "application_events_member_rw" on application_events
  for all to authenticated
  using (
    exists (
      select 1 from applications a
      inner join jobs j on j.id = a.job_id
      inner join company_members cm on cm.company_id = j.company_id
      where a.id = application_events.application_id and cm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from applications a
      inner join jobs j on j.id = a.job_id
      inner join company_members cm on cm.company_id = j.company_id
      where a.id = application_events.application_id and cm.user_id = auth.uid()
    )
  );

-- notes
drop policy if exists "notes_authenticated_all" on notes;
create policy "notes_member_rw" on notes
  for all to authenticated
  using (
    exists (
      select 1 from applications a
      inner join jobs j on j.id = a.job_id
      inner join company_members cm on cm.company_id = j.company_id
      where a.id = notes.application_id and cm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from applications a
      inner join jobs j on j.id = a.job_id
      inner join company_members cm on cm.company_id = j.company_id
      where a.id = notes.application_id and cm.user_id = auth.uid()
    )
  );

-- interviews
drop policy if exists "interviews_authenticated_all" on interviews;
create policy "interviews_member_rw" on interviews
  for all to authenticated
  using (
    exists (
      select 1 from applications a
      inner join jobs j on j.id = a.job_id
      inner join company_members cm on cm.company_id = j.company_id
      where a.id = interviews.application_id and cm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from applications a
      inner join jobs j on j.id = a.job_id
      inner join company_members cm on cm.company_id = j.company_id
      where a.id = interviews.application_id and cm.user_id = auth.uid()
    )
  );

-- interview_feedback (via interview → application → job)
drop policy if exists "interview_feedback_authenticated_all" on interview_feedback;
create policy "interview_feedback_member_rw" on interview_feedback
  for all to authenticated
  using (
    exists (
      select 1 from interviews iv
      inner join applications a on a.id = iv.application_id
      inner join jobs j on j.id = a.job_id
      inner join company_members cm on cm.company_id = j.company_id
      where iv.id = interview_feedback.interview_id and cm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from interviews iv
      inner join applications a on a.id = iv.application_id
      inner join jobs j on j.id = a.job_id
      inner join company_members cm on cm.company_id = j.company_id
      where iv.id = interview_feedback.interview_id and cm.user_id = auth.uid()
    )
  );

-- ── ATS: tablas globales sin company_id (readonly para autenticados) ─────────

-- channels: datos de referencia globales, solo lectura para miembros
drop policy if exists "channels_authenticated_all" on channels;
create policy "channels_member_read" on channels
  for select to authenticated using (true);

-- evaluation_templates: plantillas globales compartidas
drop policy if exists "evaluation_templates_authenticated_all" on evaluation_templates;
create policy "evaluation_templates_member_read" on evaluation_templates
  for select to authenticated using (true);

-- agent_runs: log global de auditoría IA, solo lectura
drop policy if exists "agent_runs_authenticated_all" on agent_runs;
create policy "agent_runs_member_read" on agent_runs
  for select to authenticated using (true);

-- ── HRIS: tablas via employee_id → employees.company_id ─────────────────────

-- employee_documents
drop policy if exists "employee_documents_authenticated_all" on employee_documents;
create policy "employee_documents_member_rw" on employee_documents
  for all to authenticated
  using (
    exists (
      select 1 from employees e
      inner join company_members cm on cm.company_id = e.company_id
      where e.id = employee_documents.employee_id and cm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from employees e
      inner join company_members cm on cm.company_id = e.company_id
      where e.id = employee_documents.employee_id and cm.user_id = auth.uid()
    )
  );

-- timesheets (tabla legacy)
drop policy if exists "timesheets_authenticated_all" on timesheets;
create policy "timesheets_member_rw" on timesheets
  for all to authenticated
  using (
    exists (
      select 1 from employees e
      inner join company_members cm on cm.company_id = e.company_id
      where e.id = timesheets.employee_id and cm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from employees e
      inner join company_members cm on cm.company_id = e.company_id
      where e.id = timesheets.employee_id and cm.user_id = auth.uid()
    )
  );

-- time_off_requests (tabla legacy)
drop policy if exists "time_off_requests_authenticated_all" on time_off_requests;
create policy "time_off_requests_member_rw" on time_off_requests
  for all to authenticated
  using (
    exists (
      select 1 from employees e
      inner join company_members cm on cm.company_id = e.company_id
      where e.id = time_off_requests.employee_id and cm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from employees e
      inner join company_members cm on cm.company_id = e.company_id
      where e.id = time_off_requests.employee_id and cm.user_id = auth.uid()
    )
  );

-- employee_allowances
drop policy if exists "employee_allowances_authenticated_all" on employee_allowances;
create policy "employee_allowances_member_rw" on employee_allowances
  for all to authenticated
  using (
    exists (
      select 1 from employees e
      inner join company_members cm on cm.company_id = e.company_id
      where e.id = employee_allowances.employee_id and cm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from employees e
      inner join company_members cm on cm.company_id = e.company_id
      where e.id = employee_allowances.employee_id and cm.user_id = auth.uid()
    )
  );

-- allowance_adjustment_log (via employee_allowances → employees)
drop policy if exists "allowance_adjustment_log_authenticated_all" on allowance_adjustment_log;
create policy "allowance_adjustment_log_member_rw" on allowance_adjustment_log
  for all to authenticated
  using (
    exists (
      select 1 from employee_allowances ea
      inner join employees e on e.id = ea.employee_id
      inner join company_members cm on cm.company_id = e.company_id
      where ea.id = allowance_adjustment_log.employee_allowance_id and cm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from employee_allowances ea
      inner join employees e on e.id = ea.employee_id
      inner join company_members cm on cm.company_id = e.company_id
      where ea.id = allowance_adjustment_log.employee_allowance_id and cm.user_id = auth.uid()
    )
  );

-- timer_state
drop policy if exists "timer_state_authenticated_all" on timer_state;
create policy "timer_state_member_rw" on timer_state
  for all to authenticated
  using (
    exists (
      select 1 from employees e
      inner join company_members cm on cm.company_id = e.company_id
      where e.id = timer_state.employee_id and cm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from employees e
      inner join company_members cm on cm.company_id = e.company_id
      where e.id = timer_state.employee_id and cm.user_id = auth.uid()
    )
  );

-- employee_schedules
drop policy if exists "employee_schedules_authenticated_all" on employee_schedules;
create policy "employee_schedules_member_rw" on employee_schedules
  for all to authenticated
  using (
    exists (
      select 1 from employees e
      inner join company_members cm on cm.company_id = e.company_id
      where e.id = employee_schedules.employee_id and cm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from employees e
      inner join company_members cm on cm.company_id = e.company_id
      where e.id = employee_schedules.employee_id and cm.user_id = auth.uid()
    )
  );

-- ── HRIS: tablas con company_id directo ─────────────────────────────────────

-- allowance_types
drop policy if exists "allowance_types_authenticated_all" on allowance_types;
create policy "allowance_types_member_rw" on allowance_types
  for all to authenticated
  using (
    exists (select 1 from company_members cm where cm.user_id = auth.uid() and cm.company_id = allowance_types.company_id)
  )
  with check (
    exists (select 1 from company_members cm where cm.user_id = auth.uid() and cm.company_id = allowance_types.company_id)
  );

-- absence_types
drop policy if exists "absence_types_authenticated_all" on absence_types;
create policy "absence_types_member_rw" on absence_types
  for all to authenticated
  using (
    exists (select 1 from company_members cm where cm.user_id = auth.uid() and cm.company_id = absence_types.company_id)
  )
  with check (
    exists (select 1 from company_members cm where cm.user_id = auth.uid() and cm.company_id = absence_types.company_id)
  );

-- allowance_policies
drop policy if exists "allowance_policies_authenticated_all" on allowance_policies;
create policy "allowance_policies_member_rw" on allowance_policies
  for all to authenticated
  using (
    exists (select 1 from company_members cm where cm.user_id = auth.uid() and cm.company_id = allowance_policies.company_id)
  )
  with check (
    exists (select 1 from company_members cm where cm.user_id = auth.uid() and cm.company_id = allowance_policies.company_id)
  );

-- company_holidays
drop policy if exists "company_holidays_authenticated_all" on company_holidays;
create policy "company_holidays_member_rw" on company_holidays
  for all to authenticated
  using (
    exists (select 1 from company_members cm where cm.user_id = auth.uid() and cm.company_id = company_holidays.company_id)
  )
  with check (
    exists (select 1 from company_members cm where cm.user_id = auth.uid() and cm.company_id = company_holidays.company_id)
  );

-- work_schedule_templates
drop policy if exists "work_schedule_templates_authenticated_all" on work_schedule_templates;
create policy "work_schedule_templates_member_rw" on work_schedule_templates
  for all to authenticated
  using (
    exists (select 1 from company_members cm where cm.user_id = auth.uid() and cm.company_id = work_schedule_templates.company_id)
  )
  with check (
    exists (select 1 from company_members cm where cm.user_id = auth.uid() and cm.company_id = work_schedule_templates.company_id)
  );

-- ── HRIS: tablas via work_schedule_templates ─────────────────────────────────

-- work_schedule_weeks
drop policy if exists "work_schedule_weeks_authenticated_all" on work_schedule_weeks;
create policy "work_schedule_weeks_member_rw" on work_schedule_weeks
  for all to authenticated
  using (
    exists (
      select 1 from work_schedule_templates wst
      inner join company_members cm on cm.company_id = wst.company_id
      where wst.id = work_schedule_weeks.template_id and cm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from work_schedule_templates wst
      inner join company_members cm on cm.company_id = wst.company_id
      where wst.id = work_schedule_weeks.template_id and cm.user_id = auth.uid()
    )
  );

-- work_schedule_days
drop policy if exists "work_schedule_days_authenticated_all" on work_schedule_days;
create policy "work_schedule_days_member_rw" on work_schedule_days
  for all to authenticated
  using (
    exists (
      select 1 from work_schedule_weeks w
      inner join work_schedule_templates wst on wst.id = w.template_id
      inner join company_members cm on cm.company_id = wst.company_id
      where w.id = work_schedule_days.week_id and cm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from work_schedule_weeks w
      inner join work_schedule_templates wst on wst.id = w.template_id
      inner join company_members cm on cm.company_id = wst.company_id
      where w.id = work_schedule_days.week_id and cm.user_id = auth.uid()
    )
  );

-- ── Career site ───────────────────────────────────────────────────────────────

-- career_site_pages (tiene auth_all using true desde 0005)
drop policy if exists "auth_all" on career_site_pages;
create policy "career_site_pages_member_rw" on career_site_pages
  for all to authenticated
  using (
    exists (select 1 from company_members cm where cm.user_id = auth.uid() and cm.company_id = career_site_pages.company_id)
  )
  with check (
    exists (select 1 from company_members cm where cm.user_id = auth.uid() and cm.company_id = career_site_pages.company_id)
  );

-- ── Agent insights (using true → company-scoped) ────────────────────────────

drop policy if exists "company members can read insights" on agent_insights;
drop policy if exists "company members can update insight status" on agent_insights;
-- service role insert policy stays

create policy "agent_insights_member_read" on agent_insights
  for select to authenticated
  using (
    exists (select 1 from company_members cm where cm.user_id = auth.uid() and cm.company_id = agent_insights.company_id)
  );

create policy "agent_insights_member_update" on agent_insights
  for update to authenticated
  using (
    exists (select 1 from company_members cm where cm.user_id = auth.uid() and cm.company_id = agent_insights.company_id)
  )
  with check (
    exists (select 1 from company_members cm where cm.user_id = auth.uid() and cm.company_id = agent_insights.company_id)
  );
