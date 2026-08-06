import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { calcWorkingDays } from "@/lib/absences/working-days";
import { resolveActingEmployee } from "@/lib/api-self";

/**
 * Vista previa de los días laborables de una ausencia, para el formulario.
 *
 * Tomaba `employee_id` y `company_id` del cuerpo, así que cualquiera podía calcular sobre el
 * horario de un compañero o los festivos de otra empresa. Ahora RR.HH. puede pedirlo por otro
 * empleado suyo —o por nadie, y sale el horario genérico— y el resto solo por sí mismo.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.start_date || !body?.start_period || !body?.end_date || !body?.end_period) {
    return jsonError("Se requieren: start_date, start_period, end_date, end_period");
  }
  if (body.end_date < body.start_date) {
    return jsonError("La fecha de fin no puede ser anterior a la de inicio");
  }

  const acting = await resolveActingEmployee(body.employee_id, { hrMayOmitTarget: true });
  if (acting.error) return acting.error;

  const working_days_count = await calcWorkingDays(
    acting.supabase,
    acting.companyId,
    acting.employeeId,
    body.start_date,
    body.start_period,
    body.end_date,
    body.end_period
  );

  return NextResponse.json({ working_days_count });
}
