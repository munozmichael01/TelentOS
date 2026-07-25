-- `skills` es dato de referencia PÚBLICO (taxonomía ESCO, sin company_id), igual que
-- job_titles / job_title_translations / skill_translations, que ya son anon-readable. La
-- policy previa lo limitaba a `authenticated`, lo que rompía el hub SSR anónimo (los
-- requisitos del cargo en las FAQ salían vacíos porque el embed skills(...) lo bloqueaba
-- la RLS). Se abre lectura a anon, alineado con el resto de la taxonomía. Solo lectura.
drop policy if exists skills_read on public.skills;
create policy skills_read on public.skills for select to anon, authenticated using (true);
