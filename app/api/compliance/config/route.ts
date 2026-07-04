import { NextResponse } from "next/server";
import { requireUser, requireApiRole, jsonError } from "@/lib/api";

export async function GET(_req: Request) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const { data: company } = await supabase.from("companies").select("id").limit(1).maybeSingle();
  if (!company) return jsonError("Configura primero la empresa en Ajustes", 412);

  const { data, error: dbError } = await supabase
    .from("compliance_config")
    .select("*")
    .eq("company_id", company.id)
    .maybeSingle();

  if (dbError) return jsonError(dbError.message, 500);

  // Return defaults if no config exists yet
  if (!data) {
    return NextResponse.json({
      config: {
        company_id: company.id,
        max_work_minutes_per_day: null,
        max_start_time_minutes: null,
        min_break_minutes: null,
        allow_start_with_break: false,
        allow_end_with_break: false,
        break_rules: null,
        alert_on_max_hours: false,
        alert_on_overtime_threshold_minutes: null,
        alert_on_missing_break: false,
      },
    });
  }

  return NextResponse.json({ config: data });
}

export async function PUT(req: Request) {
  const { supabase, error, user } = await requireApiRole(["owner", "hr_admin"]);
  if (error) return error;

  const { data: company } = await supabase.from("companies").select("id").limit(1).maybeSingle();
  if (!company) return jsonError("Configura primero la empresa en Ajustes", 412);

  const body = await req.json().catch(() => null);
  if (!body) return jsonError("Body inválido");

  const payload: Record<string, unknown> = {
    company_id: company.id,
    updated_at: new Date().toISOString(),
    updated_by: user!.id,
  };

  const fields = [
    "max_work_minutes_per_day",
    "max_start_time_minutes",
    "min_break_minutes",
    "allow_start_with_break",
    "allow_end_with_break",
    "break_rules",
    "alert_on_max_hours",
    "alert_on_overtime_threshold_minutes",
    "alert_on_missing_break",
  ] as const;

  for (const field of fields) {
    if (body[field] !== undefined) {
      payload[field] = body[field];
    }
  }

  const { data, error: dbError } = await supabase
    .from("compliance_config")
    .upsert(payload, { onConflict: "company_id" })
    .select()
    .single();

  if (dbError) return jsonError(dbError.message, 500);
  return NextResponse.json({ config: data });
}
