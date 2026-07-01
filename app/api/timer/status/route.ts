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

  const { data: timer, error: dbError } = await supabase
    .from("timer_state")
    .select("started_at, entry_type")
    .eq("employee_id", employee_id)
    .maybeSingle();

  if (dbError) return jsonError(dbError.message, 500);

  if (!timer) {
    return NextResponse.json({ active: false, timer: null });
  }

  const elapsed_minutes = Math.round(
    (Date.now() - new Date(timer.started_at).getTime()) / 60000
  );

  return NextResponse.json({
    active: true,
    timer: {
      started_at: timer.started_at,
      entry_type: timer.entry_type,
      elapsed_minutes,
    },
  });
}
