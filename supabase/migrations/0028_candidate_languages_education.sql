-- 0028_candidate_languages_education.sql
-- Completa el perfil estructurado del CV-parser (decisión 2026-07-12): idiomas con
-- nivel normalizado (CEFR + nativo, no texto libre) y educación estructurada.
-- Mismo patrón que candidate_skills/experiences (0027): el agente extrae → el humano
-- valida → el endpoint persiste con service_role; RLS de lectura vía application→job.

create table candidate_languages (
  candidate_id uuid not null references candidates(id) on delete cascade,
  language     text not null,              -- "Inglés", "Portugués" (idioma, no locale)
  level        text,                       -- a1|a2|b1|b2|c1|c2|native (null si no consta)
  source       text not null default 'manual',   -- 'cv' | 'manual'
  created_at   timestamptz not null default now(),
  primary key (candidate_id, language)
);

create table candidate_education (
  id           uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  degree       text not null,              -- "Grado en Ingeniería Informática"
  institution  text,
  field        text,                       -- área: "Informática", "ADE"…
  start_year   int,
  end_year     int,                        -- null = en curso
  order_index  int not null default 0,
  source       text not null default 'manual',
  created_at   timestamptz not null default now()
);
create index candidate_education_candidate_idx
  on candidate_education (candidate_id, order_index);

alter table candidate_languages enable row level security;
alter table candidate_education enable row level security;

create policy "candidate_languages_member_read" on candidate_languages
  for select to authenticated
  using (
    exists (
      select 1 from applications a
      inner join jobs j on j.id = a.job_id
      inner join company_members cm on cm.company_id = j.company_id
      where a.candidate_id = candidate_languages.candidate_id and cm.user_id = auth.uid()
    )
  );

create policy "candidate_education_member_read" on candidate_education
  for select to authenticated
  using (
    exists (
      select 1 from applications a
      inner join jobs j on j.id = a.job_id
      inner join company_members cm on cm.company_id = j.company_id
      where a.candidate_id = candidate_education.candidate_id and cm.user_id = auth.uid()
    )
  );
-- Escrituras: service_role desde los endpoints de confirmación (verifican empresa antes).
