-- Agregados scopeados al hub (SEO/AEO): top empresas, áreas y puestos por nº de ofertas
-- ACTIVAS. Replica EXACTAMENTE el `base` WHERE de board_rank_jobs (versión con país) para
-- que los tops reconcilien con el conteo del hub. Los hubs solo usan title_ids/category_keys/
-- location/country (sin q/tokens/modality/…), así que basta con esos 4 filtros.
create or replace function public.board_hub_facets(
  p_title_ids uuid[] default null,
  p_category_keys text[] default null,
  p_location text default null,
  p_country text default null,
  p_limit int default 10,
  p_locale text default 'es'
) returns table(kind text, key text, label text, cnt bigint)
language sql stable as $$
  with base as (
    select j.id, j.company_id, j.category_key, j.job_title_id
    from jobs j
    where j.status = 'active'
      and (p_title_ids is null or j.job_title_id = any(p_title_ids))
      and (p_location is null or j.city ilike '%'||p_location||'%' or j.location ilike '%'||p_location||'%')
      and (p_country is null or j.country_code = p_country)
      and (p_category_keys is null or j.category_key = any(p_category_keys))
  ),
  comp as (
    select 'company'::text as kind, c.id::text as key, c.name as label, count(*) as cnt
    from base b join companies c on c.id = b.company_id
    group by c.id, c.name order by cnt desc, c.name asc limit p_limit
  ),
  cat as (
    select 'category'::text as kind, b.category_key as key, b.category_key as label, count(*) as cnt
    from base b where b.category_key is not null
    group by b.category_key order by cnt desc limit p_limit
  ),
  jt as (
    select 'jobtitle'::text as kind, b.job_title_id::text as key,
           coalesce(tr.name, t.canonical_name) as label, count(*) as cnt
    from base b
    join job_titles t on t.id = b.job_title_id
    left join job_title_translations tr on tr.job_title_id = t.id and tr.locale = p_locale
    where b.job_title_id is not null
    group by b.job_title_id, coalesce(tr.name, t.canonical_name) order by cnt desc limit p_limit
  )
  select * from comp union all select * from cat union all select * from jt;
$$;

grant execute on function public.board_hub_facets(uuid[], text[], text, text, int, text) to anon, authenticated;
