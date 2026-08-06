-- El bucket `documents` estaba abierto a cualquier autenticado: leer, sustituir y borrar el
-- contrato de cualquiera. Arreglar solo la tabla `employee_documents` no bastaba, porque el
-- fichero vive aquí y `authenticated_storage_all` permitía saltarse la API por completo.
--
-- La primera carpeta del path es el employee_id (ver `app/api/employees/[id]/documents`), así que
-- se reutiliza la misma regla que en la tabla: la propia, la del equipo, o la empresa si RR.HH.
-- Borrar es solo de RR.HH.: el contrato firmado no es del empleado para hacerlo desaparecer.
drop policy if exists authenticated_storage_all on storage.objects;

create policy documents_own_read on storage.objects for select to authenticated
  using (
    bucket_id = 'documents'
    and (
      ((storage.foldername(name))[1])::uuid in (select my_employee_ids())
      or ((storage.foldername(name))[1])::uuid in (select my_team_employee_ids())
      or (current_role_name() = any (array['owner','hr_admin'])
          and ((storage.foldername(name))[1])::uuid in
              (select e.id from employees e where e.company_id in (select auth_company_ids())))
    )
  );

create policy documents_own_write on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documents'
    and (
      ((storage.foldername(name))[1])::uuid in (select my_employee_ids())
      or (current_role_name() = any (array['owner','hr_admin'])
          and ((storage.foldername(name))[1])::uuid in
              (select e.id from employees e where e.company_id in (select auth_company_ids())))
    )
  );

create policy documents_hr_manage on storage.objects for delete to authenticated
  using (
    bucket_id = 'documents'
    and current_role_name() = any (array['owner','hr_admin'])
    and ((storage.foldername(name))[1])::uuid in
        (select e.id from employees e where e.company_id in (select auth_company_ids()))
  );

-- `logos` y `cvs` conservan de momento el acceso de cualquier autenticado que ya tenían dentro de
-- `authenticated_storage_all`: el flujo de candidatura escribe en `cvs` con la sesión del propio
-- candidato, y acotarlo sin revisar ese camino entero rompería las inscripciones. Anotado como
-- pendiente de alta prioridad en docs/deuda-tecnica.md — hoy un candidato autenticado puede leer
-- cualquier CV del sistema.
create policy legacy_buckets_authenticated on storage.objects for all to authenticated
  using (bucket_id = any (array['logos','cvs']))
  with check (bucket_id = any (array['logos','cvs']));
