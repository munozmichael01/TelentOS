import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";

export async function GET() {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const { data: company } = await supabase.from("companies").select("id").limit(1).maybeSingle();
  if (!company) return jsonError("Empresa no configurada", 412);

  const { data, error: dbError } = await supabase
    .from("company_holidays")
    .select("*")
    .eq("company_id", company.id)
    .order("date");
  if (dbError) return jsonError(dbError.message, 500);

  return NextResponse.json({ holidays: data });
}

export async function POST(req: Request) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body?.name?.trim()) return jsonError("El campo 'name' es obligatorio");
  if (!body?.date) return jsonError("El campo 'date' es obligatorio");

  // Validate date format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    return jsonError("'date' debe tener el formato YYYY-MM-DD");
  }

  const { data: company } = await supabase.from("companies").select("id").limit(1).maybeSingle();
  if (!company) return jsonError("Empresa no configurada", 412);

  const { data, error: dbError } = await supabase
    .from("company_holidays")
    .insert({
      company_id: company.id,
      name: body.name.trim(),
      date: body.date,
      repeats_annually: body.repeats_annually ?? false,
      is_half_day: body.is_half_day ?? false,
      deducts_from_allowance: body.deducts_from_allowance ?? false,
    })
    .select()
    .single();
  if (dbError) return jsonError(dbError.message, 500);

  return NextResponse.json({ holiday: data }, { status: 201 });
}
