import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";
import { calcWorkingDays } from "@/lib/absences/working-days";
import { loadEmployeeBalances } from "@/lib/absences/balance";
import { resolveActingEmployee } from "@/lib/api-self";

export async function GET(req: Request) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (!company)
    return jsonError("Configura primero la empresa en Ajustes", 412);

  const url = new URL(req.url);
  const employeeId = url.searchParams.get("employee_id");
  const status = url.searchParams.get("status");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  let query = supabase
    .from("absence_requests")
    .select(
      "*, employees!employee_id(name, role_title), absence_types(name, color, icon)"
    )
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  if (employeeId) query = query.eq("employee_id", employeeId);
  if (status) query = query.eq("status", status);
  if (from) query = query.gte("end_date", from);
  if (to) query = query.lte("start_date", to);

  const { data, error: dbError } = await query;
  if (dbError) return jsonError(dbError.message, 500);

  return NextResponse.json({ requests: data });
}

/**
 * Alta de una solicitud de ausencia.
 *
 * El `employee_id` ya no viene del cliente: el portal permitiría pedir vacaciones en nombre de
 * un compañero. RR.HH. sigue pudiendo darlas de alta por cualquiera de su empresa.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  if (!body?.absence_type_id || !body?.start_date || !body?.start_period || !body?.end_date || !body?.end_period) {
    return jsonError("Se requieren: absence_type_id, start_date, start_period, end_date, end_period");
  }
  if (body.end_date < body.start_date) {
    return jsonError("La fecha de fin no puede ser anterior a la de inicio");
  }

  const acting = await resolveActingEmployee(body.employee_id);
  if (acting.error) return acting.error;
  const { supabase, employeeId, companyId, isHr } = acting;

  // Solapes: se miran contra las suyas, no contra las de la empresa.
  const { data: overlapping } = await supabase
    .from("absence_requests")
    .select("id")
    .eq("employee_id", employeeId)
    .not("status", "in", '("rejected","cancelled")')
    .lte("start_date", body.end_date)
    .gte("end_date", body.start_date)
    .limit(1);

  if (overlapping && overlapping.length > 0) {
    return jsonError("Ya hay una ausencia registrada en esas fechas", 409);
  }

  const { data: absenceType } = await supabase
    .from("absence_types")
    .select("id, requires_approval, deducts_from_allowance, allowance_type_id, requires_document")
    .eq("id", body.absence_type_id)
    .eq("company_id", companyId)
    .eq("is_active", true)
    .maybeSingle();

  if (!absenceType) return jsonError("Tipo de ausencia no encontrado", 404);
  if (absenceType.requires_document && !body.document_url) {
    return jsonError("Este tipo de ausencia exige adjuntar un justificante", 422);
  }

  const workingDaysCount = await calcWorkingDays(
    supabase, companyId, employeeId,
    body.start_date, body.start_period, body.end_date, body.end_period,
  );

  // Saldo: solo se comprueba si el tipo descuenta de una bolsa. Se cuenta contra el mismo cálculo
  // que ve el empleado en su portal, con lo pendiente ya restado.
  if (absenceType.deducts_from_allowance) {
    const balances = await loadEmployeeBalances(supabase, employeeId);
    const relevant = balances.filter(
      (b) => !absenceType.allowance_type_id || b.allowanceTypeId === absenceType.allowance_type_id,
    );
    const available = relevant.reduce((s, b) => s + b.available, 0);
    if (relevant.length > 0 && workingDaysCount > available) {
      return jsonError(
        `No hay saldo suficiente: pides ${workingDaysCount} y te quedan ${available}`,
        422,
      );
    }
  }

  const status = absenceType.requires_approval ? "pending" : "approved";

  const { data, error: dbError } = await supabase
    .from("absence_requests")
    .insert({
      company_id: companyId,
      employee_id: employeeId,
      absence_type_id: body.absence_type_id,
      start_date: body.start_date,
      start_period: body.start_period,
      end_date: body.end_date,
      end_period: body.end_period,
      working_days_count: workingDaysCount,
      status,
      comment: body.comment ?? null,
      document_url: body.document_url ?? null,
      // Sustituto y avisos los decide RR.HH.: desde el portal se ignoran.
      substitute_employee_id: isHr ? (body.substitute_employee_id ?? null) : null,
      notify_employee_ids: isHr ? (body.notify_employee_ids ?? []) : [],
    })
    .select("*, employees!employee_id(name, role_title), absence_types(name, color, icon)")
    .single();
  if (dbError) return jsonError(dbError.message, 500);

  return NextResponse.json({ request: data }, { status: 201 });
}
