-- Step 3: Novedades de nómina en compensation_records
-- Adds novedad_status, pay_run_id, and unique constraint for AC-7b/7c/7d.

alter table compensation_records
  add column if not exists novedad_status text
    check (novedad_status in ('pending', 'included', 'paid')),
  add column if not exists pay_run_id uuid
    references pay_runs(id) on delete set null;

-- AC-7d: block duplicate confirmation for same employee + period
create unique index if not exists compensation_records_employee_period_uniq
  on compensation_records (company_id, employee_id, period_start, period_end);
