import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";

export async function GET(req: Request) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const { data: company } = await supabase.from("companies").select("id").limit(1).maybeSingle();
  if (!company) return jsonError("Configura primero la empresa en Ajustes", 412);

  const url = new URL(req.url);
  const employee_id = url.searchParams.get("employee_id");
  const date = url.searchParams.get("date");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  let query = supabase
    .from("time_entries")
    .select("*, employees(name, role_title)")
    .eq("company_id", company.id)
    .order("date", { ascending: false })
    .order("start_time", { ascending: false });

  if (employee_id) query = query.eq("employee_id", employee_id);
  if (date) query = query.eq("date", date);
  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);

  const { data, error: dbError } = await query;
  if (dbError) return jsonError(dbError.message, 500);
  return NextResponse.json({ entries: data ?? [] });
}

export async function POST(req: Request) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const { data: company } = await supabase.from("companies").select("id").limit(1).maybeSingle();
  if (!company) return jsonError("Configura primero la empresa en Ajustes", 412);

  const body = await req.json().catch(() => null);
  if (!body?.employee_id) return jsonError("Se requiere employee_id");
  if (!body?.date) return jsonError("Se requiere date");
  if (!body?.start_time) return jsonError("Se requiere start_time");

  let duration_minutes: number | null = null;
  if (body.end_time) {
    const [sh, sm] = String(body.start_time).split(":").map(Number);
    const [eh, em] = String(body.end_time).split(":").map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff > 0) duration_minutes = diff;
  }

  const { data, error: dbError } = await supabase
    .from("time_entries")
    .insert({
      company_id: company.id,
      employee_id: body.employee_id,
      date: body.date,
      start_time: body.start_time,
      end_time: body.end_time ?? null,
      duration_minutes,
      entry_type: body.entry_type ?? "work",
      comment: body.comment ?? null,
      source: body.source ?? "manual",
    })
    .select()
    .single();

  if (dbError) return jsonError(dbError.message, 500);
  return NextResponse.json({ entry: data }, { status: 201 });
}
