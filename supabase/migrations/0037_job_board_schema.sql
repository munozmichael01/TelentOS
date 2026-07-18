-- 0037_job_board_schema.sql — Job Board: requisitos estructurados de oferta, screening,
-- identidad de candidato (perfil global + preferencias), guardadas y alertas.

-- ── Oferta: requisitos estructurados ────────────────────────────────────────
alter table jobs
  add column if not exists education_level text
    check (education_level is null or education_level in
      ('none','secondary','vocational','bachelor','master','phd')),
  add column if not exists seniority_level text
    check (seniority_level is null or seniority_level in
      ('junior','mid','senior','lead','principal','manager','director')),
  add column if not exists modality text
    check (modality is null or modality in ('presencial','hibrido','remoto'));

-- skill excluyente (ausente → descarta/penaliza) vs deseable (solo suma)
alter table job_skills
  add column if not exists requirement text not null default 'deseable'
    check (requirement in ('excluyente','deseable'));

-- ── Screening questions (por oferta) ────────────────────────────────────────
create table if not exists screening_questions (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  type text not null check (type in ('yes_no','single_choice','text','url')),
  prompt text not null,
  options jsonb not null default '[]',       -- choices para single_choice
  required boolean not null default false,
  mode text not null default 'weighted' check (mode in ('filter','weighted')),
  filter_rule jsonb,                          -- respuesta que descarta (mode=filter)
  weight int not null default 0,              -- ± puntos (mode=weighted)
  order_index int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists screening_questions_job_idx on screening_questions(job_id);

create table if not exists application_screening_answers (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  question_id uuid not null references screening_questions(id) on delete cascade,
  answer jsonb not null,
  created_at timestamptz not null default now(),
  unique (application_id, question_id)
);

-- ── Identidad de candidato: perfil global (1 por auth user) + preferencias ──
create table if not exists candidate_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  headline text,
  about text,
  city text,
  country_code char(2),
  experience_years int,
  education jsonb not null default '[]',       -- del cv-parser
  languages jsonb not null default '[]',       -- del cv-parser (CEFR)
  -- preferencias (fit "match para ti")
  pref_salary_min int,
  pref_currency text,
  pref_modality text[] not null default '{}',  -- presencial/hibrido/remoto
  pref_locations text[] not null default '{}',
  pref_contract text[] not null default '{}',
  completeness int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- skills canónicas del perfil (reusa el catálogo `skills`)
create table if not exists candidate_profile_skills (
  profile_id uuid not null references candidate_profiles(id) on delete cascade,
  skill_id uuid not null references skills(id) on delete cascade,
  primary key (profile_id, skill_id)
);

-- vincula la ficha ATS por-empresa (candidates) con la cuenta global
alter table candidates add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists candidates_user_idx on candidates(user_id) where user_id is not null;

-- guardadas + alertas (del candidato)
create table if not exists saved_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references jobs(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, job_id)
);
create table if not exists job_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  criteria jsonb not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- origen de la candidatura
alter table applications add column if not exists source text;

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table screening_questions enable row level security;
alter table application_screening_answers enable row level security;
alter table candidate_profiles enable row level security;
alter table candidate_profile_skills enable row level security;
alter table saved_jobs enable row level security;
alter table job_alerts enable row level security;

-- screening_questions: la empresa las gestiona (vía job→company); el público lee las
-- de ofertas activas (candidato que aplica, puede ser anónimo).
create policy screening_questions_tenant on screening_questions for all to authenticated
  using (job_id in (select id from jobs where company_id in (select auth_company_ids())))
  with check (job_id in (select id from jobs where company_id in (select auth_company_ids())));
create policy screening_questions_anon_read on screening_questions for select to anon
  using (job_id in (select id from jobs where status = 'active'));

-- respuestas de screening: la empresa lee (vía application→job). La INSERCIÓN NO va por
-- cliente (sería `with check true`, permisiva) — se hace server-side en el endpoint de
-- apply, que valida y scopea (patrón de escritura de confianza tras el guard).
create policy answers_company_read on application_screening_answers for select to authenticated
  using (application_id in (
    select a.id from applications a join jobs j on j.id = a.job_id
    where j.company_id in (select auth_company_ids())));

-- perfil de candidato + skills + guardadas + alertas: SOLO el dueño (user_id = auth.uid()).
create policy candidate_profiles_own on candidate_profiles for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy candidate_profile_skills_own on candidate_profile_skills for all to authenticated
  using (profile_id in (select id from candidate_profiles where user_id = auth.uid()))
  with check (profile_id in (select id from candidate_profiles where user_id = auth.uid()));
create policy saved_jobs_own on saved_jobs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy job_alerts_own on job_alerts for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- el candidato lee SUS fichas ATS y SUS candidaturas (cross-empresa) — sin ver las de otros.
create policy candidates_own_read on candidates for select to authenticated
  using (user_id = auth.uid());
create policy applications_candidate_read on applications for select to authenticated
  using (candidate_id in (select id from candidates where user_id = auth.uid()));
