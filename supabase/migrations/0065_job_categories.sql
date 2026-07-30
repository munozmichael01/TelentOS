-- ÁREAS de la taxonomía como tabla relacional. Hasta ahora el concepto vivía triplicado en
-- columnas de texto SIN FK dentro de job_titles (`category` 8 valores · `sector` 9 ·
-- `category_key` 12) y las 22 áreas reales solo existían en data/taxonomy/categories.json, que
-- la BBDD no conocía: 305 de 506 cargos no tenían `category_key`. Con esto se puede curar la
-- taxonomía POR ÁREA ("qué áreas trabajamos y cuántos cargos tiene cada una"), que es el orden
-- correcto, en vez de por términos de búsqueda inventados en un script.
--
-- La fuente sigue siendo `data/taxonomy/categories.json` (versionado en repo, y el board lo lee
-- en cliente sin consultar la BBDD, decisión deliberada). Esta tabla es el ancla relacional;
-- `scripts/seed-job-categories.mjs` la mantiene en sync.
create table if not exists job_categories (
  key text primary key,
  name_es text not null,
  name_en text not null,
  name_pt text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Dato de referencia público (mismo criterio que job_titles / skills): lectura para todos,
-- escritura solo con service role. No lleva company_id: no es dato de empresa.
alter table job_categories enable row level security;
drop policy if exists job_categories_read on job_categories;
create policy job_categories_read on job_categories for select to anon, authenticated using (true);

insert into job_categories (key, name_es, name_en, name_pt) values
  ('software_engineering', 'Ingeniería de software', 'Software engineering', 'Engenharia de software'),
  ('data_ai_analytics', 'Datos, IA y analítica', 'Data, AI and analytics', 'Dados, IA e analítica'),
  ('product_design', 'Producto, UX y diseño digital', 'Product, UX and digital design', 'Produto, UX e design digital'),
  ('it_ops_security', 'Infraestructura, IT y ciberseguridad', 'Infrastructure, IT and cybersecurity', 'Infraestrutura, TI e cibersegurança'),
  ('electrical_electronics', 'Eléctrica y electrónica', 'Electrical and electronics', 'Elétrica e eletrônica'),
  ('mechanical_automotive', 'Mecánica, automotriz y maquinaria', 'Mechanical, automotive and machinery', 'Mecânica, automotiva e maquinaria'),
  ('construction_facilities', 'Construcción, instalaciones y facilities', 'Construction, facilities and real estate operations', 'Construção, instalações e facilities'),
  ('engineering_maintenance', 'Ingeniería y mantenimiento', 'Engineering and maintenance', 'Engenharia e manutenção'),
  ('manufacturing_operations', 'Manufactura y operaciones industriales', 'Manufacturing and industrial operations', 'Manufatura e operações industriais'),
  ('logistics_supply_chain', 'Logística, almacén y supply chain', 'Logistics, warehouse and supply chain', 'Logística, armazém e cadeia de suprimentos'),
  ('energy_utilities', 'Energía, petróleo y utilities', 'Energy, oil and utilities', 'Energia, petróleo e utilities'),
  ('retail_store', 'Retail y tienda', 'Retail and store operations', 'Retalho e loja'),
  ('hospitality_food', 'Hospitalidad, turismo y alimentos', 'Hospitality, tourism and food', 'Hospitalidade, turismo e alimentação'),
  ('sales_business_dev', 'Ventas y desarrollo comercial', 'Sales and business development', 'Vendas e desenvolvimento comercial'),
  ('customer_support', 'Atención al cliente y contact center', 'Customer support and contact center', 'Atendimento ao cliente e contact center'),
  ('marketing_content', 'Marketing, growth y contenido', 'Marketing, growth and content', 'Marketing, growth e conteúdo'),
  ('communications_pr', 'Comunicaciones, medios y PR', 'Communications, media and PR', 'Comunicação, mídia e RP'),
  ('finance_accounting', 'Finanzas, contabilidad y auditoría', 'Finance, accounting and audit', 'Finanças, contabilidade e auditoria'),
  ('banking_insurance', 'Banca, seguros e inversiones', 'Banking, insurance and investments', 'Banco, seguros e investimentos'),
  ('hr_recruiting', 'People, RRHH y recruiting', 'People, HR and recruiting', 'People, RH e recrutamento'),
  ('learning_education', 'Formación, educación y academia', 'Training, education and academia', 'Formação, educação e academia'),
  ('office_admin', 'Administración y back office', 'Administration and back office', 'Administração e back office')
on conflict (key) do update set
  name_es = excluded.name_es, name_en = excluded.name_en, name_pt = excluded.name_pt;

-- Backfill de los cargos huérfanos mapeando el `sector` legado → área. El mapeo es GRUESO por
-- naturaleza (un sector agrupa varias áreas: `tech_saas` incluye software, datos, producto e
-- IT), así que deja el área correcta a nivel de sector y queda pendiente un repaso fino por
-- cargo. Mejor eso que 305 cargos sin área.
update job_titles set category_key = case sector
    when 'tech_saas'          then 'software_engineering'
    when 'industrial_energy'  then 'manufacturing_operations'
    when 'admin_office'       then 'office_admin'
    when 'retail_hospitality' then 'retail_store'
    when 'marketing_growth'   then 'marketing_content'
    when 'sales_customer'     then 'sales_business_dev'
    when 'people_hr'          then 'hr_recruiting'
    when 'finance_accounting' then 'finance_accounting'
    when 'hospitality_food'   then 'hospitality_food'
  end
where category_key is null and sector is not null;

-- FK al catálogo de áreas. Nullable a propósito: un cargo puede quedar sin clasificar y debe
-- verse en la consulta de cobertura, no romper la inserción.
alter table job_titles drop constraint if exists job_titles_category_key_fkey;
alter table job_titles
  add constraint job_titles_category_key_fkey
  foreign key (category_key) references job_categories (key) on update cascade on delete set null;

create index if not exists job_titles_category_key_idx on job_titles (category_key);

comment on column job_titles.sector is
  'LEGADO: vocabulario grueso del builder de ESCO. Sustituido por category_key → job_categories. No usar en código nuevo.';
comment on column job_titles.category is
  'LEGADO: etiqueta humana del sector. Sustituido por job_categories.name_*. No usar en código nuevo.';
