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

export async function POST(req: Request) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (
    !body?.employee_id ||
    !body?.start_date ||
    !body?.start_period ||
    !body?.end_date ||
    !body?.end_period
  ) {
    return jsonError(
      "Se requieren: employee_id, start_date, start_period, end_date, end_period"
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

  const companyId = body.company_id ?? company.id;

  const working_days = await calcWorkingDays(
    supabase,
    companyId,
    body.employee_id,
    body.start_date,
    body.start_period,
    body.end_date,
    body.end_period
  );

  return NextResponse.json({ working_days });
}
