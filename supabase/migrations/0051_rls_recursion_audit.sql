-- Auditoría RLS de ciclos de recursión (a raíz del fix 0050 candidates↔applications).
-- Objetivo: verificar que NINGUNA otra política forma un ciclo "A referencia B cuya
-- política referencia A" que Postgres rechace con 42P17.
--
-- Hallazgo (auditoría 2026-07-22, ejecutada bajo sesión de empresa simulada barriendo las
-- 21 tablas con datos de tenant): el único ciclo real era candidates↔applications, ya roto
-- por my_candidate_ids() en 0050. El resto de políticas con subconsulta cruzada resuelven
-- por caminos ACÍCLICOS:
--   · *_tenant (applications, campaigns, job_stages, job_skills, screening_questions,
--     distribution_plans) → jobs → auth_company_ids() [SECURITY DEFINER, no vuelve]. Sin ciclo.
--   · company_members_admin_{update,delete} → company_members (auto-referencia): su USING es de
--     UPDATE/DELETE y la subconsulta interna usa la política de SELECT de company_members, que
--     es plana (user_id = auth.uid(), sin subconsulta). Sin ciclo.
--   · candidate_profile_skills → candidate_profiles (user_id plano). Sin ciclo.
--
-- Esta migración no cambia políticas; deja una función de auto-diagnóstico para poder
-- re-auditar en el futuro (y como red de la prueba de regresión lib/__tests__/rls-recursion.test.ts).
-- SECURITY INVOKER (por defecto): corre con los privilegios del que llama, así que la RLS del
-- caller aplica y un ciclo se manifestaría como 42P17 al ejecutarla.

create or replace function rls_recursion_selftest()
  returns text language plpgsql stable as $$
declare t text;
begin
  foreach t in array array[
    'candidates','applications','candidate_education','candidate_experiences',
    'candidate_languages','candidate_skills','candidate_profiles','job_stages',
    'screening_questions','application_events','saved_jobs'
  ] loop
    execute format('select 1 from %I limit 1', t);
  end loop;
  return 'ok';
exception when others then
  raise exception 'RLS selftest falló en el barrido: % (%).', SQLERRM, SQLSTATE;
end $$;

comment on function rls_recursion_selftest() is
  'Barre las tablas de tenant bajo la RLS del caller; lanza si alguna recursiona (42P17). Ver migr. 0050/0051.';
