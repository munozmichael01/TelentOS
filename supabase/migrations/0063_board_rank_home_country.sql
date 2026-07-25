-- Boost de país del mercado (local-first) SIN filtrar: el board y el asistente priorizan las
-- ofertas del país del mercado pero SIGUEN mostrando el resto (job board internacional). Es un
-- DESEMPATE tras la relevancia (relevancia manda, país desempata); distinto de p_country (filtro
-- duro de los hubs de país). `home_local` usa coalesce(...,false) porque `country_code = X` con
-- country_code NULL da NULL, y `ORDER BY ... DESC` en Postgres es NULLS FIRST → sin el coalesce
-- las ofertas sin país saldrían primero (al revés). Reemplaza los overloads de 0056–0059.
drop function if exists public.board_rank_jobs(text,text[],text,text[],text[],text[],uuid[],integer,timestamptz,uuid[],uuid[],real[],uuid[],text,integer,integer);
drop function if exists public.board_rank_jobs(text,text[],text,text[],text[],text[],uuid[],integer,timestamptz,uuid[],uuid[],real[],uuid[],text,integer,integer,text);

create or replace function public.board_rank_jobs(
  p_q text, p_tokens text[], p_location text, p_category_keys text[], p_modalities text[],
  p_contracts text[], p_company_ids uuid[], p_salary_min integer, p_date_from timestamptz,
  p_title_ids uuid[], p_related_ids uuid[], p_related_w real[], p_applied uuid[], p_sort text,
  p_limit integer, p_offset integer, p_country text default null, p_home_country text default null
) returns table(id uuid, total bigint)
language sql stable as $$
  with base as (
    select j.id, j.job_title_id, j.created_at, j.salary_month_max, j.title, j.description, j.country_code
    from jobs j
    where j.status = 'active'
      and (
        (p_q is null and p_tokens is null and p_title_ids is null)
        or (p_q is not null and (j.title ilike '%'||p_q||'%' or j.description ilike '%'||p_q||'%'))
        or (p_tokens is not null and exists (select 1 from unnest(p_tokens) t where j.title ilike '%'||t||'%' or j.description ilike '%'||t||'%'))
        or (p_title_ids is not null and j.job_title_id = any(p_title_ids))
      )
      and (p_location is null or j.city ilike '%'||p_location||'%' or j.location ilike '%'||p_location||'%')
      and (p_country is null or j.country_code = p_country)
      and (p_category_keys is null or j.category_key = any(p_category_keys))
      and (p_modalities is null or j.modality = any(p_modalities))
      and (p_contracts is null or j.employment_type = any(p_contracts))
      and (p_company_ids is null or j.company_id = any(p_company_ids))
      and (p_salary_min is null or j.salary_month_max >= p_salary_min)
      and (p_date_from is null or j.created_at >= p_date_from)
  ),
  scored as (
    select b.id, b.created_at, b.salary_month_max,
      case
        when p_title_ids is not null and b.job_title_id = any(p_title_ids) then 1000
        when p_related_ids is not null and b.job_title_id = any(p_related_ids)
          then 500 + coalesce(p_related_w[array_position(p_related_ids, b.job_title_id)] * 100, 0)
        when p_q is not null and (b.title ilike '%'||p_q||'%' or b.description ilike '%'||p_q||'%') then 100
        else 0
      end as rel,
      (p_applied is not null and b.id = any(p_applied)) as applied,
      coalesce(p_home_country is not null and b.country_code = p_home_country, false) as home_local
    from base b
  )
  select s.id, count(*) over() as total
  from scored s
  order by s.applied asc,
    case when p_sort = 'salary' then null else s.rel end desc nulls last,
    case when p_sort = 'salary' then s.salary_month_max end desc nulls last,
    s.home_local desc,
    s.created_at desc
  limit p_limit offset p_offset;
$$;

grant execute on function public.board_rank_jobs(text,text[],text,text[],text[],text[],uuid[],integer,timestamptz,uuid[],uuid[],real[],uuid[],text,integer,integer,text,text) to anon, authenticated;
