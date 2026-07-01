import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";

export async function GET() {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const { data: company } = await supabase.from("companies").select("id").limit(1).maybeSingle();
  if (!company) return jsonError("Empresa no configurada", 412);

  const { data, error: dbError } = await supabase
    .from("absence_types")
    .select("*, allowance_type:allowance_types(id, name, unit)")
    .eq("company_id", company.id)
    .eq("is_active", true)
    .order("name");
  if (dbError) return jsonError(dbError.message, 500);

  return NextResponse.json({ absence_types: data });
}

export async function POST(req: Request) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body?.name?.trim()) return jsonError("El campo 'name' es obligatorio");

  const { data: company } = await supabase.from("companies").select("id").limit(1).maybeSingle();
  if (!company) return jsonError("Empresa no configurada", 412);

  const { data, error: dbError } = await supabase
    .from("absence_types")
    .insert({
      company_id: company.id,
      name: body.name.trim(),
      color: body.color ?? "#79746B",
      icon: body.icon ?? "📅",
      requires_approval: body.requires_approval ?? true,
      deducts_from_allowance: body.deducts_from_allowance ?? false,
      allowance_type_id: body.allowance_type_id ?? null,
      is_public: body.is_public ?? true,
      requires_document: body.requires_document ?? false,
      allow_half_day: body.allow_half_day ?? false,
    })
    .select("*, allowance_type:allowance_types(id, name, unit)")
    .single();
  if (dbError) return jsonError(dbError.message, 500);

  return NextResponse.json({ absence_type: data }, { status: 201 });
}
