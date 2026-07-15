import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";
import { getCompanyId } from "@/lib/workspace";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const _cid = await getCompanyId(); const company = _cid ? { id: _cid } : null;
  if (!company) return jsonError("Empresa no configurada", 412);

  const { data, error: dbError } = await supabase
    .from("allowance_types")
    .select("*")
    .eq("id", params.id)
    .eq("company_id", company.id)
    .maybeSingle();
  if (dbError) return jsonError(dbError.message, 500);
  if (!data) return jsonError("Tipo de permiso no encontrado", 404);

  return NextResponse.json({ allowance_type: data });
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body || Object.keys(body).length === 0) return jsonError("No hay campos para actualizar");

  const _cid = await getCompanyId(); const company = _cid ? { id: _cid } : null;
  if (!company) return jsonError("Empresa no configurada", 412);

  const validUnits = ["days", "hours"];
  if (body.unit && !validUnits.includes(body.unit)) {
    return jsonError(`'unit' debe ser uno de: ${validUnits.join(", ")}`);
  }

  const allowed = ["name", "unit", "is_active"];
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
    .from("allowance_types")
    .update(updates)
    .eq("id", params.id)
    .eq("company_id", company.id)
    .select()
    .maybeSingle();
  if (dbError) return jsonError(dbError.message, 500);
  if (!data) return jsonError("Tipo de permiso no encontrado", 404);

  return NextResponse.json({ allowance_type: data });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const _cid = await getCompanyId(); const company = _cid ? { id: _cid } : null;
  if (!company) return jsonError("Empresa no configurada", 412);

  const { data, error: dbError } = await supabase
    .from("allowance_types")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("company_id", company.id)
    .select("id")
    .maybeSingle();
  if (dbError) return jsonError(dbError.message, 500);
  if (!data) return jsonError("Tipo de permiso no encontrado", 404);

  return NextResponse.json({ success: true });
}
