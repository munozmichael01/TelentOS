-- 0042_candidate_activation_email.sql
-- Marca de cuándo se envió el email de recuperación de cuenta al candidato invitado.
-- El barrido diario (Vercel Cron) lo usa para no reenviar: solo contacta a invitados
-- (user_id null) que aplicaron y aún no tienen cuenta ni han sido contactados.

alter table candidates
  add column if not exists activation_email_sent_at timestamptz;
