import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";

export async function GET() {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const { data: company } = await supabase.from("companies").select("id").limit(1).maybeSingle();
  if (!company) return jsonError("Empresa no configurada", 412);

  const { data, error: dbError } = await supabase
    .from("allowance_types")
    .select("*")
    .eq("company_id", company.id)
    .eq("is_active", true)
    .order("name");
  if (dbError) return jsonError(dbError.message, 500);

  return NextResponse.json({ allowance_types: data });
}

export async function POST(req: Request) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body?.name?.trim()) return jsonError("El campo 'name' es obligatorio");

  const validUnits = ["days", "hours"];
  if (body.unit && !validUnits.includes(body.unit)) {
    return jsonError(`'unit' debe ser uno de: ${validUnits.join(", ")}`);
  }

  const { data: company } = await supabase.from("companies").select("id").limit(1).maybeSingle();
  if (!company) return jsonError("Empresa no configurada", 412);

  const { data, error: dbError } = await supabase
    .from("allowance_types")
    .insert({
      company_id: company.id,
      name: body.name.trim(),
      unit: body.unit ?? "days",
    })
    .select()
    .single();
  if (dbError) return jsonError(dbError.message, 500);

  return NextResponse.json({ allowance_type: data }, { status: 201 });
}
