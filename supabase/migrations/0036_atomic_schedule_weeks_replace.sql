-- 0036_atomic_schedule_weeks_replace.sql
-- Reemplazo ATÓMICO de las semanas/días de una plantilla de horario en una sola
-- transacción. Cierra el hallazgo de la auditoría de botones: la edición de plantilla
-- hacía delete → loop-insert en el route (no transaccional), así que un fallo a mitad
-- (constraint, red) dejaba la plantilla con las semanas medio reinsertadas o vacías,
-- sin rollback. Una función plpgsql corre como una unidad: si algún insert lanza, se
-- revierte todo.
--
-- SECURITY INVOKER (por defecto, no security definer): la RLS de work_schedule_weeks /
-- work_schedule_days aplica DENTRO de la función, de modo que el caller solo puede
-- borrar/insertar en plantillas de su empresa (auth_company_ids()). No bypasea el
-- aislamiento multi-tenant (migr. 0031–0032).

create or replace function replace_schedule_template_weeks(
  p_template_id uuid,
  p_weeks jsonb
) returns void
language plpgsql
as $$
declare
  v_week jsonb;
  v_day jsonb;
  v_week_id uuid;
begin
  -- Borra las semanas actuales (cascade a días vía FK on delete cascade, migr. 0003).
  delete from work_schedule_weeks where template_id = p_template_id;

  for v_week in select * from jsonb_array_elements(coalesce(p_weeks, '[]'::jsonb))
  loop
    insert into work_schedule_weeks (template_id, week_label, week_index)
    values (
      p_template_id,
      coalesce(v_week->>'week_label', 'Semana ' || (((v_week->>'week_index')::int) + 1)),
      (v_week->>'week_index')::int
    )
    returning id into v_week_id;

    for v_day in select * from jsonb_array_elements(coalesce(v_week->'days', '[]'::jsonb))
    loop
      insert into work_schedule_days (week_id, day_of_week, is_working_day, slots, total_minutes)
      values (
        v_week_id,
        (v_day->>'day_of_week')::int,
        coalesce((v_day->>'is_working_day')::boolean, false),
        coalesce(v_day->'slots', '[]'::jsonb),
        coalesce((v_day->>'total_minutes')::int, 0)
      );
    end loop;
  end loop;
end;
$$;

grant execute on function replace_schedule_template_weeks(uuid, jsonb) to authenticated;
