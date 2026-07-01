import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";

export async function POST(req: Request) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const { data: company } = await supabase.from("companies").select("id").limit(1).maybeSingle();
  if (!company) return jsonError("Configura primero la empresa en Ajustes", 412);

  const body = await req.json().catch(() => null);
  if (!body?.employee_id) return jsonError("Se requiere employee_id");
  if (!body?.date) return jsonError("Se requiere date");

  const { employee_id, date } = body as { employee_id: string; date: string };

  // Load time entries for the day
  const { data: entries, error: entriesError } = await supabase
    .from("time_entries")
    .select("id, entry_type, start_time, end_time, duration_minutes")
    .eq("company_id", company.id)
    .eq("employee_id", employee_id)
    .eq("date", date);

  if (entriesError) return jsonError(entriesError.message, 500);

  // Load compliance config
  const { data: config, error: configError } = await supabase
    .from("compliance_config")
    .select("*")
    .eq("company_id", company.id)
    .maybeSingle();

  if (configError) return jsonError(configError.message, 500);

  // If no config, nothing to check
  if (!config) return NextResponse.json({ violations: [] });

  const workEntries = (entries ?? []).filter((e) => e.entry_type === "work");
  const breakEntries = (entries ?? []).filter((e) => e.entry_type === "break");

  const totalWorkMinutes = workEntries.reduce((sum, e) => sum + (e.duration_minutes ?? 0), 0);
  const totalBreakMinutes = breakEntries.reduce((sum, e) => sum + (e.duration_minutes ?? 0), 0);

  type ViolationInsert = {
    company_id: string;
    employee_id: string;
    date: string;
    time_entry_id: string | null;
    violation_type: string;
    description: string;
  };

  const newViolations: ViolationInsert[] = [];

  // 1. max_work_minutes_per_day
  if (config.max_work_minutes_per_day !== null && totalWorkMinutes > config.max_work_minutes_per_day) {
    newViolations.push({
      company_id: company.id,
      employee_id,
      date,
      time_entry_id: null,
      violation_type: "max_hours_exceeded",
      description: `Se trabajaron ${totalWorkMinutes} minutos, superando el límite de ${config.max_work_minutes_per_day} minutos.`,
    });
  }

  // 2. max_start_time_minutes — late start
  if (config.max_start_time_minutes !== null) {
    for (const entry of workEntries) {
      if (!entry.start_time) continue;
      const startDate = new Date(entry.start_time);
      const minuteOfDay = startDate.getUTCHours() * 60 + startDate.getUTCMinutes();
      if (minuteOfDay > config.max_start_time_minutes) {
        newViolations.push({
          company_id: company.id,
          employee_id,
          date,
          time_entry_id: entry.id,
          violation_type: "late_start",
          description: `Inicio de jornada a las ${String(startDate.getUTCHours()).padStart(2, "0")}:${String(startDate.getUTCMinutes()).padStart(2, "0")} UTC, posterior al límite permitido (${Math.floor(config.max_start_time_minutes / 60)}:${String(config.max_start_time_minutes % 60).padStart(2, "0")}).`,
        });
        break; // only report once per day
      }
    }
  }

  // 3. min_break_minutes — insufficient break (only if worked > 6h)
  if (
    config.min_break_minutes !== null &&
    totalWorkMinutes > 360 &&
    totalBreakMinutes < config.min_break_minutes
  ) {
    newViolations.push({
      company_id: company.id,
      employee_id,
      date,
      time_entry_id: null,
      violation_type: "insufficient_break",
      description: `Descanso de ${totalBreakMinutes} minutos insuficiente. Mínimo requerido: ${config.min_break_minutes} minutos.`,
    });
  }

  // 4. missing_break — no break entries at all after 6h work
  if (config.alert_on_missing_break && totalWorkMinutes > 360 && breakEntries.length === 0) {
    newViolations.push({
      company_id: company.id,
      employee_id,
      date,
      time_entry_id: null,
      violation_type: "missing_break",
      description: `No se registró ninguna pausa durante una jornada de ${totalWorkMinutes} minutos.`,
    });
  }

  if (newViolations.length === 0) return NextResponse.json({ violations: [] });

  // Fetch existing violations for this employee+date to avoid duplicates
  const { data: existing } = await supabase
    .from("compliance_violations")
    .select("violation_type")
    .eq("company_id", company.id)
    .eq("employee_id", employee_id)
    .eq("date", date);

  const existingTypes = new Set((existing ?? []).map((v) => v.violation_type));
  const toInsert = newViolations.filter((v) => !existingTypes.has(v.violation_type));

  if (toInsert.length === 0) return NextResponse.json({ violations: [] });

  const { data: created, error: insertError } = await supabase
    .from("compliance_violations")
    .insert(toInsert)
    .select();

  if (insertError) return jsonError(insertError.message, 500);
  return NextResponse.json({ violations: created ?? [] }, { status: 201 });
}
