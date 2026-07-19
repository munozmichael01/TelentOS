-- 0044_alerts_freq_and_follows.sql
-- Alertas: frecuencia real (el selector existía pero se descartaba) + last_seen_at para
-- contar ofertas nuevas. Seguir empresa: nueva tabla company_follows (CTA primaria del
-- mockup Employer). Toggle active ya existía en job_alerts (faltaba el endpoint PATCH).

alter table job_alerts
  add column if not exists frequency text not null default 'weekly'
    check (frequency in ('instant','daily','weekly'));
alter table job_alerts
  add column if not exists last_seen_at timestamptz not null default now();

create table if not exists company_follows (
  user_id    uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, company_id)
);
alter table company_follows enable row level security;
create policy company_follows_own on company_follows for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
