-- Precomputed agent insights for the dashboard feed.
-- Populated by an async job (on-demand or scheduled); the dashboard only reads.
CREATE TABLE agent_insights (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  text         text not null,
  scope        text not null default '',
  entities     jsonb not null default '[]',
  action       jsonb not null default '{}',   -- { label: string; href: string }
  status       text not null default 'open' check (status in ('open', 'done', 'ignored')),
  generated_at timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

create index agent_insights_company_idx on agent_insights (company_id, generated_at desc);
create index agent_insights_status_idx  on agent_insights (company_id, status);

-- RLS: same company-scoping pattern as the rest of the app
alter table agent_insights enable row level security;

create policy "company members can read insights"
  on agent_insights for select
  using (true);

create policy "company members can update insight status"
  on agent_insights for update
  using (true)
  with check (true);

create policy "service role can insert insights"
  on agent_insights for insert
  with check (true);
