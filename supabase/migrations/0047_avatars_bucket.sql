-- Bucket público para las fotos de perfil del candidato (Mi cuenta → avatar).
-- La subida ocurre server-side con service_role (endpoint /api/board/avatar), por lo que
-- no hacen falta políticas de escritura para anon; lectura pública por bucket público.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;
