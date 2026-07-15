-- 0033_employee_profile_fields.sql — amplía la ficha de empleado (brief HRIS §2).
-- Todo aditivo, nullable/defaulted → seguro sobre datos existentes.

alter table employees
  add column if not exists phone                   text,
  add column if not exists emergency_contact_name  text,
  add column if not exists emergency_contact_phone text,
  add column if not exists seniority_level         text,
  add column if not exists country                 text,
  add column if not exists city                    text,
  add column if not exists work_location           text,
  add column if not exists work_modality           text,
  add column if not exists legal_entity            text,
  add column if not exists benefits                text[] not null default '{}';

-- Modalidad: presencial / híbrido / remoto (o sin definir).
alter table employees drop constraint if exists employees_work_modality_chk;
alter table employees add constraint employees_work_modality_chk
  check (work_modality is null or work_modality in ('presencial','hibrido','remoto'));
