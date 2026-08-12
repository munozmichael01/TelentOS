-- Cierra el bucket `cvs`: hoy cualquier usuario autenticado puede leer, sobrescribir y BORRAR
-- el CV de cualquier candidato de la plataforma.
--
-- La causa es `legacy_buckets_authenticated`, una política `for all` sobre `logos` y `cvs` cuya
-- única condición es el nombre del bucket. Con una cuenta de candidato —que cualquiera se crea
-- desde el board— se llega por la API de Storage a los CV de todos los demás. Son datos
-- personales de terceros, no de la empresa: es el hallazgo más grave del repaso de seguridad.
--
-- La política no hace falta para nada. Todos los caminos del servidor que tocan `cvs`
-- (`careers/apply`, `careers/parse-cv`, `board/cv`, `files/sign`) usan el cliente admin, que va
-- con service_role y se salta la RLS; y no hay ninguna subida desde el navegador. Así que el
-- bucket se queda SIN políticas: nadie entra por Storage directamente, y el acceso legítimo
-- sigue siendo el de siempre — el servidor comprueba la propiedad y emite una signed URL corta.
--
-- Nota: `files/sign` firmaba con la sesión del usuario y por eso dependía de esta política.
-- Pasa a firmar con el cliente admin (la autorización ya la hizo antes, en código).
drop policy if exists legacy_buckets_authenticated on storage.objects;

-- `logos` compartía la misma política y sí necesita escritura: el formulario de empresa sube el
-- logo desde el navegador con la sesión del usuario. Se le deja SOLO insertar. Nada en el código
-- actualiza ni borra logos —cada subida crea una ruta nueva— así que UPDATE y DELETE se van.
-- La lectura ya la cubre `logos_public_read` (el bucket es público).
--
-- Pendiente, anotado en docs/deuda-tecnica.md: la ruta del logo es plana
-- (`logo-{timestamp}-{nombre}`), sin carpeta de empresa, así que no se puede acotar por tenant
-- sin cambiar el formato de subida. Con INSERT como único permiso el daño posible es subir
-- ficheros de más, no pisar los de otra empresa.
create policy logos_authenticated_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'logos');
