import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";

export async function POST(req: Request) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body?.employee_id || !body?.work_date || body.hours == null) {
    return jsonError("Se requieren 'employee_id', 'work_date' y 'hours'");
  }
  const hours = Number(body.hours);
  if (!(hours > 0 && hours <= 24)) return jsonError("Horas inválidas (0–24)");

  const { data, error: dbError } = await supabase
    .from("timesheets")
    .insert({
      employee_id: body.employee_id,
      work_date: body.work_date,
      hours,
      notes: body.notes ?? null,
    })
    .select()
    .single();
  if (dbError) return jsonError(dbError.message, 500);
  return NextResponse.json({ timesheet: data });
}
