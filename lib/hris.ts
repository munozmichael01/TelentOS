/**
 * HRIS utility functions — shared by API routes.
 *
 * Design principles:
 * - All functions receive a `supabase` client so they work inside any request
 *   context (admin or user RLS) without coupling to server-only imports.
 * - `calculateWorkingDays` is the Gap-3 fix: it uses the employee's assigned
 *   work-schedule template (Feature 4) to determine which days are working
 *   days, falling back to Mon–Fri (0–4) when no schedule is assigned.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AbsencePeriod,
  WorkScheduleDay,
  AllowanceBalance,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Work-schedule helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the work_schedule_days row for an employee on a given calendar date.
 * Handles both single-week and rotating schedules.
 * Returns null if the employee has no schedule assigned or the template is
 * inactive — callers should treat null as a standard Mon-Fri workday.
 */
export async function getScheduleDayForEmployee(
  supabase: SupabaseClient,
  employeeId: string,
  date: string // "YYYY-MM-DD"
): Promise<WorkScheduleDay | null> {
  const { data: schedule } = await supabase
    .from("employee_schedules")
    .select("template_id, valid_from, valid_until, work_schedule_templates(id, week_type, is_active, weeks:work_schedule_weeks(id, week_index, days:work_schedule_days(*)))")
    .eq("employee_id", employeeId)
    .lte("valid_from", date)
    .or(`valid_until.is.null,valid_until.gte.${date}`)
    .order("valid_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!schedule) return null;
  const tpl = schedule.work_schedule_templates as unknown as {
    id: string;
    week_type: string;
    is_active: boolean;
    weeks: { id: string; week_index: number; days: WorkScheduleDay[] }[];
  } | null;
  if (!tpl?.is_active || !tpl.weeks?.length) return null;

  const d = new Date(date);
  const dayOfWeek = (d.getDay() + 6) % 7; // Mon=0 … Sun=6

  let weekIndex = 0;
  if (tpl.week_type === "rotating") {
    // Use ISO week number to determine which rotation week we're in
    const weekNum = getIsoWeek(d);
    weekIndex = weekNum % tpl.weeks.length;
  }

  const week = tpl.weeks.find((w) => w.week_index === weekIndex) ?? tpl.weeks[0];
  return week.days.find((dd) => dd.day_of_week === dayOfWeek) ?? null;
}

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

/**
 * Returns scheduled minutes for an employee on a given date.
 * Falls back to 480 min (8 h) for standard Mon-Fri when no schedule exists.
 */
export async function getScheduledMinutesForDate(
  supabase: SupabaseClient,
  employeeId: string,
  date: string
): Promise<number> {
  const day = await getScheduleDayForEmployee(supabase, employeeId, date);
  if (day === null) {
    // Fallback: Mon-Fri = 8 h, Sat/Sun = 0
    const d = new Date(date);
    const dow = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
    return dow < 5 ? 480 : 0;
  }
  return day.is_working_day ? day.total_minutes : 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Working-day count for absence requests (Gap fix #3)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Counts working days (from the employee's schedule, or Mon-Fri fallback)
 * between start_date and end_date inclusive, accounting for half-day periods.
 * Also subtracts company holidays that fall within the range.
 */
export async function calculateWorkingDays(
  supabase: SupabaseClient,
  employeeId: string,
  companyId: string,
  startDate: string,
  startPeriod: AbsencePeriod,
  endDate: string,
  endPeriod: AbsencePeriod
): Promise<number> {
  // Load company holidays in range
  const { data: holidays } = await supabase
    .from("company_holidays")
    .select("date, is_half_day, repeats_annually")
    .eq("company_id", companyId);

  const holidaySet = buildHolidaySet(holidays ?? [], startDate, endDate);

  let total = 0;
  const cursor = new Date(startDate);
  const end = new Date(endDate);

  while (cursor <= end) {
    const dateStr = cursor.toISOString().slice(0, 10);
    const scheduledMin = await getScheduledMinutesForDate(
      supabase,
      employeeId,
      dateStr
    );

    if (scheduledMin > 0) {
      const isHoliday = holidaySet.has(dateStr);
      if (!isHoliday) {
        let dayValue = 1;

        if (dateStr === startDate && dateStr === endDate) {
          if (startPeriod !== "full" && endPeriod !== "full") dayValue = 0.5;
          else if (startPeriod !== "full" || endPeriod !== "full") dayValue = 0.5;
        } else if (dateStr === startDate) {
          if (startPeriod === "afternoon") dayValue = 0.5;
        } else if (dateStr === endDate) {
          if (endPeriod === "morning") dayValue = 0.5;
        }

        total += dayValue;
      }
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return total;
}

function buildHolidaySet(
  holidays: { date: string; repeats_annually: boolean }[],
  from: string,
  to: string
): Set<string> {
  const fromYear = new Date(from).getFullYear();
  const toYear = new Date(to).getFullYear();
  const set = new Set<string>();
  for (const h of holidays) {
    if (h.repeats_annually) {
      for (let y = fromYear; y <= toYear; y++) {
        const d = `${y}-${h.date.slice(5)}`;
        if (d >= from && d <= to) set.add(d);
      }
    } else {
      if (h.date >= from && h.date <= to) set.add(h.date);
    }
  }
  return set;
}

// ─────────────────────────────────────────────────────────────────────────────
// Allowance balance calculation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates the full dynamic allowance balance for a given employee_allowance.
 * Balance = granted + carryover + adjustments − taken − pending − holidays − expired
 */
export async function calculateAllowanceBalance(
  supabase: SupabaseClient,
  employeeAllowanceId: string
): Promise<AllowanceBalance | null> {
  const { data: ea } = await supabase
    .from("employee_allowances")
    .select("*, allowance_policies(*, allowance_types(*))")
    .eq("id", employeeAllowanceId)
    .maybeSingle();

  if (!ea) return null;
  const policy = ea.allowance_policies as unknown as {
    id: string;
    amount: number;
    allowance_types: { id: string; name: string; unit: string };
  };

  const granted = Number(policy.amount);

  // Adjustments (manual/carryover/expiry entries)
  const { data: logs } = await supabase
    .from("allowance_adjustment_log")
    .select("amount, type")
    .eq("employee_allowance_id", employeeAllowanceId);

  let carryover = 0;
  let adjustments = 0;
  let expired = 0;

  for (const log of logs ?? []) {
    if (log.type === "carryover") carryover += Number(log.amount);
    else if (log.type === "expiry") expired += Math.abs(Number(log.amount));
    else adjustments += Number(log.amount);
  }

  // Absence requests — need to join employee_allowance → policy → allowance_type
  // then find absence requests where the absence_type deducts from this allowance_type
  const { data: employee } = await supabase
    .from("employee_allowances")
    .select("employee_id")
    .eq("id", employeeAllowanceId)
    .maybeSingle();

  if (!employee) return null;

  const { data: absenceTypes } = await supabase
    .from("absence_types")
    .select("id")
    .eq("allowance_type_id", policy.allowance_types.id)
    .eq("deducts_from_allowance", true);

  const absenceTypeIds = (absenceTypes ?? []).map((at) => at.id);

  let taken = 0;
  let pending = 0;

  if (absenceTypeIds.length > 0) {
    const { data: requests } = await supabase
      .from("absence_requests")
      .select("working_days_count, status")
      .eq("employee_id", employee.employee_id)
      .in("absence_type_id", absenceTypeIds)
      .in("status", ["approved", "pending"]);

    for (const req of requests ?? []) {
      if (req.status === "approved") taken += Number(req.working_days_count);
      else pending += Number(req.working_days_count);
    }
  }

  // Company holiday deductions (if any holidays deduct from allowance)
  // Simplified: count company holidays in the current cycle year
  const holidays = 0; // Extended: could count deducting holidays per cycle

  const available =
    granted + carryover + adjustments - taken - pending - holidays - expired;

  return {
    allowance_type: policy.allowance_types as never,
    policy: ea.allowance_policies as never,
    employee_allowance: ea as never,
    granted,
    carryover,
    adjustments,
    taken,
    pending,
    holidays,
    expired,
    available,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Time-tracking helpers
// ─────────────────────────────────────────────────────────────────────────────

export function minutesBetween(start: string, end: string): number {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
}

export function formatMinutes(min: number): string {
  const sign = min < 0 ? "-" : "";
  const abs = Math.abs(min);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}h${m > 0 ? ` ${m}m` : ""}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Overlap detection for absence requests
// ─────────────────────────────────────────────────────────────────────────────

export async function hasOverlappingAbsence(
  supabase: SupabaseClient,
  employeeId: string,
  startDate: string,
  endDate: string,
  excludeId?: string
): Promise<boolean> {
  let query = supabase
    .from("absence_requests")
    .select("id")
    .eq("employee_id", employeeId)
    .not("status", "in", '("rejected","cancelled")')
    .lte("start_date", endDate)
    .gte("end_date", startDate);

  if (excludeId) query = query.neq("id", excludeId);

  const { data } = await query;
  return (data?.length ?? 0) > 0;
}
