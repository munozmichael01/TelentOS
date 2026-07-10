import { NextResponse } from "next/server";
import { requireApiRole, jsonError } from "@/lib/api";

export async function GET(req: Request) {
  const { supabase, companyId, error } = await requireApiRole(["owner", "hr_admin"]);
  if (error) return error;

  const url = new URL(req.url);
  const employee_id = url.searchParams.get("employee_id");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  let query = supabase
    .from("compensation_records")
    .select("*, employees!employee_id(name, role_title)")
    .eq("company_id", companyId!)
    .order("period_start", { ascending: false });

  if (employee_id) query = query.eq("employee_id", employee_id);
  if (from) query = query.gte("period_start", from);
  if (to) query = query.lte("period_end", to);

  const { data, error: dbError } = await query;
  if (dbError) return jsonError(dbError.message, 500);
  return NextResponse.json({ records: data ?? [] });
}

export async function POST(req: Request) {
  const { supabase, companyId, user, error } = await requireApiRole(["owner", "hr_admin"]);
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body?.employee_id) return jsonError("Se requiere employee_id");
  if (!body?.period_start) return jsonError("Se requiere period_start");
  if (!body?.period_end) return jsonError("Se requiere period_end");
  if (body.scheduled_minutes === undefined || body.scheduled_minutes === null)
    return jsonError("Se requiere scheduled_minutes");
  if (body.worked_minutes === undefined || body.worked_minutes === null)
    return jsonError("Se requiere worked_minutes");

  // AC-7d: block duplicate confirmation for same employee + period
  const { data: existing } = await supabase
    .from("compensation_records")
    .select("id")
    .eq("company_id", companyId!)
    .eq("employee_id", body.employee_id)
    .eq("period_start", body.period_start)
    .eq("period_end", body.period_end)
    .maybeSingle();

  if (existing) {
    return jsonError("Ya existe un registro para este empleado en este período", 409);
  }

  const balance_minutes = body.worked_minutes - body.scheduled_minutes;
  const compensation_type = body.compensation_type ?? "time_off";

  // Resolve processed_by employee record for the current auth user
  const { data: processorEmployee } = await supabase
    .from("employees")
    .select("id")
    .eq("company_id", companyId!)
    .eq("auth_user_id", user!.id)
    .maybeSingle();

  const { data, error: dbError } = await supabase
    .from("compensation_records")
    .insert({
      company_id: companyId!,
      employee_id: body.employee_id,
      processed_by_employee_id: processorEmployee?.id ?? null,
      period_start: body.period_start,
      period_end: body.period_end,
      scheduled_minutes: body.scheduled_minutes,
      worked_minutes: body.worked_minutes,
      balance_minutes,
      compensated_minutes: 0,
      compensation_type,
      conversion_factor: body.conversion_factor ?? 1.0,
      comment: body.comment ?? null,
      // AC-7b: payment type gets pending status; time_off has no novedad
      novedad_status: compensation_type === "payment" ? "pending" : null,
    })
    .select()
    .single();

  if (dbError) return jsonError(dbError.message, 500);
  return NextResponse.json({ record: data }, { status: 201 });
}
