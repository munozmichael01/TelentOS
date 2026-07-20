-- 0045_company_meta_and_notif_prefs.sql
-- Empresa: campos estructurados que el career site (pagado) mostrará: industria, tamaño
-- de plantilla, verificado. (La página de empresa del board sigue básica.)
-- Candidato: preferencias de notificación + visibilidad del perfil (el sheet de Ajustes
-- las mostraba como estado local; ahora persisten).

alter table companies
  add column if not exists industry     text,
  add column if not exists company_size text,   -- '1-10','11-50','51-200','201-1000','1000+'
  add column if not exists verified      boolean not null default false;

alter table candidate_profiles
  add column if not exists notify_email   boolean not null default true,
  add column if not exists notify_push    boolean not null default true,
  add column if not exists notify_digest  boolean not null default false,
  add column if not exists profile_visible boolean not null default true;
