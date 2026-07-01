import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";

async function calcWorkingDays(
  supabase: any,
  companyId: string,
  employeeId: string,
  startDate: string,
  startPeriod: string,
  endDate: string,
  endPeriod: string
): Promise<number> {
  // Load holidays
  const { data: holidays } = await supabase
    .from("company_holidays")
    .select("date, repeats_annually")
    .eq("company_id", companyId);

  // Load employee schedule
  const { data: schedule } = await supabase
    .from("employee_schedules")
    .select(
      "template_id, work_schedule_templates(week_type, is_active, weeks:work_schedule_weeks(week_index, days:work_schedule_days(day_of_week, is_working_day, total_minutes)))"
    )
    .eq("employee_id", employeeId)
    .lte("valid_from", startDate)
    .or(`valid_until.is.null,valid_until.gte.${startDate}`)
    .order("valid_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Build holiday set
  const fromYear = new Date(startDate).getFullYear();
  const toYear = new Date(endDate).getFullYear();
  const holidayDates = new Set<string>();
  for (const h of holidays ?? []) {
    if (h.repeats_annually) {
      for (let y = fromYear; y <= toYear; y++) {
        holidayDates.add(`${y}-${h.date.slice(5)}`);
      }
    } else {
      holidayDates.add(h.date);
    }
  }

  function getIsoWeek(d: Date): number {
    const tmp = new Date(d);
    tmp.setHours(0, 0, 0, 0);
    tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));
    const w1 = new Date(tmp.getFullYear(), 0, 4);
    return (
      1 +
      Math.round(
        ((tmp.getTime() - w1.getTime()) / 86400000 -
          3 +
          ((w1.getDay() + 6) % 7)) /
          7
      )
    );
  }

  let total = 0;
  const cursor = new Date(startDate);
  const endD = new Date(endDate);
  while (cursor <= endD) {
    const dateStr = cursor.toISOString().slice(0, 10);
    const dow = (cursor.getDay() + 6) % 7; // Mon=0..Sun=6

    let isWorking = dow < 5; // fallback Mon-Fri
    const tpl = (schedule as any)?.work_schedule_templates;
    if (tpl?.is_active) {
      const numWeeks = tpl.weeks?.length ?? 1;
      let weekIdx = 0;
      if (tpl.week_type === "rotating") {
        weekIdx = getIsoWeek(cursor) % numWeeks;
      }
      const week =
        tpl.weeks?.find((w: any) => w.week_index === weekIdx) ??
        tpl.weeks?.[0];
      const dayConf = week?.days?.find((d: any) => d.day_of_week === dow);
      if (dayConf)
        isWorking = dayConf.is_working_day && dayConf.total_minutes > 0;
    }

    if (isWorking && !holidayDates.has(dateStr)) {
      let dayVal = 1;
      const isStart = dateStr === startDate;
      const isEnd = dateStr === endDate;
      if (isStart && isEnd) {
        if (startPeriod !== "full" || endPeriod !== "full") dayVal = 0.5;
      } else if (isStart && startPeriod === "afternoon") {
        dayVal = 0.5;
      } else if (isEnd && endPeriod === "morning") {
        dayVal = 0.5;
      }
      total += dayVal;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return total;
}

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

export async function POST(req: Request) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);

  // Required fields validation
  if (
    !body?.employee_id ||
    !body?.absence_type_id ||
    !body?.start_date ||
    !body?.start_period ||
    !body?.end_date ||
    !body?.end_period
  ) {
    return jsonError(
      "Se requieren: employee_id, absence_type_id, start_date, start_period, end_date, end_period"
    );
  }

  if (body.end_date < body.start_date) {
    return jsonError("La fecha de fin no puede ser anterior a la de inicio");
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (!company)
    return jsonError("Configura primero la empresa en Ajustes", 412);

  // Overlap check
  const { data: overlapping } = await supabase
    .from("absence_requests")
    .select("id")
    .eq("employee_id", body.employee_id)
    .not("status", "in", '("rejected","cancelled")')
    .lte("start_date", body.end_date)
    .gte("end_date", body.start_date)
    .limit(1);

  if (overlapping && overlapping.length > 0) {
    return jsonError(
      "El empleado ya tiene una ausencia registrada en esas fechas",
      409
    );
  }

  // Load absence type to check requires_approval
  const { data: absenceType } = await supabase
    .from("absence_types")
    .select("requires_approval")
    .eq("id", body.absence_type_id)
    .eq("company_id", company.id)
    .maybeSingle();

  if (!absenceType) return jsonError("Tipo de ausencia no encontrado", 404);

  // Calculate working days
  const workingDaysCount = await calcWorkingDays(
    supabase,
    company.id,
    body.employee_id,
    body.start_date,
    body.start_period,
    body.end_date,
    body.end_period
  );

  const status = absenceType.requires_approval ? "pending" : "approved";

  const { data, error: dbError } = await supabase
    .from("absence_requests")
    .insert({
      company_id: company.id,
      employee_id: body.employee_id,
      absence_type_id: body.absence_type_id,
      start_date: body.start_date,
      start_period: body.start_period,
      end_date: body.end_date,
      end_period: body.end_period,
      working_days_count: workingDaysCount,
      status,
      comment: body.comment ?? null,
      document_url: body.document_url ?? null,
      substitute_employee_id: body.substitute_employee_id ?? null,
      notify_employee_ids: body.notify_employee_ids ?? [],
    })
    .select("*, employees!employee_id(name, role_title), absence_types(name, color, icon)")
    .single();
  if (dbError) return jsonError(dbError.message, 500);

  return NextResponse.json({ request: data }, { status: 201 });
}
