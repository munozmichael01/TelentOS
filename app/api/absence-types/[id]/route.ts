import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const { data: company } = await supabase.from("companies").select("id").limit(1).maybeSingle();
  if (!company) return jsonError("Empresa no configurada", 412);

  const { data, error: dbError } = await supabase
    .from("absence_types")
    .select("*, allowance_type:allowance_types(id, name, unit)")
    .eq("id", params.id)
    .eq("company_id", company.id)
    .maybeSingle();
  if (dbError) return jsonError(dbError.message, 500);
  if (!data) return jsonError("Tipo de ausencia no encontrado", 404);

  return NextResponse.json({ absence_type: data });
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body || Object.keys(body).length === 0) return jsonError("No hay campos para actualizar");

  const { data: company } = await supabase.from("companies").select("id").limit(1).maybeSingle();
  if (!company) return jsonError("Empresa no configurada", 412);

  const allowed = [
    "name",
    "color",
    "icon",
    "requires_approval",
    "deducts_from_allowance",
    "allowance_type_id",
    "is_public",
    "requires_document",
    "allow_half_day",
    "is_active",
  ];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }
  if (updates.name && typeof updates.name === "string") {
    updates.name = updates.name.trim();
    if (!updates.name) return jsonError("El nombre no puede estar vacío");
  }
  updates.updated_at = new Date().toISOString();

  const { data, error: dbError } = await supabase
    .from("absence_types")
    .update(updates)
    .eq("id", params.id)
    .eq("company_id", company.id)
    .select("*, allowance_type:allowance_types(id, name, unit)")
    .maybeSingle();
  if (dbError) return jsonError(dbError.message, 500);
  if (!data) return jsonError("Tipo de ausencia no encontrado", 404);

  return NextResponse.json({ absence_type: data });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const { data: company } = await supabase.from("companies").select("id").limit(1).maybeSingle();
  if (!company) return jsonError("Empresa no configurada", 412);

  const { data, error: dbError } = await supabase
    .from("absence_types")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("company_id", company.id)
    .select("id")
    .maybeSingle();
  if (dbError) return jsonError(dbError.message, 500);
  if (!data) return jsonError("Tipo de ausencia no encontrado", 404);

  return NextResponse.json({ success: true });
}
