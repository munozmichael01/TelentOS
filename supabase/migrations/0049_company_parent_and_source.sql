-- Multi-empresa por cuenta: una empresa puede ser MATRIZ de otras (sucursales, marcas,
-- o —como Turijobs— anunciantes importados de un feed). `parent_company_id` enlaza la hija
-- con su matriz; `source` marca el origen (native | import_turijobs | …) para poder filtrar
-- y borrar lotes importados sin tocar los tenants reales.
alter table companies
  add column if not exists parent_company_id uuid references companies(id) on delete cascade,
  add column if not exists source text not null default 'native';
create index if not exists companies_parent_company_id_idx on companies (parent_company_id);
