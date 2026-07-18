-- 0038_board_public_read_authenticated.sql
-- El job board es una superficie PÚBLICA: ofertas activas + datos de empresa (nombre,
-- logo) legibles por cualquiera. Hoy esa lectura solo la tiene `anon`; un candidato
-- LOGUEADO (no es company member) no matchea esas policies y vería cero ofertas —
-- rompe el asistente del board, las guardadas y las alertas (que hacen join a jobs).
--
-- Extiende las mismas policies de lectura a `authenticated`. NO amplía la exposición:
-- anon ya lee estas filas (companies con using(true), jobs activos, screening de
-- ofertas activas); un usuario logueado es estrictamente más privilegiado que anon.
-- El aislamiento por empresa de datos NO públicos (candidaturas, payroll, etc.) no se
-- toca.

-- jobs activos: anon + authenticated
drop policy if exists jobs_anon_read_active on jobs;
create policy jobs_public_read_active on jobs for select to anon, authenticated
  using (status = 'active');

-- companies (superficie pública del career site / board): anon + authenticated.
-- La policy companies_tenant (ALL para el propio company_id) se mantiene para escritura.
drop policy if exists companies_anon_read on companies;
create policy companies_public_read on companies for select to anon, authenticated
  using (true);

-- screening_questions de ofertas activas: anon + authenticated (el candidato logueado
-- las ve al aplicar).
drop policy if exists screening_questions_anon_read on screening_questions;
create policy screening_questions_public_read on screening_questions for select to anon, authenticated
  using (job_id in (select id from jobs where status = 'active'));
