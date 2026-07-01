import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";

export async function GET(_req: Request) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const { data: company } = await supabase.from("companies").select("id").limit(1).maybeSingle();
  if (!company) return jsonError("Configura primero la empresa en Ajustes", 412);

  // Get all employees for this company
  const { data: employees, error: empError } = await supabase
    .from("employees")
    .select("id, name")
    .eq("company_id", company.id);

  if (empError) return jsonError(empError.message, 500);

  // Get all active timers
  const { data: timers, error: timerError } = await supabase
    .from("timer_state")
    .select("employee_id, started_at, entry_type");

  if (timerError) return jsonError(timerError.message, 500);

  const timerMap = new Map(
    (timers ?? []).map((t) => [t.employee_id, t])
  );

  const now = Date.now();
  const clock_status = (employees ?? []).map((emp) => {
    const timer = timerMap.get(emp.id);
    if (timer) {
      const elapsed_minutes = Math.round(
        (now - new Date(timer.started_at).getTime()) / 60000
      );
      return {
        employee_id: emp.id,
        employee_name: emp.name,
        active: true,
        started_at: timer.started_at,
        elapsed_minutes,
        entry_type: timer.entry_type,
      };
    }
    return {
      employee_id: emp.id,
      employee_name: emp.name,
      active: false,
    };
  });

  return NextResponse.json({ clock_status });
}
