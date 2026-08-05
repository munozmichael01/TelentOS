import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";
import { resolveActingEmployee } from "@/lib/api-self";

export async function POST(req: Request) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  // Sobre QUÉ empleado se actúa no se acepta del cliente: RR.HH. puede hacerlo por otro de su
  // empresa, cualquier otro rol solo por sí mismo. Sin esto, al abrir el portal un empleado
  // podría fichar (o pedir vacaciones) por un compañero.
  const acting = await resolveActingEmployee(body?.employee_id ?? null);
  if (acting.error) return acting.error;
  const employee_id = acting.employeeId;
  const company = { id: acting.companyId };
  const entry_type: string = body?.entry_type ?? "work";

  // Check for existing active timer
  const { data: existing } = await supabase
    .from("timer_state")
    .select("id")
    .eq("employee_id", employee_id)
    .maybeSingle();

  if (existing) return jsonError("Ya hay un temporizador activo", 409);

  const now = new Date().toISOString();

  // Insert timer_state
  const { data: timerState, error: timerError } = await supabase
    .from("timer_state")
    .insert({ employee_id, started_at: now, entry_type })
    .select()
    .single();

  if (timerError) return jsonError(timerError.message, 500);

  // Create open time_entry
  const today = now.slice(0, 10);
  const { data: timeEntry, error: entryError } = await supabase
    .from("time_entries")
    .insert({
      company_id: company.id,
      employee_id,
      date: today,
      start_time: now,
      end_time: null,
      duration_minutes: null,
      entry_type,
      source: "timer",
    })
    .select()
    .single();

  if (entryError) return jsonError(entryError.message, 500);

  return NextResponse.json({ timer: timerState, entry: timeEntry }, { status: 201 });
}
