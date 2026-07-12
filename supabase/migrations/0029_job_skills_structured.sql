-- 0029_job_skills_structured.sql
-- Lado OFERTA del matching estructurado (2026-07-12): las ofertas referencian el
-- mismo catálogo canónico que los candidatos (0027). Con ambos lados en el catálogo,
-- el fit-score compara entidades, no substrings de texto libre.
-- jobs.skills text[] se conserva como display/legado; la fuente matcheable es job_skills.

create table job_skills (
  job_id     uuid not null references jobs(id) on delete cascade,
  skill_id   uuid not null references skills(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (job_id, skill_id)
);

-- Ubicación estructurada (como candidates en 0027); location texto queda para display.
alter table jobs
  add column if not exists city         text,
  add column if not exists country_code char(2);

alter table job_skills enable row level security;

create policy "job_skills_member_read" on job_skills
  for select to authenticated
  using (
    exists (
      select 1 from jobs j
      inner join company_members cm on cm.company_id = j.company_id
      where j.id = job_skills.job_id and cm.user_id = auth.uid()
    )
  );
-- Escrituras: service_role desde los endpoints de jobs (resuelven contra el catálogo).

-- ── Backfill de ofertas existentes ───────────────────────────────────────────
-- 1) Skills de jobs.skills que no existen en el catálogo (ni por nombre ni por alias).
insert into skills (name)
select distinct trim(s)
from jobs j, unnest(j.skills) as s
where trim(s) <> ''
  and not exists (select 1 from skills k where lower(k.name) = lower(trim(s)))
  and not exists (
    select 1 from skills k, unnest(k.aliases) a where lower(a) = lower(trim(s))
  );

-- 2) Mapeo job_skills resolviendo nombre o alias.
insert into job_skills (job_id, skill_id)
select distinct j.id, k.id
from jobs j, unnest(j.skills) as s
join skills k
  on lower(k.name) = lower(trim(s))
  or exists (select 1 from unnest(k.aliases) a where lower(a) = lower(trim(s)))
on conflict do nothing;
