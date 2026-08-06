-- Autoservicio de datos personales, acotado por columnas.
--
-- `employees` solo la escribe RR.HH. (`employees_write_tenant`) y eso está bien: darle al empleado
-- una política de UPDATE sobre su propia fila le dejaría cambiarse el cargo, el tipo de contrato o
-- la fecha de alta llamando a PostgREST a mano. La RLS no distingue columnas, así que el corte se
-- hace con una función SECURITY DEFINER que solo toca las que le corresponden.
--
-- Qué puede cambiar y por qué (criterio de RR.HH., no técnico):
--   · teléfono, dirección y ciudad → son SUS datos de contacto, y pedir permiso para actualizarlos
--     solo genera trabajo a RR.HH. sin proteger nada.
--   · contacto de emergencia → es el caso más claro: solo él lo sabe, y hace falta justo cuando no
--     se le puede preguntar. Gatearlo es la forma segura de tenerlo desactualizado.
--
-- Qué NO, y tampoco con aprobación:
--   · país de residencia → mudarse de país no es editar un perfil, es un hecho con consecuencias
--     (residencia fiscal, seguridad social, derecho a trabajar). Va por RR.HH.
--   · nombre, email, documento y fecha de nacimiento → identidad legal; el email es además la
--     identidad de acceso.
--   · cargo, departamento, responsable, contrato, fechas, modalidad, entidad legal y nivel → los
--     fija la empresa, no la persona.
create or replace function update_my_contact_details(
  p_phone text,
  p_address text,
  p_city text,
  p_emergency_contact_name text,
  p_emergency_contact_phone text
)
returns employees
language plpgsql
security definer
set search_path = public
as $$
declare
  updated employees;
begin
  update employees e
     set phone                   = nullif(btrim(p_phone), ''),
         address                 = nullif(btrim(p_address), ''),
         city                    = nullif(btrim(p_city), ''),
         emergency_contact_name  = nullif(btrim(p_emergency_contact_name), ''),
         emergency_contact_phone = nullif(btrim(p_emergency_contact_phone), '')
   where e.user_id = auth.uid()
  returning e.* into updated;

  if updated.id is null then
    raise exception 'Tu usuario no tiene ficha de empleado' using errcode = '42501';
  end if;

  return updated;
end;
$$;

revoke all on function update_my_contact_details(text, text, text, text, text) from public;
grant execute on function update_my_contact_details(text, text, text, text, text) to authenticated;
