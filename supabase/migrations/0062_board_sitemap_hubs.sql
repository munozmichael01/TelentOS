-- Enumera los hubs con ≥1 oferta ACTIVA para el sitemap (solo indexables). Single-dimension
-- (categoría, cargo, ciudad, país) + top combos (cat×ciudad, cargo×ciudad) acotados por crawl
-- budget. `a` para cargo = traducción del locale (para el slug); category/city/country se
-- resuelven en TS. `updated` = oferta más reciente del hub (lastmod). El sitemap (app/sitemap.ts)
-- valida además cada slug contra el resolver real y descarta los que no resuelven a 200.
create or replace function public.board_sitemap_hubs(
  p_locale text default 'es',
  p_combo_limit int default 400
) returns table(kind text, a text, b text, cnt bigint, updated timestamptz)
language sql stable as $$
  with active as (
    select id, category_key, job_title_id, city, country_code, created_at
    from jobs where status = 'active'
  )
  select 'category'::text, category_key, null::text, count(*), max(created_at)
  from active where category_key is not null group by category_key
  union all
  select 'jobtitle'::text, coalesce(tr.name, t.canonical_name), null::text, count(*), max(a.created_at)
  from active a join job_titles t on t.id = a.job_title_id
  left join job_title_translations tr on tr.job_title_id = t.id and tr.locale = p_locale
  where a.job_title_id is not null group by coalesce(tr.name, t.canonical_name)
  union all
  select 'city'::text, city, null::text, count(*), max(created_at)
  from active where city is not null and city <> '' group by city
  union all
  select 'country'::text, country_code, null::text, count(*), max(created_at)
  from active where country_code is not null group by country_code
  union all
  select * from (
    select 'cat_city'::text, category_key, city, count(*), max(created_at)
    from active where category_key is not null and city is not null and city <> ''
    group by category_key, city order by count(*) desc limit p_combo_limit
  ) cc
  union all
  select * from (
    select 'jt_city'::text, coalesce(tr.name, t.canonical_name), a.city, count(*), max(a.created_at)
    from active a join job_titles t on t.id = a.job_title_id
    left join job_title_translations tr on tr.job_title_id = t.id and tr.locale = p_locale
    where a.job_title_id is not null and a.city is not null and a.city <> ''
    group by coalesce(tr.name, t.canonical_name), a.city order by count(*) desc limit p_combo_limit
  ) jc;
$$;

grant execute on function public.board_sitemap_hubs(text, int) to anon, authenticated;
