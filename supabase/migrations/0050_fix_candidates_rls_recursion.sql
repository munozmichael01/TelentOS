-- Rompe la recursión RLS candidates↔applications (bug latente desde 0037): la política
-- candidates_tenant lee applications, y applications_candidate_read leía candidates en su
-- USING → recursión. Postgres la detecta y la query falla → la página de Candidatos del
-- dashboard devolvía 0 para CUALQUIER empresa con candidaturas del board.
-- Una función SECURITY DEFINER lee candidates sin disparar su RLS → se corta el ciclo.
create or replace function my_candidate_ids() returns setof uuid
  language sql stable security definer set search_path = public as $$
  select id from candidates where user_id = auth.uid()
$$;
revoke execute on function my_candidate_ids() from public;
grant execute on function my_candidate_ids() to authenticated;

alter policy applications_candidate_read on applications
  using (candidate_id in (select my_candidate_ids()));
