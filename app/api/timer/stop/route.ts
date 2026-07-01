import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";

export async function POST(req: Request) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const { data: company } = await supabase.from("companies").select("id").limit(1).maybeSingle();
  if (!company) return jsonError("Configura primero la empresa en Ajustes", 412);

  const body = await req.json().catch(() => null);
  if (!body?.employee_id) return jsonError("Se requiere employee_id");

  const employee_id: string = body.employee_id;

  // Load active timer
  const { data: timer, error: timerLoadError } = await supabase
    .from("timer_state")
    .select("id, started_at, entry_type")
    .eq("employee_id", employee_id)
    .maybeSingle();

  if (timerLoadError) return jsonError(timerLoadError.message, 500);
  if (!timer) return jsonError("No hay temporizador activo", 404);

  const now = new Date();
  const end_time = now.toISOString();
  const duration_minutes = Math.round(
    (now.getTime() - new Date(timer.started_at).getTime()) / 60000
  );

  // Find the open time_entry created by timer/start
  const { data: openEntry, error: findError } = await supabase
    .from("time_entries")
    .select("id")
    .eq("company_id", company.id)
    .eq("employee_id", employee_id)
    .eq("source", "timer")
    .is("end_time", null)
    .maybeSingle();

  if (findError) return jsonError(findError.message, 500);
  if (!openEntry) return jsonError("No se encontró la entrada de tiempo abierta", 404);

  // Update the open time_entry
  const { data: updatedEntry, error: updateError } = await supabase
    .from("time_entries")
    .update({
      end_time,
      duration_minutes,
      comment: body.comment ?? null,
    })
    .eq("id", openEntry.id)
    .select()
    .single();

  if (updateError) return jsonError(updateError.message, 500);

  // Delete timer_state
  const { error: deleteError } = await supabase
    .from("timer_state")
    .delete()
    .eq("employee_id", employee_id);

  if (deleteError) return jsonError(deleteError.message, 500);

  return NextResponse.json({ entry: updatedEntry });
}
