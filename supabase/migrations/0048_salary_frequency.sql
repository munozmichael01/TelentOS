-- Frecuencia del salario + normalización a mensual para ordenar/filtrar sin sesgo por
-- periodo. Un "10 €/hora" no debe quedar por debajo de un "1.000 €/mes" al ordenar por
-- salario. Las columnas normalizadas son GENERADAS y ALMACENADAS (deterministas) e
-- indexadas: el ORDER BY / filtro las usan sin coste. El DISPLAY sigue mostrando el
-- monto y el periodo originales (nunca el normalizado).
alter table jobs
  add column if not exists salary_period text not null default 'month'
    check (salary_period in ('hour','day','week','month','year'));

-- Equivalente mensual (solo para comparar/ordenar). Constantes fijas y documentadas:
-- 160 h/mes, 22 d/mes, 4,33 sem/mes; año/12. mes = tal cual.
alter table jobs
  add column if not exists salary_month_min integer
    generated always as (
      case salary_period
        when 'hour' then salary_min * 160
        when 'day'  then salary_min * 22
        when 'week' then (salary_min * 13) / 3
        when 'year' then salary_min / 12
        else salary_min
      end
    ) stored;

alter table jobs
  add column if not exists salary_month_max integer
    generated always as (
      case salary_period
        when 'hour' then salary_max * 160
        when 'day'  then salary_max * 22
        when 'week' then (salary_max * 13) / 3
        when 'year' then salary_max / 12
        else salary_max
      end
    ) stored;

create index if not exists jobs_salary_month_max_idx on jobs (salary_month_max desc nulls last);
