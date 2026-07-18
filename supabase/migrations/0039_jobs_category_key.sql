-- 0039_jobs_category_key.sql — categoría CANÓNICA de la oferta (de las 22 categorías del
-- board, data/taxonomy/categories.json). El `category` free-text se mantiene para display
-- legacy; el board filtra/hubea por `category_key`. Nuevas ofertas lo fijan desde el form
-- de publicación (dropdown canónico); las existentes se backfillean best-effort abajo.

alter table jobs add column if not exists category_key text;
create index if not exists jobs_category_key_idx on jobs(category_key) where category_key is not null;

-- Backfill best-effort del free-text demo → key canónica (lo ambiguo queda null; el fix
-- real es capturarlo estructurado al crear la oferta).
update jobs set category_key = case
  when category ilike '%software%' or category ilike '%backend%' or category ilike '%frontend%' or category ilike '%developer%' or category ilike '%engineering%' then 'software_engineering'
  when category ilike '%data%' or category ilike '%dato%' or category ilike '%analyt%' or category ilike '%analista de dato%' then 'data_ai_analytics'
  when category ilike '%product%' or category ilike '%producto%' or category ilike '%dise%' or category ilike '%ux%' then 'product_design'
  when category ilike '%marketing%' or category ilike '%growth%' or category ilike '%content%' then 'marketing_content'
  when category ilike '%comercial%' or category ilike '%sales%' or category ilike '%ventas%' then 'sales_business_dev'
  when category ilike '%mantenimiento%' or category ilike '%maintenance%' then 'engineering_maintenance'
  when category ilike '%logist%' or category ilike '%supply%' or category ilike '%almac%' or category ilike '%suprim%' then 'logistics_supply_chain'
  when category ilike '%finanz%' or category ilike '%finance%' or category ilike '%contab%' or category ilike '%account%' then 'finance_accounting'
  when category ilike '%rrhh%' or category ilike '%recruit%' or category ilike '%people%' or category ilike '%hr%' then 'hr_recruiting'
  when category ilike '%soporte%' or category ilike '%support%' or category ilike '%atención%' then 'customer_support'
  when category ilike '%energ%' or category ilike '%petrol%' or category ilike '%utilit%' then 'energy_utilities'
  else null
end
where category is not null and category_key is null;
