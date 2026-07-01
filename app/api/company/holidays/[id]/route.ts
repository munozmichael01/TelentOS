import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";

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

  if (body.date && !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    return jsonError("'date' debe tener el formato YYYY-MM-DD");
  }

  const allowed = ["name", "date", "repeats_annually", "is_half_day", "deducts_from_allowance"];
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
    .from("company_holidays")
    .update(updates)
    .eq("id", params.id)
    .eq("company_id", company.id)
    .select()
    .maybeSingle();
  if (dbError) return jsonError(dbError.message, 500);
  if (!data) return jsonError("Festivo no encontrado", 404);

  return NextResponse.json({ holiday: data });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const { data: company } = await supabase.from("companies").select("id").limit(1).maybeSingle();
  if (!company) return jsonError("Empresa no configurada", 412);

  // Verify ownership before deleting
  const { data: holiday } = await supabase
    .from("company_holidays")
    .select("id")
    .eq("id", params.id)
    .eq("company_id", company.id)
    .maybeSingle();
  if (!holiday) return jsonError("Festivo no encontrado", 404);

  const { error: dbError } = await supabase
    .from("company_holidays")
    .delete()
    .eq("id", params.id)
    .eq("company_id", company.id);
  if (dbError) return jsonError(dbError.message, 500);

  return NextResponse.json({ success: true });
}
