-- ─────────────────────────────────────────────────────────────────────────────
-- SEED: usuarios de prueba por rol
-- Ejecutar en el SQL Editor de Supabase
--
-- CREDENCIALES
--   owner     munozmichael01@gmail.com  (contraseña existente)
--   hr_admin  elena.vidal@talentos.dev   HrAdmin2025!
--   recruiter ruben.ortega@talentos.dev  Recruiter2025!
--   manager   carlos.mendez@talentos.dev Manager2025!
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare
  cid    uuid;
  uid_m  uuid;   -- owner:     Michael Muñoz
  uid_e  uuid;   -- hr_admin:  Elena Vidal
  uid_r  uuid;   -- recruiter: Rubén Ortega
  uid_c  uuid;   -- manager:   Carlos Méndez
  eid_m  uuid;   -- employee:  Michael
  eid_e  uuid;   -- employee:  Elena
  eid_r  uuid;   -- employee:  Rubén
  eid_c  uuid;   -- employee:  Carlos
  -- equipo de Carlos (reportan a él)
  eid_a  uuid;   -- Ana Torres
  eid_d  uuid;   -- Diego Romero
  eid_l  uuid;   -- Laura Sánchez
  atid   uuid;   -- absence_type_id

begin

  -- ── 1. Company ─────────────────────────────────────────────────────────────
  select id into cid from companies limit 1;
  if cid is null then
    raise exception 'No existe ninguna empresa. Crea la empresa primero desde Ajustes.';
  end if;

  -- ── 2. Owner (usuario ya existe) ───────────────────────────────────────────
  select id into uid_m from auth.users where email = 'munozmichael01@gmail.com';
  if uid_m is null then
    raise exception 'No se encontró el usuario owner: munozmichael01@gmail.com';
  end if;

  -- ── 3. Crear auth users (check-before-insert, sin ON CONFLICT) ────────────

  -- Elena Vidal · hr_admin
  select id into uid_e from auth.users where email = 'elena.vidal@talentos.dev';
  if uid_e is null then
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, created_at, updated_at
    ) values (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'elena.vidal@talentos.dev',
      crypt('HrAdmin2025!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Elena Vidal"}',
      false, now() - interval '18 months', now()
    ) returning id into uid_e;
  end if;

  -- Rubén Ortega · recruiter
  select id into uid_r from auth.users where email = 'ruben.ortega@talentos.dev';
  if uid_r is null then
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, created_at, updated_at
    ) values (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'ruben.ortega@talentos.dev',
      crypt('Recruiter2025!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Rubén Ortega"}',
      false, now() - interval '15 months', now()
    ) returning id into uid_r;
  end if;

  -- Carlos Méndez · manager
  select id into uid_c from auth.users where email = 'carlos.mendez@talentos.dev';
  if uid_c is null then
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, created_at, updated_at
    ) values (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'carlos.mendez@talentos.dev',
      crypt('Manager2025!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Carlos Méndez"}',
      false, now() - interval '3 years', now()
    ) returning id into uid_c;
  end if;

  -- ── 4. Employees (roles de la app) ─────────────────────────────────────────

  select id into eid_m from employees where company_id = cid and email = 'munozmichael01@gmail.com' limit 1;
  if eid_m is null then
    insert into employees (company_id, name, email, role_title, department, start_date, contract_type, vacation_days_total, status)
    values (cid, 'Michael Muñoz', 'munozmichael01@gmail.com', 'Director de RRHH', 'Dirección', '2021-03-01', 'indefinido', 25, 'active')
    returning id into eid_m;
  end if;

  select id into eid_e from employees where company_id = cid and email = 'elena.vidal@talentos.dev' limit 1;
  if eid_e is null then
    insert into employees (company_id, name, email, role_title, department, start_date, contract_type, vacation_days_total, manager_id, status)
    values (cid, 'Elena Vidal', 'elena.vidal@talentos.dev', 'Responsable de RRHH', 'Recursos Humanos', '2022-01-10', 'indefinido', 23, eid_m, 'active')
    returning id into eid_e;
  end if;

  select id into eid_r from employees where company_id = cid and email = 'ruben.ortega@talentos.dev' limit 1;
  if eid_r is null then
    insert into employees (company_id, name, email, role_title, department, start_date, contract_type, vacation_days_total, manager_id, status)
    values (cid, 'Rubén Ortega', 'ruben.ortega@talentos.dev', 'Técnico de Selección', 'Reclutamiento', '2023-04-15', 'indefinido', 22, eid_e, 'active')
    returning id into eid_r;
  end if;

  select id into eid_c from employees where company_id = cid and email = 'carlos.mendez@talentos.dev' limit 1;
  if eid_c is null then
    insert into employees (company_id, name, email, role_title, department, start_date, contract_type, vacation_days_total, manager_id, status)
    values (cid, 'Carlos Méndez', 'carlos.mendez@talentos.dev', 'Responsable de Operaciones', 'Operaciones', '2020-09-01', 'indefinido', 25, eid_m, 'active')
    returning id into eid_c;
  end if;

  -- ── 5. Equipo de Carlos (manager_id = eid_c) ───────────────────────────────

  select id into eid_a from employees where company_id = cid and email = 'ana.torres@talentos.dev' limit 1;
  if eid_a is null then
    insert into employees (company_id, name, email, role_title, department, start_date, contract_type, vacation_days_total, manager_id, status)
    values (cid, 'Ana Torres', 'ana.torres@talentos.dev', 'Técnica de Operaciones', 'Operaciones', '2021-06-01', 'indefinido', 23, eid_c, 'active')
    returning id into eid_a;
  end if;

  select id into eid_d from employees where company_id = cid and email = 'diego.romero@talentos.dev' limit 1;
  if eid_d is null then
    insert into employees (company_id, name, email, role_title, department, start_date, contract_type, vacation_days_total, manager_id, status)
    values (cid, 'Diego Romero', 'diego.romero@talentos.dev', 'Operador Senior', 'Operaciones', '2019-03-15', 'indefinido', 25, eid_c, 'active')
    returning id into eid_d;
  end if;

  select id into eid_l from employees where company_id = cid and email = 'laura.sanchez@talentos.dev' limit 1;
  if eid_l is null then
    insert into employees (company_id, name, email, role_title, department, start_date, contract_type, vacation_days_total, manager_id, status)
    values (cid, 'Laura Sánchez', 'laura.sanchez@talentos.dev', 'Coordinadora de Logística', 'Operaciones', '2022-09-05', 'indefinido', 23, eid_c, 'active')
    returning id into eid_l;
  end if;

  -- ── 6. Company members (roles de acceso) ───────────────────────────────────
  insert into company_members (company_id, user_id, role, employee_id, invited_at, joined_at)
  values
    (cid, uid_m, 'owner',     eid_m, now() - interval '2 years',   now() - interval '2 years'),
    (cid, uid_e, 'hr_admin',  eid_e, now() - interval '18 months', now() - interval '18 months'),
    (cid, uid_r, 'recruiter', eid_r, now() - interval '15 months', now() - interval '15 months'),
    (cid, uid_c, 'manager',   eid_c, now() - interval '3 years',   now() - interval '3 years')
  on conflict (company_id, user_id)
  do update set
    role        = excluded.role,
    employee_id = excluded.employee_id,
    joined_at   = coalesce(company_members.joined_at, excluded.joined_at);

  -- ── 7. Onboarding tasks ────────────────────────────────────────────────────

  -- Rubén (reciente — mix de estados)
  insert into onboarding_tasks (employee_id, title, description, assignee, due_date, status, order_index)
  values
    (eid_r, 'Formulario de alta RRHH', 'Rellenar datos bancarios, IRPF y documentación personal',
     'Elena Vidal', current_date - 60, 'done', 1),
    (eid_r, 'Formación PRL obligatoria', 'Módulo online de Prevención de Riesgos Laborales (2h)',
     'Elena Vidal', current_date - 45, 'done', 2),
    (eid_r, 'Acceso a herramientas de selección', 'Configurar LinkedIn Recruiter, InfoJobs y portales de clientes',
     'Rubén Ortega', current_date - 10, 'in_progress', 3),
    (eid_r, 'Presentación al equipo comercial', 'Reunión 1:1 para alineación de metodología de búsqueda',
     'Michael Muñoz', current_date + 5, 'pending', 4),
    (eid_r, 'Revisión 3 meses con manager', 'Evaluación de objetivos y KPIs del primer trimestre',
     'Elena Vidal', current_date + 30, 'pending', 5);

  -- Elena (consolidada — todas completadas)
  insert into onboarding_tasks (employee_id, title, description, assignee, due_date, status, order_index)
  values
    (eid_e, 'Revisión de políticas internas', 'Firmar código de conducta y política de protección de datos',
     'Michael Muñoz', '2022-01-18', 'done', 1),
    (eid_e, 'Acceso a TalentOS y sistemas HRIS', 'Configurar credenciales y permisos de administrador HRIS',
     'Michael Muñoz', '2022-01-25', 'done', 2),
    (eid_e, 'Presentación al equipo directivo', 'Reunión de bienvenida con dirección y managers de área',
     'Michael Muñoz', '2022-02-05', 'done', 3);

  -- Laura (reciente en el equipo de Carlos — tarea vencida visible para el manager)
  insert into onboarding_tasks (employee_id, title, description, assignee, due_date, status, order_index)
  values
    (eid_l, 'Formación en sistema de gestión logística', 'Completar módulo ERP y certificación interna',
     'Carlos Méndez', current_date - 20, 'in_progress', 1),
    (eid_l, 'Reunión de alineación con proveedor principal', 'Presentación ante el equipo del proveedor A',
     'Carlos Méndez', current_date - 8, 'pending', 2);

  -- ── 8. Absence requests ────────────────────────────────────────────────────
  select id into atid from absence_types where company_id = cid limit 1;

  if atid is not null then
    -- Elena: vacaciones aprobadas (histórico)
    insert into absence_requests (
      company_id, employee_id, created_by_employee_id, absence_type_id,
      start_date, end_date, start_period, end_period, working_days_count,
      status, approved_by_employee_id, approved_at, comment
    ) values (
      cid, eid_e, eid_e, atid,
      current_date - 50, current_date - 41, 'full', 'full', 8,
      'approved', eid_m, now() - interval '55 days', 'Vacaciones de verano'
    );

    -- Rubén: pendiente → inbox del owner/hr_admin
    insert into absence_requests (
      company_id, employee_id, created_by_employee_id, absence_type_id,
      start_date, end_date, start_period, end_period, working_days_count,
      status, comment
    ) values (
      cid, eid_r, eid_r, atid,
      current_date + 12, current_date + 16, 'full', 'full', 4,
      'pending', 'Asuntos personales'
    );

    -- Carlos: ausente hoy → "ausentes hoy" del dashboard
    insert into absence_requests (
      company_id, employee_id, created_by_employee_id, absence_type_id,
      start_date, end_date, start_period, end_period, working_days_count,
      status, approved_by_employee_id, approved_at, comment
    ) values (
      cid, eid_c, eid_c, atid,
      current_date, current_date + 1, 'full', 'full', 2,
      'approved', eid_m, now() - interval '3 days', 'Viaje de trabajo — cliente clave'
    );

    -- Ana: solicitud pendiente → inbox de Carlos (manager) + owner/hr_admin
    insert into absence_requests (
      company_id, employee_id, created_by_employee_id, absence_type_id,
      start_date, end_date, start_period, end_period, working_days_count,
      status, comment
    ) values (
      cid, eid_a, eid_a, atid,
      current_date + 5, current_date + 7, 'full', 'full', 3,
      'pending', 'Cita médica especialista'
    );
  end if;

  -- ── 9. Compliance violations ───────────────────────────────────────────────

  -- Carlos: exceso de horas (sin reconocer → inbox)
  insert into compliance_violations (company_id, employee_id, violation_type, description, date, acknowledged_at)
  values (
    cid, eid_c, 'max_hours_exceeded',
    'Registradas 52h en la semana del ' || to_char(current_date - 7, 'DD/MM/YYYY') || '. Límite legal: 40h semanales.',
    current_date - 3, null
  );

  -- Diego: fichaje sin descanso (sin reconocer → inbox)
  insert into compliance_violations (company_id, employee_id, violation_type, description, date, acknowledged_at)
  values (
    cid, eid_d, 'missing_break',
    'Jornada de 8h registrada el ' || to_char(current_date - 2, 'DD/MM/YYYY') || ' sin pausa de descanso.',
    current_date - 2, null
  );

  -- Elena: descanso insuficiente (reconocido — histórico)
  insert into compliance_violations (
    company_id, employee_id, violation_type, description, date,
    acknowledged_at, acknowledged_by_employee_id
  ) values (
    cid, eid_e, 'insufficient_break',
    'Descanso de 18 min el ' || to_char(current_date - 20, 'DD/MM/YYYY') || '. Mínimo: 20 min.',
    current_date - 20, now() - interval '18 days', eid_m
  );

  -- ── 10. Time entries (2 semanas · lun-vie · todos los empleados) ───────────
  declare
    d        date;
    emp_id   uuid;
    all_eids uuid[] := array[eid_m, eid_e, eid_r, eid_c, eid_a, eid_d, eid_l];
    i        int;
  begin
    for i in 1..array_length(all_eids, 1) loop
      emp_id := all_eids[i];
      for d in
        select gs::date
        from generate_series(current_date - 13, current_date - 1, '1 day'::interval) gs
        where extract(dow from gs) not in (0, 6)
      loop
        insert into time_entries (
          company_id, employee_id, date,
          start_time, end_time, duration_minutes,
          entry_type, source, timezone
        ) values (
          cid, emp_id, d,
          (d::timestamp + interval '8 hours') at time zone 'Europe/Madrid',
          (d::timestamp + interval '17 hours') at time zone 'Europe/Madrid',
          540, 'work', 'manual', 'Europe/Madrid'
        );
      end loop;
    end loop;
  end;

  -- ── 11. Compensation records (banco de horas · últimos 3 meses) ────────────
  insert into compensation_records (
    company_id, employee_id, period_start, period_end,
    scheduled_minutes, worked_minutes, balance_minutes,
    compensated_minutes, compensation_type, comment
  ) values
    (cid, eid_m, current_date - 90, current_date - 61, 9600, 9600,    0,   0, 'time_off', 'Cierre mensual'),
    (cid, eid_m, current_date - 60, current_date - 31, 9600, 9480, -120,   0, 'time_off', 'Cierre mensual'),
    (cid, eid_m, current_date - 30, current_date - 1,  9600, 9720,  120,   0, 'time_off', 'Cierre mensual'),
    (cid, eid_e, current_date - 90, current_date - 61, 9600, 9600,    0,   0, 'time_off', 'Cierre mensual'),
    (cid, eid_e, current_date - 60, current_date - 31, 9600, 9600,    0,   0, 'time_off', 'Cierre mensual'),
    (cid, eid_e, current_date - 30, current_date - 1,  9600, 9540,  -60,   0, 'time_off', 'Cierre mensual · 1 día vacaciones'),
    (cid, eid_r, current_date - 90, current_date - 61, 9600, 9600,    0,   0, 'time_off', 'Cierre mensual'),
    (cid, eid_r, current_date - 60, current_date - 31, 9600, 9720,  120,   0, 'time_off', 'Cierre mensual'),
    (cid, eid_r, current_date - 30, current_date - 1,  9600, 9600,    0,   0, 'time_off', 'Cierre mensual'),
    (cid, eid_c, current_date - 90, current_date - 61, 9600, 9600,    0,   0, 'time_off', 'Cierre mensual'),
    (cid, eid_c, current_date - 60, current_date - 31, 9600,10560,  960,   0, 'time_off', 'Cierre mensual · proyecto urgente'),
    (cid, eid_c, current_date - 30, current_date - 1,  9600,10200,  600, 600, 'payment',  'Compensación horas extra · acuerdo dirección'),
    (cid, eid_a, current_date - 60, current_date - 31, 9600, 9600,    0,   0, 'time_off', 'Cierre mensual'),
    (cid, eid_a, current_date - 30, current_date - 1,  9600, 9600,    0,   0, 'time_off', 'Cierre mensual'),
    (cid, eid_d, current_date - 60, current_date - 31, 9600, 9840,  240,   0, 'time_off', 'Cierre mensual'),
    (cid, eid_d, current_date - 30, current_date - 1,  9600, 9600,    0,   0, 'time_off', 'Cierre mensual'),
    (cid, eid_l, current_date - 60, current_date - 31, 9600, 9600,    0,   0, 'time_off', 'Cierre mensual'),
    (cid, eid_l, current_date - 30, current_date - 1,  9600, 9480, -120,   0, 'time_off', 'Cierre mensual');

  raise notice '✓ Seed completado.';
  raise notice '  owner:     munozmichael01@gmail.com (contraseña existente)';
  raise notice '  hr_admin:  elena.vidal@talentos.dev     / HrAdmin2025!';
  raise notice '  recruiter: ruben.ortega@talentos.dev    / Recruiter2025!';
  raise notice '  manager:   carlos.mendez@talentos.dev   / Manager2025!';
  raise notice '';
  raise notice '  Equipo de Carlos: Ana Torres, Diego Romero, Laura Sánchez';
  raise notice '  employee_ids: Michael=% Elena=% Ruben=% Carlos=%', eid_m, eid_e, eid_r, eid_c;

end $$;
