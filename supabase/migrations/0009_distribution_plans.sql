-- Persiste los planes de distribución generados por el agente,
-- separando la recomendación (plan) de la activación (campaigns).
CREATE TABLE distribution_plans (
  id           uuid primary key default gen_random_uuid(),
  job_id       uuid not null references jobs(id) on delete cascade,
  objective    text not null,
  budget       numeric not null,
  plan         jsonb not null,         -- ChannelPlan completo
  model        text not null default 'fallback', -- ok | fallback
  status       text not null default 'pending',  -- pending | activated | superseded
  activated_at timestamptz,
  created_at   timestamptz not null default now()
);

create index distribution_plans_job_idx on distribution_plans (job_id, created_at desc);
