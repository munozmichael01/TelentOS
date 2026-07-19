-- 0041_candidate_education_level.sql
-- Nivel educativo normalizado para matching/filtro. El cv-parser ya extrae la
-- formación (candidate_education); ahora deriva también el NIVEL canónico por
-- entrada, y guardamos el nivel MÁS ALTO del candidato en candidates.education_level
-- (lo que consume el fit de dos lados, que hoy lo recibía vacío desde el board).
-- Enum alineado con EducationLevel (lib/types.ts) y con jobs.education_level (0037).

alter table candidates
  add column if not exists education_level text
    check (education_level is null or education_level in
      ('none','secondary','vocational','bachelor','master','phd'));

alter table candidate_education
  add column if not exists level text
    check (level is null or level in
      ('none','secondary','vocational','bachelor','master','phd'));
