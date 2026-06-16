import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";

function businessDaysBetween(start: string, end: string): number {
  // Decisión: contamos días laborables (L-V) sin calendario de festivos —
  // suficiente para el saldo del eMVP.
  let count = 0;
  const d = new Date(start);
  const endDate = new Date(end);
  while (d <= endDate) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

export async function POST(req: Request) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body?.employee_id || !body?.start_date || !body?.end_date) {
    return jsonError("Se requieren 'employee_id', 'start_date' y 'end_date'");
  }
  if (body.end_date < body.start_date) return jsonError("Rango de fechas inválido");

  const days = businessDaysBetween(body.start_date, body.end_date);

  // Validación de saldo solo para vacaciones
  if ((body.type ?? "vacation") === "vacation") {
    const { data: employee } = await supabase
      .from("employees")
      .select("vacation_days_total")
      .eq("id", body.employee_id)
      .maybeSingle();
    const { data: approved } = await supabase
      .from("time_off_requests")
      .select("days")
      .eq("employee_id", body.employee_id)
      .eq("type", "vacation")
      .eq("status", "approved");
    const used = (approved ?? []).reduce((acc, r) => acc + Number(r.days), 0);
    const available = (employee?.vacation_days_total ?? 23) - used;
    if (days > available) {
      return jsonError(`Saldo insuficiente: quedan ${available} días disponibles`);
    }
  }

  const { data, error: dbError } = await supabase
    .from("time_off_requests")
    .insert({
      employee_id: body.employee_id,
      start_date: body.start_date,
      end_date: body.end_date,
      days,
      type: body.type ?? "vacation",
      comment: body.comment ?? null,
    })
    .select()
    .single();
  if (dbError) return jsonError(dbError.message, 500);
  return NextResponse.json({ request: data });
}
