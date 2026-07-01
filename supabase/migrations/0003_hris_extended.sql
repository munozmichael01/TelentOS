-- TalentOS — HRIS extended: Features 1–7
-- Añade los módulos de ausencias, permisos, horarios, fichaje,
-- compensación y compliance. Las tablas anteriores (timesheets,
-- time_off_requests) se conservan para no romper código existente;
-- las nuevas conviven con ellas.

-- ────────────────────────────────────────────────────────────────────────────
-- FEATURE 1 — Tipos de ausencia y políticas de permisos
-- ────────────────────────────────────────────────────────────────────────────

create table allowance_types (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name       text not null,
  unit       text not null default 'days', -- days | hours
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index allowance_types_company_idx on allowance_types (company_id);

create table absence_types (
  id                    uuid primary key default gen_random_uuid(),
  company_id            uuid not null references companies(id) on delete cascade,
  name                  text not null,
  color                 text not null default '#79746B',
  icon                  text not null default '📅',
  requires_approval     boolean not null default true,
  deducts_from_allowance boolean not null default false,
  allowance_type_id     uuid references allowance_types(id),
  is_public             boolean not null default true,
  requires_document     boolean not null default false,
  allow_half_day        boolean not null default true,
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index absence_types_company_idx on absence_types (company_id);

create table allowance_policies (
  id                    uuid primary key default gen_random_uuid(),
  company_id            uuid not null references companies(id) on delete cascade,
  allowance_type_id     uuid not null references allowance_types(id),
  name                  text not null,
  amount                numeric not null default 0,           -- días o horas según unit
  cycle_type            text not null default 'annual',       -- annual | monthly
  cycle_start_month     integer,                              -- 1-12; null = aniversario del empleado
  assignment_timing     text not null default 'start_of_cycle', -- start_of_cycle | end_of_cycle
  expiry_rule           text not null default 'immediate',    -- immediate | never | after_period
  expiry_period_months  integer,                              -- si expiry_rule='after_period'
  carryover_limit       numeric,                              -- null = sin límite, 0 = no transferible
  allow_negative        boolean not null default false,
  is_default            boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index allowance_policies_company_idx on allowance_policies (company_id);
create index allowance_policies_type_idx   on allowance_policies (allowance_type_id);

create table employee_allowances (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  policy_id   uuid not null references allowance_policies(id),
  valid_from  date not null,
  valid_until date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index employee_allowances_emp_idx on employee_allowances (employee_id);

-- Auditoría de ajustes manuales (Gap fix #1: log en lugar de campo único)
create table allowance_adjustment_log (
  id                    uuid primary key default gen_random_uuid(),
  employee_allowance_id uuid not null references employee_allowances(id) on delete cascade,
  adjusted_by_employee_id uuid references employees(id),
  amount                numeric not null,      -- positivo = suma, negativo = resta
  reason                text not null,
  type                  text not null default 'manual_hr', -- manual_hr | carryover | expiry | company_holiday
  created_at            timestamptz not null default now()
);
create index adjustment_log_allowance_idx on allowance_adjustment_log (employee_allowance_id);

-- Festivos de empresa (también Feature 3)
create table company_holidays (
  id                      uuid primary key default gen_random_uuid(),
  company_id              uuid not null references companies(id) on delete cascade,
  name                    text not null,
  date                    date not null,
  repeats_annually        boolean not null default true,
  is_half_day             boolean not null default false,
  deducts_from_allowance  boolean not null default false,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index company_holidays_company_idx on company_holidays (company_id);
create index company_holidays_date_idx    on company_holidays (date);

-- ────────────────────────────────────────────────────────────────────────────
-- FEATURE 2 — Solicitudes de ausencia
-- ────────────────────────────────────────────────────────────────────────────

create table absence_requests (
  id                         uuid primary key default gen_random_uuid(),
  company_id                 uuid not null references companies(id) on delete cascade,
  employee_id                uuid not null references employees(id) on delete cascade,
  created_by_employee_id     uuid references employees(id),
  absence_type_id            uuid not null references absence_types(id),
  start_date                 date not null,
  start_period               text not null default 'full',    -- morning | afternoon | full
  end_date                   date not null,
  end_period                 text not null default 'full',
  working_days_count         numeric not null default 0,
  status                     text not null default 'pending', -- pending | approved | rejected | cancelled
  approved_by_employee_id    uuid references employees(id),
  approved_at                timestamptz,
  rejection_reason           text,
  comment                    text,
  document_url               text,
  substitute_employee_id     uuid references employees(id),
  notify_employee_ids        uuid[] not null default '{}',
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);
create index absence_requests_employee_idx    on absence_requests (employee_id);
create index absence_requests_status_idx      on absence_requests (status);
create index absence_requests_dates_idx       on absence_requests (start_date, end_date);
create index absence_requests_company_idx     on absence_requests (company_id);

-- ────────────────────────────────────────────────────────────────────────────
-- FEATURE 4 — Horarios de trabajo
-- ────────────────────────────────────────────────────────────────────────────

create table work_schedule_templates (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name       text not null,
  week_type  text not null default 'single', -- single | rotating
  is_default boolean not null default false,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index work_schedule_templates_company_idx on work_schedule_templates (company_id);

create table work_schedule_weeks (
  id           uuid primary key default gen_random_uuid(),
  template_id  uuid not null references work_schedule_templates(id) on delete cascade,
  week_label   text not null default 'A',
  week_index   integer not null default 0
);
create index work_schedule_weeks_template_idx on work_schedule_weeks (template_id);

create table work_schedule_days (
  id             uuid primary key default gen_random_uuid(),
  week_id        uuid not null references work_schedule_weeks(id) on delete cascade,
  day_of_week    integer not null,     -- 0=lunes … 6=domingo
  is_working_day boolean not null default true,
  slots          jsonb not null default '[]', -- [{start:"08:00",end:"12:00"},...]
  total_minutes  integer not null default 0   -- calculado y almacenado
);
create index work_schedule_days_week_idx on work_schedule_days (week_id);

create table employee_schedules (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  template_id uuid not null references work_schedule_templates(id),
  valid_from  date not null,
  valid_until date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index employee_schedules_emp_idx on employee_schedules (employee_id);

-- ────────────────────────────────────────────────────────────────────────────
-- FEATURE 5 — Registro de horas (Time Tracking)
-- ────────────────────────────────────────────────────────────────────────────

create table time_entries (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references companies(id) on delete cascade,
  employee_id       uuid not null references employees(id) on delete cascade,
  date              date not null,
  start_time        timestamptz not null,
  end_time          timestamptz,          -- null mientras el temporizador está activo
  duration_minutes  integer,             -- calculado al cerrar
  entry_type        text not null default 'work', -- work | break
  comment           text,
  timezone          text not null default 'Europe/Madrid',
  source            text not null default 'manual', -- manual | timer | terminal
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index time_entries_employee_date_idx on time_entries (employee_id, date);
create index time_entries_company_idx       on time_entries (company_id);

-- Estado del temporizador activo — máximo 1 por empleado
create table timer_state (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  started_at  timestamptz not null default now(),
  entry_type  text not null default 'work',
  unique (employee_id)
);

-- ────────────────────────────────────────────────────────────────────────────
-- FEATURE 6 — Compensación (Banco de horas)
-- ────────────────────────────────────────────────────────────────────────────

create table compensation_records (
  id                        uuid primary key default gen_random_uuid(),
  company_id                uuid not null references companies(id) on delete cascade,
  employee_id               uuid not null references employees(id) on delete cascade,
  processed_by_employee_id  uuid references employees(id),
  period_start              date not null,
  period_end                date not null,
  scheduled_minutes         integer not null default 0,
  worked_minutes            integer not null default 0,
  balance_minutes           integer not null default 0,  -- worked - scheduled
  compensated_minutes       integer not null default 0,
  compensation_type         text not null default 'time_off', -- time_off | payment
  conversion_factor         numeric not null default 1.0,
  comment                   text,
  created_at                timestamptz not null default now()
);
create index compensation_records_employee_idx on compensation_records (employee_id);
create index compensation_records_period_idx   on compensation_records (period_start, period_end);

-- ────────────────────────────────────────────────────────────────────────────
-- FEATURE 7 — Compliance
-- ────────────────────────────────────────────────────────────────────────────

create table compliance_config (
  id                                uuid primary key default gen_random_uuid(),
  company_id                        uuid not null references companies(id) on delete cascade unique,
  max_work_minutes_per_day          integer,               -- null = sin límite
  max_start_time_minutes            integer,               -- minutos desde medianoche
  min_break_minutes                 integer,
  allow_start_with_break            boolean not null default false,
  allow_end_with_break              boolean not null default false,
  break_rules                       jsonb not null default '[]',
  alert_on_max_hours                boolean not null default true,
  alert_on_overtime_threshold_minutes integer,
  alert_on_missing_break            boolean not null default true,
  updated_at                        timestamptz not null default now(),
  updated_by                        uuid references employees(id)
);

create table compliance_violations (
  id                          uuid primary key default gen_random_uuid(),
  company_id                  uuid not null references companies(id) on delete cascade,
  employee_id                 uuid not null references employees(id) on delete cascade,
  date                        date not null,
  time_entry_id               uuid references time_entries(id) on delete set null,
  violation_type              text not null, -- max_hours_exceeded | early_start | missing_break | insufficient_break
  description                 text not null,
  acknowledged_at             timestamptz,
  acknowledged_by_employee_id uuid references employees(id),
  created_at                  timestamptz not null default now()
);
create index compliance_violations_employee_idx on compliance_violations (employee_id);
create index compliance_violations_date_idx     on compliance_violations (date);
create index compliance_violations_ack_idx      on compliance_violations (acknowledged_at) where acknowledged_at is null;

-- ────────────────────────────────────────────────────────────────────────────
-- RLS — mismo patrón que el schema inicial
-- ────────────────────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'allowance_types','absence_types','allowance_policies',
    'employee_allowances','allowance_adjustment_log','company_holidays',
    'absence_requests',
    'work_schedule_templates','work_schedule_weeks','work_schedule_days','employee_schedules',
    'time_entries','timer_state',
    'compensation_records',
    'compliance_config','compliance_violations'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy "%s_authenticated_all" on %I for all to authenticated using (true) with check (true)',
      t, t
    );
  end loop;
end $$;

-- ────────────────────────────────────────────────────────────────────────────
-- Datos de arranque — tipos de ausencia y política por defecto
-- (se insertan con un valor de company_id placeholder;
--  el onboarding de la empresa los re-crea con su company_id real)
-- ────────────────────────────────────────────────────────────────────────────
-- (sin seed data — cada empresa configura sus propios tipos)
