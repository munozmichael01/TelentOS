-- ─────────────────────────────────────────────────────────────────────────────
-- 0015_rls_hardening.sql
-- Correcciones post-auditoría Codex sobre 0014:
--  1. Eliminar anon INSERT en candidates/applications (va por service_role)
--  2. Reemplazar companies_authenticated_all por membership real
--  3. Reparar career_site_events (usaba companies, no company_members)
--  4. agent_runs: eliminar global read (no tiene company_id, solo service_role)
--  5. Storage: reemplazar authenticated_storage_all por políticas acotadas
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. candidates — eliminar anon INSERT (0014 lo abrió por error) ───────────
-- /api/careers/apply usa createAdminClient (service_role), no necesita RLS anon.
drop policy if exists "candidates_anon_insert" on candidates;

-- ── 2. applications — eliminar anon INSERT ───────────────────────────────────
drop policy if exists "applications_anon_insert" on applications;

-- ── 3. companies — reemplazar authenticated_all por membership real ───────────
-- La policy original del bulk-loop de 0001 deja companies completamente abierta
-- a cualquier usuario autenticado.
drop policy if exists "companies_authenticated_all" on companies;

-- SELECT: solo miembros de esa empresa (user → company_members → companies)
create policy "companies_member_select" on companies
  for select to authenticated
  using (
    exists (
      select 1 from company_members cm
      where cm.user_id = auth.uid() and cm.company_id = companies.id
    )
  );

-- UPDATE: solo owner/hr_admin de esa empresa (settings de empresa)
create policy "companies_member_update" on companies
  for update to authenticated
  using (
    exists (
      select 1 from company_members cm
      where cm.user_id = auth.uid()
        and cm.company_id = companies.id
        and cm.role in ('owner', 'hr_admin')
    )
  )
  with check (
    exists (
      select 1 from company_members cm
      where cm.user_id = auth.uid()
        and cm.company_id = companies.id
        and cm.role in ('owner', 'hr_admin')
    )
  );
-- INSERT: solo service_role (creación de workspace en signup — no hay policy aquí)
-- anon SELECT (career site) ya existe: companies_anon_read

-- ── 4. career_site_events — reparar policy con company_members ───────────────
-- La policy de 0006 usaba `company_id IN (SELECT id FROM companies)`, lo que
-- equivale a un `using (true)` si companies tiene RLS con using(true).
drop policy if exists "auth_read_events" on career_site_events;

create policy "career_site_events_member_read" on career_site_events
  for select to authenticated
  using (
    exists (
      select 1 from company_members cm
      where cm.user_id = auth.uid() and cm.company_id = career_site_events.company_id
    )
  );
-- INSERT: /api/career-site/track usa createAdminClient (service_role), no hay
-- policy anon. Si algún día se quiere tracking de anon sin API, se añade aquí.

-- ── 5. agent_runs — eliminar global read ─────────────────────────────────────
-- agent_runs no tiene company_id; puede contener input/output de agentes sensibles.
-- Solo service_role (escritura desde rutas de agente, sin exposición a UI pública).
drop policy if exists "agent_runs_authenticated_all" on agent_runs;
drop policy if exists "agent_runs_member_read" on agent_runs;
-- No se crea política autenticada: el acceso directo es solo service_role.

-- ── 6. Storage — reemplazar authenticated_storage_all por políticas acotadas ─
-- La policy original daba SELECT/INSERT/UPDATE/DELETE sobre logos, cvs, documents
-- a cualquier usuario autenticado — sin verificar que el objeto pertenece a su empresa.
drop policy if exists "authenticated_storage_all" on storage.objects;

-- logos (bucket público): authenticated puede subir/actualizar su logo.
-- El bucket es público para lectura (policy logos_public_read ya existe en 0001).
create policy "logos_member_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'logos');

create policy "logos_member_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'logos')
  with check (bucket_id = 'logos');

create policy "logos_member_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'logos');

-- documents (bucket privado): authenticated puede insertar (upload via API route).
-- Las lecturas son exclusivamente vía signed URL (service_role en /api/files/sign).
create policy "documents_member_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documents');

-- cvs (bucket privado): subida de CVs es siempre via /api/careers/apply con
-- createAdminClient (service_role) → no necesita policy autenticada ni anon.
-- Lecturas son exclusivamente vía signed URL.
-- No se crean policies para cvs.
