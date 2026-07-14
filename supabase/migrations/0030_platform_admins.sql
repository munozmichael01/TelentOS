-- Platform Console §9.1 — rol de super-admin de plataforma.
-- TRASCIENDE el scoping por empresa: es la ÚNICA autorización para leer datos
-- cross-tenant (gasto de IA agregado, KPIs globales, taxonomías). No es un
-- company_member con más permisos — es una pared distinta a requireApiRole.
-- Tabla explícita y pequeña; el guard (lib/platform/auth.ts) la consulta con
-- service_role.

create table if not exists platform_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  note       text,
  created_at timestamptz not null default now()
);

-- RLS: nadie enumera ni lee esta tabla vía sesión de usuario. El guard usa
-- service_role (bypassa RLS). Sin políticas permisivas = deny-all para anon/auth,
-- así ni un owner puede descubrir quién es platform_admin.
alter table platform_admins enable row level security;
