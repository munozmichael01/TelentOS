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

  // Validación del payload de semanas ANTES de cualquier mutación (auditoría de botones):
  // el reemplazo borra las semanas actuales, así que un input malformado NO debe llegar a
  // tocar la BD — si no, se perderían los datos sin posibilidad de rollback.
  const replaceWeeks = "weeks" in body;
  if (replaceWeeks) {
    if (!Array.isArray(body.weeks)) return jsonError("'weeks' debe ser un array");
    for (const week of body.weeks) {
      if (!week || typeof week.week_index !== "number") {
        return jsonError("Cada semana debe tener un week_index numérico");
      }
      if (week.days != null && !Array.isArray(week.days)) {
        return jsonError("'week.days' debe ser un array");
      }
      for (const d of week.days ?? []) {
        if (!d || typeof d.day_of_week !== "number") {
          return jsonError("Cada día debe tener un day_of_week numérico");
        }
      }
    }
  }

  const { data, error: dbError } = await supabase
    .from("work_schedule_templates")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("company_id", company.id)
    .select()
    .single();

  if (dbError) return jsonError("Plantilla no encontrada", 404);

  // Reemplazo ATÓMICO de semanas/días (migr. 0036): la función borra+reinserta en una
  // sola transacción — si algún insert falla, hace rollback y la plantilla no queda
  // corrupta. La RLS de work_schedule_weeks/days scopea el acceso a la empresa del caller
  // (security invoker), y la plantilla ya quedó verificada por empresa en el update de arriba.
  if (replaceWeeks) {
    const { error: rpcErr } = await supabase.rpc("replace_schedule_template_weeks", {
      p_template_id: params.id,
      p_weeks: body.weeks,
    });
    if (rpcErr) return jsonError(rpcErr.message, 500);
  }

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
