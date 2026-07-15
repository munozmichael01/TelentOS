import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";
import { getCompanyId } from "@/lib/workspace";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const _cid = await getCompanyId(); const company = _cid ? { id: _cid } : null;
  if (!company) return jsonError("Configura primero la empresa en Ajustes", 412);

  const { data, error: dbError } = await supabase
    .from("work_schedule_templates")
    .select("*, weeks:work_schedule_weeks(*, days:work_schedule_days(*))")
    .eq("id", params.id)
    .eq("company_id", company.id)
    .single();

  if (dbError) return jsonError("Plantilla no encontrada", 404);

  const template = {
    ...data,
    weeks: (data.weeks ?? [])
      .sort((a: { week_index: number }, b: { week_index: number }) => a.week_index - b.week_index)
      .map((w: { days: { day_of_week: number }[] }) => ({
        ...w,
        days: (w.days ?? []).sort(
          (a: { day_of_week: number }, b: { day_of_week: number }) => a.day_of_week - b.day_of_week
        ),
      })),
  };

  return NextResponse.json({ template });
}

const EDITABLE_FIELDS = ["name", "week_type", "is_default", "is_active"] as const;

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const _cid = await getCompanyId(); const company = _cid ? { id: _cid } : null;
  if (!company) return jsonError("Configura primero la empresa en Ajustes", 412);

  const body = await req.json().catch(() => ({}));

  const updates: Record<string, unknown> = {};
  for (const key of EDITABLE_FIELDS) {
    if (key in body) updates[key] = body[key];
  }
  if (Object.keys(updates).length === 0) return jsonError("No se enviaron campos a actualizar");

  if ("name" in updates && !String(updates.name).trim()) {
    return jsonError("El nombre no puede estar vacío");
  }
  if ("week_type" in updates && !["single", "rotating"].includes(updates.week_type as string)) {
    return jsonError("week_type debe ser 'single' o 'rotating'");
  }

  const { data, error: dbError } = await supabase
    .from("work_schedule_templates")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("company_id", company.id)
    .select()
    .single();

  if (dbError) return jsonError("Plantilla no encontrada", 404);
  return NextResponse.json({ template: data });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const _cid = await getCompanyId(); const company = _cid ? { id: _cid } : null;
  if (!company) return jsonError("Configura primero la empresa en Ajustes", 412);

  const { data, error: dbError } = await supabase
    .from("work_schedule_templates")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("company_id", company.id)
    .select()
    .single();

  if (dbError) return jsonError("Plantilla no encontrada", 404);
  return NextResponse.json({ template: data });
}
