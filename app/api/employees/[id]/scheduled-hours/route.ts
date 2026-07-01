import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";

/** ISO week number (1-based) for a given date. */
function getIsoWeek(date: Date): number {
  const tmp = new Date(date);
  tmp.setHours(0, 0, 0, 0);
  tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));
  const week1 = new Date(tmp.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((tmp.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7
    )
  );
}

/** Convert JS getDay() (0=Sun..6=Sat) to Mon-based index (0=Mon..6=Sun). */
function jsDayToMonBased(jsDay: number): number {
  return (jsDay + 6) % 7;
}

/** Default fallback: Mon-Fri = 480 min (8 h), Sat-Sun = 0. */
function fallbackForDate(date: Date) {
  const dayOfWeek = jsDayToMonBased(date.getDay()); // 0=Mon..6=Sun
  const isWorkingDay = dayOfWeek <= 4; // Mon-Fri
  return {
    scheduled_minutes: isWorkingDay ? 480 : 0,
    is_working_day: isWorkingDay,
    slots: [] as { start: string; end: string }[],
    template_name: null as string | null,
    fallback: true,
  };
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const { data: company } = await supabase.from("companies").select("id").limit(1).maybeSingle();
  if (!company) return jsonError("Configura primero la empresa en Ajustes", 412);

  // Verify the employee belongs to this company
  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("id", params.id)
    .eq("company_id", company.id)
    .maybeSingle();
  if (!employee) return jsonError("Empleado no encontrado", 404);

  // Parse ?date=YYYY-MM-DD, default to today
  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date");
  const dateStr = dateParam ?? new Date().toISOString().slice(0, 10);

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return jsonError("Formato de fecha inválido. Use YYYY-MM-DD");
  }
  const targetDate = new Date(`${dateStr}T00:00:00`);
  if (isNaN(targetDate.getTime())) return jsonError("Fecha inválida");

  // Find active employee_schedule for the target date
  const { data: scheduleRow } = await supabase
    .from("employee_schedules")
    .select("template_id, valid_from, valid_until")
    .eq("employee_id", params.id)
    .lte("valid_from", dateStr)
    .or(`valid_until.is.null,valid_until.gte.${dateStr}`)
    .order("valid_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!scheduleRow) {
    return NextResponse.json({ date: dateStr, ...fallbackForDate(targetDate) });
  }

  // Load template with weeks and days
  const { data: template, error: tplErr } = await supabase
    .from("work_schedule_templates")
    .select("id, name, week_type, weeks:work_schedule_weeks(id, week_index, week_label, days:work_schedule_days(day_of_week, is_working_day, slots, total_minutes))")
    .eq("id", scheduleRow.template_id)
    .eq("company_id", company.id)
    .eq("is_active", true)
    .single();

  if (tplErr || !template) {
    // Template gone or deactivated — fall back gracefully
    return NextResponse.json({ date: dateStr, ...fallbackForDate(targetDate) });
  }

  const weeks: {
    id: string;
    week_index: number;
    week_label: string;
    days: {
      day_of_week: number;
      is_working_day: boolean;
      slots: { start: string; end: string }[];
      total_minutes: number;
    }[];
  }[] = (template.weeks ?? []).sort(
    (a: { week_index: number }, b: { week_index: number }) => a.week_index - b.week_index
  );

  if (weeks.length === 0) {
    return NextResponse.json({ date: dateStr, ...fallbackForDate(targetDate) });
  }

  // Determine which week to use
  let weekIndex = 0;
  if (template.week_type === "rotating" && weeks.length > 1) {
    const isoWeek = getIsoWeek(targetDate);
    weekIndex = (isoWeek - 1) % weeks.length;
  }

  const selectedWeek = weeks[weekIndex];

  // Find the day config for the date's day_of_week (0=Mon..6=Sun)
  const dayOfWeek = jsDayToMonBased(targetDate.getDay());
  const dayConfig = selectedWeek.days.find(
    (d: { day_of_week: number }) => d.day_of_week === dayOfWeek
  );

  if (!dayConfig) {
    return NextResponse.json({ date: dateStr, ...fallbackForDate(targetDate) });
  }

  return NextResponse.json({
    date: dateStr,
    scheduled_minutes: dayConfig.total_minutes,
    is_working_day: dayConfig.is_working_day,
    slots: dayConfig.slots ?? [],
    template_name: template.name,
    fallback: false,
  });
}
