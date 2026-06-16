-- TalentOS — datos de demo. IDs fijos para poder cruzar referencias.

insert into companies (id, name, slug, description, website) values
  ('00000000-0000-0000-0000-000000000001', 'Acme Talent', 'acme',
   'Construimos software para equipos de operaciones. Más de 80 personas en Madrid, Barcelona y remoto.',
   'https://acme.example.com');

insert into channels (id, name, kind, base_cpa, audience) values
  ('10000000-0000-0000-0000-000000000001', 'LinkedIn Jobs',  'job_board',  35, 'Perfiles cualificados, tech y management'),
  ('10000000-0000-0000-0000-000000000002', 'Indeed',         'aggregator', 12, 'Alto volumen, todos los sectores'),
  ('10000000-0000-0000-0000-000000000003', 'InfoJobs',       'job_board',  15, 'Mercado España, volumen generalista'),
  ('10000000-0000-0000-0000-000000000004', 'Glassdoor',      'job_board',  22, 'Candidatos que investigan empresa y salario'),
  ('10000000-0000-0000-0000-000000000005', 'Google for Jobs','aggregator',  8, 'Tráfico orgánico de búsqueda'),
  ('10000000-0000-0000-0000-000000000006', 'Meta Ads',       'social',     18, 'Perfiles junior y no-desk, segmentación geográfica'),
  ('10000000-0000-0000-0000-000000000007', 'X Ads',          'social',     28, 'Tech y producto, alcance de marca');

insert into evaluation_templates (id, name, stage_name, questions) values
  ('20000000-0000-0000-0000-000000000001', 'Screening telefónico', 'Screening',
   '[{"q":"Motivación para el cambio","type":"rating"},{"q":"Encaje salarial","type":"rating"},{"q":"Disponibilidad","type":"rating"},{"q":"Comunicación","type":"rating"}]'),
  ('20000000-0000-0000-0000-000000000002', 'Entrevista técnica', 'Entrevista',
   '[{"q":"Conocimiento técnico del rol","type":"rating"},{"q":"Resolución de problemas","type":"rating"},{"q":"Experiencia relevante","type":"rating"},{"q":"Colaboración y feedback","type":"rating"}]');

insert into jobs (id, company_id, title, description, skills, salary_min, salary_max, location, employment_type, sector, department, category, experience_min_years, status, source) values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
   'Senior Frontend Engineer',
   E'## Sobre el rol\nBuscamos un/a Senior Frontend Engineer para liderar el desarrollo de nuestra plataforma web.\n\n## Responsabilidades\n- Construir interfaces con React y TypeScript\n- Definir estándares de calidad del frontend\n- Mentorizar al equipo\n\n## Requisitos\n- 5+ años con React\n- Experiencia con design systems',
   '{React,TypeScript,Next.js,Testing,CSS}', 55000, 70000, 'Madrid (híbrido)', 'full_time', 'Tecnología', 'Engineering', 'Software', 5, 'active', 'manual'),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
   'Customer Success Manager',
   E'## Sobre el rol\nGestionarás la relación con nuestras cuentas clave y su adopción del producto.\n\n## Requisitos\n- 3+ años en Customer Success B2B SaaS\n- Inglés alto',
   '{"Customer Success",SaaS,CRM,Inglés,Comunicación}', 32000, 42000, 'Barcelona', 'full_time', 'Tecnología', 'Customer Success', 'Comercial', 3, 'active', 'manual'),
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
   'Técnico/a de Mantenimiento Industrial',
   E'## Sobre el rol\nMantenimiento preventivo y correctivo de línea de producción.\n\n## Requisitos\n- FP en electromecánica\n- Disponibilidad para turnos',
   '{Electromecánica,PLC,"Mantenimiento preventivo",Turnos}', 24000, 30000, 'Zaragoza', 'full_time', 'Industrial', 'Operaciones', 'Mantenimiento', 2, 'active', 'import_xml');

-- Pipeline por defecto para cada oferta
insert into job_stages (id, job_id, name, order_index, is_terminal)
select gen_random_uuid(), j.id, s.name, s.ord, s.terminal
from jobs j,
  (values ('Aplicado',0,false),('Screening',1,false),('Entrevista',2,false),
          ('Oferta',3,false),('Contratado',4,true),('Descartado',5,true)) as s(name,ord,terminal);

insert into candidates (id, name, email, phone, location, skills, experience_years, summary, source) values
  ('40000000-0000-0000-0000-000000000001', 'Lucía Fernández', 'lucia.fernandez@example.com', '+34 600 111 222', 'Madrid',
   '{React,TypeScript,Next.js,GraphQL}', 6, 'Frontend engineer con 6 años en producto SaaS. Lideró la migración a Next.js en su empresa actual.', 'career_site'),
  ('40000000-0000-0000-0000-000000000002', 'Marc Vidal', 'marc.vidal@example.com', '+34 600 333 444', 'Barcelona',
   '{React,CSS,Vue}', 3, 'Desarrollador frontend con experiencia en agencias. Portfolio sólido de interfaces.', 'job_board'),
  ('40000000-0000-0000-0000-000000000003', 'Sara Ait', 'sara.ait@example.com', '+34 600 555 666', 'Barcelona',
   '{"Customer Success",SaaS,Salesforce,Inglés}', 4, 'CSM en scale-up B2B, cartera de 40 cuentas enterprise, NRR 112%.', 'career_site'),
  ('40000000-0000-0000-0000-000000000004', 'Jorge Lamas', 'jorge.lamas@example.com', null, 'Zaragoza',
   '{Electromecánica,PLC,Soldadura}', 8, 'Técnico industrial con 8 años en automoción.', 'job_board');

-- Candidaturas en distintas etapas
insert into applications (id, job_id, candidate_id, stage_id, fit_score, source, utm)
select '50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001',
       s.id, 88, 'career_site', '{"utm_source":"career_site","utm_medium":"organic"}'
from job_stages s where s.job_id = '30000000-0000-0000-0000-000000000001' and s.name = 'Entrevista';
insert into applications (id, job_id, candidate_id, stage_id, fit_score, source, utm)
select '50000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002',
       s.id, 61, 'job_board', '{"utm_source":"indeed","utm_medium":"cpc"}'
from job_stages s where s.job_id = '30000000-0000-0000-0000-000000000001' and s.name = 'Screening';
insert into applications (id, job_id, candidate_id, stage_id, fit_score, source, utm)
select '50000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000003',
       s.id, 84, 'career_site', '{"utm_source":"career_site","utm_medium":"organic"}'
from job_stages s where s.job_id = '30000000-0000-0000-0000-000000000002' and s.name = 'Aplicado';
insert into applications (id, job_id, candidate_id, stage_id, fit_score, source, utm)
select '50000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000004',
       s.id, 79, 'job_board', '{"utm_source":"infojobs","utm_medium":"cpc"}'
from job_stages s where s.job_id = '30000000-0000-0000-0000-000000000003' and s.name = 'Aplicado';

insert into application_events (application_id, type, to_stage, reason, actor_email)
values
  ('50000000-0000-0000-0000-000000000001', 'created', 'Aplicado', 'Candidatura desde career site', null),
  ('50000000-0000-0000-0000-000000000001', 'stage_change', 'Screening', 'CV muy alineado con requisitos', 'demo@acme.example.com'),
  ('50000000-0000-0000-0000-000000000001', 'stage_change', 'Entrevista', 'Screening superado: gran comunicación', 'demo@acme.example.com'),
  ('50000000-0000-0000-0000-000000000002', 'created', 'Aplicado', 'Candidatura desde Indeed', null),
  ('50000000-0000-0000-0000-000000000003', 'created', 'Aplicado', 'Candidatura desde career site', null),
  ('50000000-0000-0000-0000-000000000004', 'created', 'Aplicado', 'Candidatura desde InfoJobs', null);

update application_events set from_stage = 'Aplicado' where to_stage = 'Screening';
update application_events set from_stage = 'Screening' where to_stage = 'Entrevista';

-- Campañas de ejemplo con métricas
insert into campaigns (job_id, channel_id, objective, budget, priority, copy, views, applications, spend) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'quality', 600, 1,
   '🚀 Senior Frontend Engineer en Acme — React/TS, equipo de producto, 55-70k. Madrid híbrido.', 2140, 14, 420),
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', 'quality', 0, 2,
   'Senior Frontend Engineer — Madrid (híbrido) — 55.000-70.000 €', 3890, 9, 0),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'volume', 300, 1,
   'Técnico/a de Mantenimiento Industrial en Zaragoza. Contrato indefinido, turnos rotativos.', 5320, 31, 265);

-- Empleados (cadena de managers para el org chart)
insert into employees (id, company_id, name, email, role_title, department, start_date, contract_type, manager_id) values
  ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Elena Ruiz', 'elena@acme.example.com', 'CEO', 'Dirección', '2020-01-15', 'indefinido', null),
  ('60000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'David Soto', 'david@acme.example.com', 'CTO', 'Engineering', '2020-03-01', 'indefinido', '60000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Nuria Pla', 'nuria@acme.example.com', 'Head of People', 'People', '2021-06-01', 'indefinido', '60000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Pablo Iglesias', 'pablo@acme.example.com', 'Backend Engineer', 'Engineering', '2022-09-12', 'indefinido', '60000000-0000-0000-0000-000000000002');

insert into onboarding_tasks (employee_id, title, description, assignee, due_date, status, order_index) values
  ('60000000-0000-0000-0000-000000000004', 'Alta en sistemas y email', 'Cuenta Google Workspace, Slack y GitHub', 'IT', '2022-09-12', 'done', 0),
  ('60000000-0000-0000-0000-000000000004', 'Setup entorno de desarrollo', 'Repos, accesos a staging y guía de arquitectura', 'David Soto', '2022-09-14', 'done', 1),
  ('60000000-0000-0000-0000-000000000004', 'Sesión de bienvenida People', 'Políticas, beneficios y herramientas internas', 'Nuria Pla', '2022-09-13', 'done', 2);

insert into timesheets (employee_id, work_date, hours, notes) values
  ('60000000-0000-0000-0000-000000000004', current_date - 2, 8, 'Sprint 24 — API de facturación'),
  ('60000000-0000-0000-0000-000000000004', current_date - 1, 7.5, 'Sprint 24 — code review y fixes'),
  ('60000000-0000-0000-0000-000000000002', current_date - 1, 8, 'Roadmap Q3');

insert into time_off_requests (employee_id, start_date, end_date, days, type, status) values
  ('60000000-0000-0000-0000-000000000004', current_date + 20, current_date + 24, 5, 'vacation', 'pending'),
  ('60000000-0000-0000-0000-000000000002', current_date - 30, current_date - 26, 5, 'vacation', 'approved');
