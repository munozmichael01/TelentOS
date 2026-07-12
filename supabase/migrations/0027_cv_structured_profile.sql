-- 0027_cv_structured_profile.sql
-- Modelo de datos estructurado para el CV-parser (agentes P1). Decisión de producto
-- 2026-07-11: skills en CATÁLOGO CANÓNICO GESTIONADO (no text[] libre), experiencia e
-- ubicación estructuradas. Sustituye vocabularios inconsistentes ("React"/"ReactJS"/
-- "react.js") por entidades consultables y matcheables candidato↔oferta.
--
-- El agente (pista B) extrae → JSON estructurado; el endpoint POST /api/candidates/[id]/
-- cv-profile (service_role, con requireApiRole + check de empresa) resuelve los nombres
-- contra el catálogo y persiste. Los agentes nunca escriben directo (invariante).

-- ── Catálogo canónico de skills ──────────────────────────────────────────────
-- Global por ahora (single-tenant curado). company_id se añadirá cuando haya
-- skills específicas por empresa (multi-tenant).
create table skills (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,                 -- forma canónica: "React", "TypeScript"
  category    text,                          -- language|framework|tool|domain|soft
  aliases     text[] not null default '{}',  -- ["reactjs","react.js"] resuelven a name
  created_at  timestamptz not null default now()
);
create unique index skills_name_lower_idx on skills (lower(name));
create index skills_aliases_idx on skills using gin (aliases);

-- ── Skills del candidato (join al catálogo) ──────────────────────────────────
create table candidate_skills (
  candidate_id uuid not null references candidates(id) on delete cascade,
  skill_id     uuid not null references skills(id) on delete cascade,
  source       text not null default 'manual',   -- 'cv' | 'manual'
  confidence   numeric(3,2),                       -- 0..1 si el parser lo aporta
  created_at   timestamptz not null default now(),
  primary key (candidate_id, skill_id)
);

-- ── Ubicación estructurada en candidates ─────────────────────────────────────
-- location (texto libre) se conserva como valor crudo/display.
alter table candidates
  add column if not exists city         text,
  add column if not exists country_code char(2);   -- ISO 3166-1 alpha-2

-- ── Historial de experiencia estructurado ────────────────────────────────────
create table candidate_experiences (
  id           uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  title        text not null,
  company      text,
  seniority    text,                 -- junior|mid|senior|lead|exec
  start_date   date,
  end_date     date,
  is_current   boolean not null default false,
  order_index  int not null default 0,
  source       text not null default 'manual',
  created_at   timestamptz not null default now()
);
create index candidate_experiences_candidate_idx
  on candidate_experiences (candidate_id, order_index);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table skills                enable row level security;
alter table candidate_skills      enable row level security;
alter table candidate_experiences enable row level security;

-- Catálogo: lectura para cualquier autenticado; escritura solo service_role (endpoint).
create policy "skills_read" on skills
  for select to authenticated using (true);

-- candidate_skills / experiences: miembros de la empresa del candidato
-- (vía application → job → company_members, igual que candidates en 0014).
create policy "candidate_skills_member_read" on candidate_skills
  for select to authenticated
  using (
    exists (
      select 1 from applications a
      inner join jobs j on j.id = a.job_id
      inner join company_members cm on cm.company_id = j.company_id
      where a.candidate_id = candidate_skills.candidate_id and cm.user_id = auth.uid()
    )
  );

create policy "candidate_experiences_member_read" on candidate_experiences
  for select to authenticated
  using (
    exists (
      select 1 from applications a
      inner join jobs j on j.id = a.job_id
      inner join company_members cm on cm.company_id = j.company_id
      where a.candidate_id = candidate_experiences.candidate_id and cm.user_id = auth.uid()
    )
  );
-- Escrituras: vía service_role desde el endpoint /cv-profile (verifica empresa antes).

-- ── Semilla del catálogo (starter set; el endpoint añade nuevas al confirmar) ─
insert into skills (name, category, aliases) values
  ('JavaScript','language','{"js"}'),
  ('TypeScript','language','{"ts"}'),
  ('Python','language','{}'),
  ('Java','language','{}'),
  ('Go','language','{"golang"}'),
  ('SQL','language','{}'),
  ('React','framework','{"reactjs","react.js"}'),
  ('Next.js','framework','{"nextjs","next"}'),
  ('Vue','framework','{"vuejs","vue.js"}'),
  ('Angular','framework','{}'),
  ('Node.js','framework','{"node","nodejs"}'),
  ('Django','framework','{}'),
  ('Spring','framework','{"spring boot"}'),
  ('Docker','tool','{}'),
  ('Kubernetes','tool','{"k8s"}'),
  ('Git','tool','{}'),
  ('AWS','tool','{"amazon web services"}'),
  ('PostgreSQL','tool','{"postgres","psql"}'),
  ('Figma','tool','{}'),
  ('Excel','tool','{}'),
  ('Liderazgo','soft','{"leadership"}'),
  ('Comunicación','soft','{"communication"}'),
  ('Trabajo en equipo','soft','{"teamwork"}'),
  ('Gestión de proyectos','domain','{"project management","gestion de proyectos"}'),
  ('Reclutamiento','domain','{"recruiting","recruitment"}'),
  ('Ventas','domain','{"sales"}'),
  ('Marketing','domain','{}'),
  ('Atención al cliente','domain','{"customer success","customer support"}')
on conflict do nothing;
