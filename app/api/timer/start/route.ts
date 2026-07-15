import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";
import { getCompanyId } from "@/lib/workspace";

export async function POST(req: Request) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const _cid = await getCompanyId(); const company = _cid ? { id: _cid } : null;
  if (!company) return jsonError("Configura primero la empresa en Ajustes", 412);

  const body = await req.json().catch(() => null);
  if (!body?.employee_id) return jsonError("Se requiere employee_id");

  const employee_id: string = body.employee_id;
  const entry_type: string = body.entry_type ?? "work";

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
