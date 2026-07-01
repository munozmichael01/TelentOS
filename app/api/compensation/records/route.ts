import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";

export async function GET(req: Request) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const { data: company } = await supabase.from("companies").select("id").limit(1).maybeSingle();
  if (!company) return jsonError("Configura primero la empresa en Ajustes", 412);

  const url = new URL(req.url);
  const employee_id = url.searchParams.get("employee_id");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  let query = supabase
    .from("compensation_records")
    .select("*, employee:employees(name)")
    .eq("company_id", company.id)
    .order("period_start", { ascending: false });

  if (employee_id) query = query.eq("employee_id", employee_id);
  if (from) query = query.gte("period_start", from);
  if (to) query = query.lte("period_end", to);

  const { data, error: dbError } = await query;
  if (dbError) return jsonError(dbError.message, 500);
  return NextResponse.json({ records: data ?? [] });
}

export async function POST(req: Request) {
  const { supabase, error, user } = await requireUser();
  if (error) return error;

  const { data: company } = await supabase.from("companies").select("id").limit(1).maybeSingle();
  if (!company) return jsonError("Configura primero la empresa en Ajustes", 412);

  const body = await req.json().catch(() => null);
  if (!body?.employee_id) return jsonError("Se requiere employee_id");
  if (!body?.period_start) return jsonError("Se requiere period_start");
  if (!body?.period_end) return jsonError("Se requiere period_end");
  if (body.scheduled_minutes === undefined || body.scheduled_minutes === null)
    return jsonError("Se requiere scheduled_minutes");
  if (body.worked_minutes === undefined || body.worked_minutes === null)
    return jsonError("Se requiere worked_minutes");

  const balance_minutes = body.worked_minutes - body.scheduled_minutes;

  // Resolve processed_by employee record for the current auth user
  const { data: processorEmployee } = await supabase
    .from("employees")
    .select("id")
    .eq("company_id", company.id)
    .eq("auth_user_id", user!.id)
    .maybeSingle();

  const { data, error: dbError } = await supabase
    .from("compensation_records")
    .insert({
      company_id: company.id,
      employee_id: body.employee_id,
      processed_by_employee_id: processorEmployee?.id ?? null,
      period_start: body.period_start,
      period_end: body.period_end,
      scheduled_minutes: body.scheduled_minutes,
      worked_minutes: body.worked_minutes,
      balance_minutes,
      compensated_minutes: 0,
      compensation_type: body.compensation_type ?? "time_off",
      conversion_factor: body.conversion_factor ?? 1.0,
      comment: body.comment ?? null,
    })
    .select()
    .single();

  if (dbError) return jsonError(dbError.message, 500);
  return NextResponse.json({ record: data }, { status: 201 });
}
