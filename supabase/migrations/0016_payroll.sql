-- ─────────────────────────────────────────────────────────────────────────────
-- 0016_payroll.sql
-- Módulo Payroll: perfiles salariales, corridas, líneas, items,
-- recibos, exportaciones, auditoría. Pack Venezuela activo.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Enums ────────────────────────────────────────────────────────────────────

create type pay_run_status      as enum ('draft', 'in_review', 'approved', 'exported', 'paid');
create type pay_run_line_status as enum ('draft', 'reviewed', 'approved');
create type pay_component_type  as enum ('fixed', 'variable', 'conditional');
create type line_item_category  as enum ('earning', 'deduction', 'employer');
create type country_pack_code   as enum ('ve', 'br', 'es', 'co', 'mx');
create type payment_frequency   as enum ('monthly', 'biweekly', 'weekly');
create type payroll_export_type as enum ('payslips_pdf', 'payroll_csv', 'accounting_csv', 'bank_file', 'compliance');

-- ── pay_profiles ─────────────────────────────────────────────────────────────

create table pay_profiles (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references companies(id) on delete cascade,
  employee_id         uuid not null references employees(id) on delete cascade,
  base_salary         numeric(14,2) not null default 0,
  currency            char(3)       not null default 'USD',
  frequency           payment_frequency not null default 'monthly',
  effective_from      date          not null default current_date,
  payment_method      text          not null default 'transfer',
  bank_name           text,
  bank_account_last4  text,
  country_pack        country_pack_code not null default 've',
  tax_profile         text,
  legal_entity        text,
  employer_cost       numeric(14,2),
  created_at          timestamptz   not null default now(),
  updated_at          timestamptz   not null default now(),
  unique (company_id, employee_id)
);

-- ── pay_components ───────────────────────────────────────────────────────────

create table pay_components (
  id              uuid primary key default gen_random_uuid(),
  pay_profile_id  uuid not null references pay_profiles(id) on delete cascade,
  name            text not null,
  component_type  pay_component_type not null default 'fixed',
  amount          numeric(14,2),
  formula         text,
  active          boolean not null default true,
  order_index     int     not null default 0,
  created_at      timestamptz not null default now()
);

-- ── pay_runs ─────────────────────────────────────────────────────────────────

create table pay_runs (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid   not null references companies(id) on delete cascade,
  period_label    text   not null,   -- "Junio 2026"
  period_month    text   not null,   -- "2026-06"
  entity_name     text   not null,
  run_type        text   not null default 'monthly',
  status          pay_run_status not null default 'draft',
  gross           numeric(14,2) not null default 0,
  net             numeric(14,2) not null default 0,
  employer_cost   numeric(14,2) not null default 0,
  employee_count  int    not null default 0,
  currency        char(3) not null default 'USD',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── pay_run_lines ────────────────────────────────────────────────────────────

create table pay_run_lines (
  id                      uuid primary key default gen_random_uuid(),
  pay_run_id              uuid not null references pay_runs(id) on delete cascade,
  employee_id             uuid not null references employees(id) on delete cascade,
  gross                   numeric(14,2) not null default 0,
  net                     numeric(14,2) not null default 0,
  employer_cost           numeric(14,2) not null default 0,
  status                  pay_run_line_status not null default 'draft',
  has_bank_issue          boolean not null default false,
  has_adjustment_issue    boolean not null default false,
  has_salary_change       boolean not null default false,
  has_unconfirmed_input   boolean not null default false,
  notes                   text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (pay_run_id, employee_id)
);

-- ── pay_run_line_items ───────────────────────────────────────────────────────

create table pay_run_line_items (
  id              uuid primary key default gen_random_uuid(),
  line_id         uuid not null references pay_run_lines(id) on delete cascade,
  category        line_item_category not null,
  label           text not null,
  amount          numeric(14,2) not null default 0,
  quantity_label  text,
  order_index     int  not null default 0
);

-- ── pay_run_audit_log ────────────────────────────────────────────────────────

create table pay_run_audit_log (
  id          uuid primary key default gen_random_uuid(),
  pay_run_id  uuid not null references pay_runs(id) on delete cascade,
  text        text not null,
  who         text not null,
  created_at  timestamptz not null default now()
);

-- ── payslips ─────────────────────────────────────────────────────────────────

create table payslips (
  id               uuid primary key default gen_random_uuid(),
  pay_run_line_id  uuid not null references pay_run_lines(id) on delete cascade,
  slip_number      text not null,
  file_path        text,
  generated_at     timestamptz not null default now(),
  sent_at          timestamptz
);

-- ── payroll_exports ──────────────────────────────────────────────────────────

create table payroll_exports (
  id            uuid primary key default gen_random_uuid(),
  pay_run_id    uuid not null references pay_runs(id) on delete cascade,
  export_type   payroll_export_type not null,
  generated_by  text not null,
  file_path     text,
  created_at    timestamptz not null default now()
);

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table pay_profiles      enable row level security;
alter table pay_components     enable row level security;
alter table pay_runs           enable row level security;
alter table pay_run_lines      enable row level security;
alter table pay_run_line_items enable row level security;
alter table pay_run_audit_log  enable row level security;
alter table payslips           enable row level security;
alter table payroll_exports    enable row level security;

-- pay_profiles: owner/hr_admin de esa empresa
create policy "pay_profiles_admin" on pay_profiles
  for all to authenticated
  using (
    exists (
      select 1 from company_members cm
      where cm.user_id = auth.uid()
        and cm.company_id = pay_profiles.company_id
        and cm.role in ('owner', 'hr_admin')
    )
  )
  with check (
    exists (
      select 1 from company_members cm
      where cm.user_id = auth.uid()
        and cm.company_id = pay_profiles.company_id
        and cm.role in ('owner', 'hr_admin')
    )
  );

-- pay_components: via pay_profiles
create policy "pay_components_admin" on pay_components
  for all to authenticated
  using (
    exists (
      select 1 from pay_profiles pp
        join company_members cm on cm.company_id = pp.company_id
      where pp.id = pay_components.pay_profile_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'hr_admin')
    )
  )
  with check (
    exists (
      select 1 from pay_profiles pp
        join company_members cm on cm.company_id = pp.company_id
      where pp.id = pay_components.pay_profile_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'hr_admin')
    )
  );

-- pay_runs: direct company_id
create policy "pay_runs_admin" on pay_runs
  for all to authenticated
  using (
    exists (
      select 1 from company_members cm
      where cm.user_id = auth.uid()
        and cm.company_id = pay_runs.company_id
        and cm.role in ('owner', 'hr_admin')
    )
  )
  with check (
    exists (
      select 1 from company_members cm
      where cm.user_id = auth.uid()
        and cm.company_id = pay_runs.company_id
        and cm.role in ('owner', 'hr_admin')
    )
  );

-- pay_run_lines: via pay_runs
create policy "pay_run_lines_admin" on pay_run_lines
  for all to authenticated
  using (
    exists (
      select 1 from pay_runs pr
        join company_members cm on cm.company_id = pr.company_id
      where pr.id = pay_run_lines.pay_run_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'hr_admin')
    )
  )
  with check (
    exists (
      select 1 from pay_runs pr
        join company_members cm on cm.company_id = pr.company_id
      where pr.id = pay_run_lines.pay_run_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'hr_admin')
    )
  );

-- pay_run_line_items: via pay_run_lines → pay_runs
create policy "pay_run_line_items_admin" on pay_run_line_items
  for all to authenticated
  using (
    exists (
      select 1 from pay_run_lines prl
        join pay_runs pr on pr.id = prl.pay_run_id
        join company_members cm on cm.company_id = pr.company_id
      where prl.id = pay_run_line_items.line_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'hr_admin')
    )
  )
  with check (
    exists (
      select 1 from pay_run_lines prl
        join pay_runs pr on pr.id = prl.pay_run_id
        join company_members cm on cm.company_id = pr.company_id
      where prl.id = pay_run_line_items.line_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'hr_admin')
    )
  );

-- pay_run_audit_log: via pay_runs
create policy "pay_run_audit_log_admin" on pay_run_audit_log
  for all to authenticated
  using (
    exists (
      select 1 from pay_runs pr
        join company_members cm on cm.company_id = pr.company_id
      where pr.id = pay_run_audit_log.pay_run_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'hr_admin')
    )
  )
  with check (
    exists (
      select 1 from pay_runs pr
        join company_members cm on cm.company_id = pr.company_id
      where pr.id = pay_run_audit_log.pay_run_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'hr_admin')
    )
  );

-- payslips: via pay_run_lines → pay_runs
create policy "payslips_admin" on payslips
  for all to authenticated
  using (
    exists (
      select 1 from pay_run_lines prl
        join pay_runs pr on pr.id = prl.pay_run_id
        join company_members cm on cm.company_id = pr.company_id
      where prl.id = payslips.pay_run_line_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'hr_admin')
    )
  )
  with check (
    exists (
      select 1 from pay_run_lines prl
        join pay_runs pr on pr.id = prl.pay_run_id
        join company_members cm on cm.company_id = pr.company_id
      where prl.id = payslips.pay_run_line_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'hr_admin')
    )
  );

-- payroll_exports: via pay_runs
create policy "payroll_exports_admin" on payroll_exports
  for all to authenticated
  using (
    exists (
      select 1 from pay_runs pr
        join company_members cm on cm.company_id = pr.company_id
      where pr.id = payroll_exports.pay_run_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'hr_admin')
    )
  )
  with check (
    exists (
      select 1 from pay_runs pr
        join company_members cm on cm.company_id = pr.company_id
      where pr.id = payroll_exports.pay_run_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'hr_admin')
    )
  );

-- ── updated_at triggers ───────────────────────────────────────────────────────

create or replace function touch_payroll_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger pay_profiles_updated
  before update on pay_profiles
  for each row execute function touch_payroll_updated_at();

create trigger pay_runs_updated
  before update on pay_runs
  for each row execute function touch_payroll_updated_at();

create trigger pay_run_lines_updated
  before update on pay_run_lines
  for each row execute function touch_payroll_updated_at();

-- ── Índices ───────────────────────────────────────────────────────────────────

create index pay_runs_company_period  on pay_runs(company_id, period_month desc);
create index pay_run_lines_run        on pay_run_lines(pay_run_id);
create index pay_run_lines_employee   on pay_run_lines(employee_id);
create index pay_run_line_items_line  on pay_run_line_items(line_id, category, order_index);
create index pay_run_audit_run        on pay_run_audit_log(pay_run_id, created_at desc);
create index payroll_exports_run      on payroll_exports(pay_run_id, created_at desc);
create index pay_profiles_employee    on pay_profiles(employee_id);
create index pay_components_profile   on pay_components(pay_profile_id, order_index);
