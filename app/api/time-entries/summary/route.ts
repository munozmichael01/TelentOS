import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";

export async function GET(req: Request) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const { data: company } = await supabase.from("companies").select("id").limit(1).maybeSingle();
  if (!company) return jsonError("Configura primero la empresa en Ajustes", 412);

  const url = new URL(req.url);
  const employee_id = url.searchParams.get("employee_id");
  if (!employee_id) return jsonError("Se requiere employee_id");

  // Default to current week Mon–Sun
  let from = url.searchParams.get("from");
  let to = url.searchParams.get("to");
  if (!from || !to) {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday
    const diffToMon = (day === 0 ? -6 : 1 - day);
    const mon = new Date(now);
    mon.setDate(now.getDate() + diffToMon);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    from = from ?? fmt(mon);
    to = to ?? fmt(sun);
  }

  const { data: entries, error: dbError } = await supabase
    .from("time_entries")
    .select("date, entry_type, duration_minutes, end_time")
    .eq("company_id", company.id)
    .eq("employee_id", employee_id)
    .gte("date", from)
    .lte("date", to);

  if (dbError) return jsonError(dbError.message, 500);

  // Build a map of dates in range
  const dateMap: Record<
    string,
    { work_minutes: number; break_minutes: number; entries_count: number; has_open_entry: boolean }
  > = {};

  const start = new Date(from);
  const end = new Date(to);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dateMap[d.toISOString().slice(0, 10)] = {
      work_minutes: 0,
      break_minutes: 0,
      entries_count: 0,
      has_open_entry: false,
    };
  }

  for (const entry of entries ?? []) {
    const key = entry.date;
    if (!dateMap[key]) continue;
    dateMap[key].entries_count++;
    if (entry.end_time === null) {
      dateMap[key].has_open_entry = true;
    }
    const mins = entry.duration_minutes ?? 0;
    if (entry.entry_type === "work") {
      dateMap[key].work_minutes += mins;
    } else if (entry.entry_type === "break") {
      dateMap[key].break_minutes += mins;
    }
  }

  const summary = Object.entries(dateMap).map(([date, vals]) => ({ date, ...vals }));
  summary.sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({ summary });
}
