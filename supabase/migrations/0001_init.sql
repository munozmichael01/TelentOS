-- TalentOS — schema inicial
-- Decisión de diseño: un workspace por cuenta (no multi-tenant). Existe una
-- única fila en `companies` que actúa como workspace; todas las tablas cuelgan
-- de ella. RLS básico: cualquier usuario autenticado tiene acceso total al
-- workspace; el rol `anon` solo puede leer lo necesario para el career site
-- público. Las escrituras públicas (candidaturas) pasan por una API route con
-- service_role, así no abrimos INSERT a anon.

create extension if not exists "pgcrypto";

-- ── Workspace ───────────────────────────────────────────────────────────────
create table companies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  logo_url    text,
  description text,
  website     text,
  created_at  timestamptz not null default now()
);

-- ── Bloque 1: ofertas y distribución ───────────────────────────────────────
create table jobs (
  id                   uuid primary key default gen_random_uuid(),
  company_id           uuid not null references companies(id) on delete cascade,
  title                text not null,
  description          text,
  skills               text[] not null default '{}',
  salary_min           integer,
  salary_max           integer,
  salary_currency      text not null default 'EUR',
  location             text,
  employment_type      text not null default 'full_time', -- full_time|part_time|contract|internship
  sector               text,
  department           text,
  category             text,
  experience_min_years integer not null default 0,
  status               text not null default 'draft',     -- draft|active|closed|archived
  source               text not null default 'manual',    -- manual|ai|import_csv|import_xml|import_xlsx|import_json|import_url
  external_id          text,
  -- hash de (título normalizado + ubicación) para deduplicar entre fuentes
  dedupe_hash          text,
  created_by           uuid,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create unique index jobs_dedupe_idx on jobs (dedupe_hash) where dedupe_hash is not null;
create index jobs_status_idx on jobs (status);

-- Etapas del pipeline, configurables por oferta
create table job_stages (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid not null references jobs(id) on delete cascade,
  name        text not null,
  order_index integer not null default 0,
  is_terminal boolean not null default false
);
create index job_stages_job_idx on job_stages (job_id);

-- Canales de distribución (mocks con estructura real)
create table channels (
  id       uuid primary key default gen_random_uuid(),
  name     text not null unique,
  kind     text not null default 'job_board', -- job_board|aggregator|social
  base_cpa numeric not null default 20,       -- coste por aplicación de referencia
  audience text
);

create table campaigns (
  id           uuid primary key default gen_random_uuid(),
  job_id       uuid not null references jobs(id) on delete cascade,
  channel_id   uuid not null references channels(id),
  status       text not null default 'active', -- active|paused|finished
  objective    text not null default 'volume', -- volume|quality|cpa
  budget       numeric not null default 0,
  priority     integer not null default 1,
  copy         text,                            -- copy adaptado al canal
  views        integer not null default 0,
  applications integer not null default 0,
  spend        numeric not null default 0,
  started_at   timestamptz not null default now()
);
create index campaigns_job_idx on campaigns (job_id);

-- ── Bloque 2: ATS ───────────────────────────────────────────────────────────
create table candidates (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  email            text not null,
  phone            text,
  location         text,
  skills           text[] not null default '{}',
  experience_years integer not null default 0,
  cv_url           text,
  summary          text,
  source           text not null default 'manual',
  created_at       timestamptz not null default now()
);
-- dedupe de candidatos por email
create unique index candidates_email_idx on candidates (lower(email));

create table applications (
  id           uuid primary key default gen_random_uuid(),
  job_id       uuid not null references jobs(id) on delete cascade,
  candidate_id uuid not null references candidates(id) on delete cascade,
  stage_id     uuid references job_stages(id),
  fit_score    integer,                         -- 0–100
  source       text not null default 'career_site',
  utm          jsonb not null default '{}',     -- utm_source/medium/campaign del origen
  status       text not null default 'open',    -- open|hired|rejected
  created_at   timestamptz not null default now(),
  unique (job_id, candidate_id)
);
create index applications_job_idx on applications (job_id);

-- Trazabilidad: quién movió a quién, cuándo y por qué
create table application_events (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  type           text not null,                 -- created|stage_change|hired|rejected|note
  from_stage     text,
  to_stage       text,
  reason         text,
  actor_id       uuid,
  actor_email    text,
  created_at     timestamptz not null default now()
);
create index application_events_app_idx on application_events (application_id);

create table notes (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  author_id      uuid,
  author_email   text,
  body           text not null,
  created_at     timestamptz not null default now()
);

create table interviews (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  stage_id       uuid references job_stages(id),
  scheduled_at   timestamptz not null,
  duration_min   integer not null default 45,
  interviewer    text,
  meeting_url    text,
  status         text not null default 'scheduled', -- scheduled|done|cancelled
  created_at     timestamptz not null default now()
);

-- Plantillas de evaluación por etapa (questions: [{q, type}])
create table evaluation_templates (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  stage_name text,
  questions  jsonb not null default '[]'
);

create table interview_feedback (
  id           uuid primary key default gen_random_uuid(),
  interview_id uuid not null references interviews(id) on delete cascade,
  template_id  uuid references evaluation_templates(id),
  ratings      jsonb not null default '{}',   -- {pregunta: puntuación}
  overall      integer,                       -- 1–5
  comments     text,
  author_email text,
  created_at   timestamptz not null default now()
);

-- ── Bloque 3: HRIS ──────────────────────────────────────────────────────────
create table employees (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references companies(id) on delete cascade,
  candidate_id        uuid references candidates(id),        -- continuidad ATS → HRIS
  application_id      uuid references applications(id),
  name                text not null,
  email               text,
  role_title          text,
  department          text,
  start_date          date,
  contract_type       text not null default 'indefinido',
  manager_id          uuid references employees(id),         -- org chart
  vacation_days_total integer not null default 23,
  status              text not null default 'active',        -- active|offboarded
  created_at          timestamptz not null default now()
);

create table employee_documents (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  name        text not null,
  file_url    text not null,
  created_at  timestamptz not null default now()
);

create table onboarding_tasks (
  id           uuid primary key default gen_random_uuid(),
  employee_id  uuid not null references employees(id) on delete cascade,
  title        text not null,
  description  text,
  assignee     text,                            -- responsable (nombre o rol)
  due_date     date,
  status       text not null default 'pending', -- pending|in_progress|done
  order_index  integer not null default 0,
  generated_by text not null default 'manual',  -- manual|agent
  created_at   timestamptz not null default now()
);

create table timesheets (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  work_date   date not null,
  hours       numeric not null,
  notes       text,
  created_at  timestamptz not null default now()
);

create table time_off_requests (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  start_date  date not null,
  end_date    date not null,
  days        numeric not null,
  type        text not null default 'vacation', -- vacation|sick|other
  status      text not null default 'pending',  -- pending|approved|rejected
  approver    text,
  comment     text,
  created_at  timestamptz not null default now()
);

-- ── Auditoría de agentes IA ─────────────────────────────────────────────────
-- Cada invocación de agente queda registrada: la IA sugiere, el humano decide.
create table agent_runs (
  id         uuid primary key default gen_random_uuid(),
  agent      text not null,    -- job-writer|channel-optimizer|candidate-analyzer|onboarding-builder
  input      jsonb not null default '{}',
  output     jsonb not null default '{}',
  status     text not null default 'ok', -- ok|error|fallback
  created_at timestamptz not null default now()
);

-- ── RLS ─────────────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'companies','jobs','job_stages','channels','campaigns','candidates',
    'applications','application_events','notes','interviews',
    'evaluation_templates','interview_feedback','employees',
    'employee_documents','onboarding_tasks','timesheets','time_off_requests',
    'agent_runs'
  ] loop
    execute format('alter table %I enable row level security', t);
    -- workspace único: cualquier usuario autenticado opera sobre todo
    execute format(
      'create policy "%s_authenticated_all" on %I for all to authenticated using (true) with check (true)',
      t, t
    );
  end loop;
end $$;

-- Career site público: anon puede leer la empresa y las ofertas activas
create policy "companies_anon_read" on companies for select to anon using (true);
create policy "jobs_anon_read_active" on jobs for select to anon using (status = 'active');

-- ── Storage buckets ─────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public) values
  ('logos', 'logos', true),
  ('cvs', 'cvs', false),
  ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "logos_public_read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'logos');
create policy "authenticated_storage_all" on storage.objects
  for all to authenticated
  using (bucket_id in ('logos','cvs','documents'))
  with check (bucket_id in ('logos','cvs','documents'));
