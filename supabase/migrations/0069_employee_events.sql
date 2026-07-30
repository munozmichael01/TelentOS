-- EXPEDIENTE del empleado: historial append-only de lo que le pasa a una persona en la empresa.
--
-- Es el punto 10 del alcance de Desempeño ("historial de evaluaciones y decisiones") y tiene que
-- existir desde el bloque 1: si no se registra cuando ocurre, después no se reconstruye.
-- Aquí aterrizan ciclos de evaluación, resultados, ajustes de calibración, planes de desarrollo
-- y de mejora, promociones y cambios de nivel.
--
-- Espeja el patrón ya probado de `application_events` (el timeline del candidato): tipo + actor
-- + payload, sin updates. La diferencia es `payload jsonb`: los eventos de desempeño llevan
-- datos heterogéneos (rating, cargo anterior/nuevo, hitos) y no compensa una columna por tipo.
create table if not exists employee_events (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  -- Tipo del evento. Sin enum a propósito: el módulo irá añadiendo tipos por bloque y un enum
  -- obligaría a una migración por cada uno. Los valores válidos viven en lib/performance/events.ts.
  type text not null,
  summary text,
  payload jsonb not null default '{}'::jsonb,
  actor_id uuid,
  actor_email text,
  created_at timestamptz not null default now()
);

create index if not exists employee_events_employee_idx on employee_events (employee_id, created_at desc);
create index if not exists employee_events_type_idx on employee_events (type);

-- RLS: el expediente es dato de EMPRESA y se scopea por la ruta FK employee → company, igual
-- que el resto de tablas de personas. Nunca `using(true)` para authenticated.
alter table employee_events enable row level security;

drop policy if exists employee_events_read on employee_events;
create policy employee_events_read on employee_events for select to authenticated
  using (employee_id in (
    select e.id from employees e where e.company_id in (select auth_company_ids())
  ));

-- Append-only: se puede insertar, nunca modificar ni borrar. Un expediente que se puede editar
-- no sirve como historial. Las correcciones se hacen con un evento nuevo que anota la anterior.
drop policy if exists employee_events_insert on employee_events;
create policy employee_events_insert on employee_events for insert to authenticated
  with check (employee_id in (
    select e.id from employees e where e.company_id in (select auth_company_ids())
  ));

comment on table employee_events is
  'Expediente append-only del empleado: ciclos, resultados, planes, promociones y cambios de nivel. Sin update ni delete por política.';
