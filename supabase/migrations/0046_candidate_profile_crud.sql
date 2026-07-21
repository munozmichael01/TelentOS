-- Mi cuenta (job board): edición CRUD del perfil del candidato.
-- El perfil global (candidate_profiles) ya guardaba education/languages (jsonb) sembrados
-- del CV-parser; añadimos experiencias y enlaces editables + avatar. La UI de Mi cuenta
-- edita estos arrays (add/edit/remove) y persisten aquí, sin depender de re-parsear el CV.

alter table candidate_profiles add column if not exists experiences jsonb not null default '[]';
alter table candidate_profiles add column if not exists links jsonb not null default '[]';
alter table candidate_profiles add column if not exists avatar_url text;

comment on column candidate_profiles.experiences is 'Experiencia laboral editable: [{title, company, seniority, start_date, end_date, is_current}]';
comment on column candidate_profiles.links is 'Enlaces del candidato: [{type: portfolio|linkedin|website|github|behance, url, label?}]';
comment on column candidate_profiles.avatar_url is 'Foto de perfil (bucket avatars, público)';
