import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";
import { getCompanyId } from "@/lib/workspace";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const _cid = await getCompanyId(); const company = _cid ? { id: _cid } : null;
  if (!company) return jsonError("Configura primero la empresa en Ajustes", 412);

  const { data, error: dbError } = await supabase
    .from("time_entries")
    .select("*, employee:employees(name)")
    .eq("id", params.id)
    .eq("company_id", company.id)
    .maybeSingle();

  if (dbError) return jsonError(dbError.message, 500);
  if (!data) return jsonError("Registro no encontrado", 404);
  return NextResponse.json({ entry: data });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const _cid = await getCompanyId(); const company = _cid ? { id: _cid } : null;
  if (!company) return jsonError("Configura primero la empresa en Ajustes", 412);

  const { data: existing } = await supabase
    .from("time_entries")
    .select("id, start_time")
    .eq("id", params.id)
    .eq("company_id", company.id)
    .maybeSingle();
  if (!existing) return jsonError("Registro no encontrado", 404);

  const body = await req.json().catch(() => null);
  if (!body) return jsonError("Body inválido");

  const updates: Record<string, unknown> = {};
  if (body.comment !== undefined) updates.comment = body.comment;
  if (body.entry_type !== undefined) updates.entry_type = body.entry_type;

  if (body.end_time !== undefined) {
    updates.end_time = body.end_time;
    if (body.end_time) {
      const startTime = body.start_time ?? existing.start_time;
      updates.duration_minutes = Math.round(
        (new Date(body.end_time).getTime() - new Date(startTime).getTime()) / 60000
      );
    } else {
      updates.duration_minutes = null;
    }
  }
  if (body.start_time !== undefined) updates.start_time = body.start_time;

  const { data, error: dbError } = await supabase
    .from("time_entries")
    .update(updates)
    .eq("id", params.id)
    .eq("company_id", company.id)
    .select()
    .single();

  if (dbError) return jsonError(dbError.message, 500);
  return NextResponse.json({ entry: data });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const _cid = await getCompanyId(); const company = _cid ? { id: _cid } : null;
  if (!company) return jsonError("Configura primero la empresa en Ajustes", 412);

  const { data: existing } = await supabase
    .from("time_entries")
    .select("id")
    .eq("id", params.id)
    .eq("company_id", company.id)
    .maybeSingle();
  if (!existing) return jsonError("Registro no encontrado", 404);

  const { error: dbError } = await supabase
    .from("time_entries")
    .delete()
    .eq("id", params.id)
    .eq("company_id", company.id);

  if (dbError) return jsonError(dbError.message, 500);
  return NextResponse.json({ success: true });
}
