import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";
import { getCompanyId } from "@/lib/workspace";

export async function GET(_req: Request) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const _cid = await getCompanyId(); const company = _cid ? { id: _cid } : null;
  if (!company) return jsonError("Configura primero la empresa en Ajustes", 412);

  const { data, error: dbError } = await supabase
    .from("work_schedule_templates")
    .select("*, weeks:work_schedule_weeks(*, days:work_schedule_days(*))")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  if (dbError) return jsonError(dbError.message, 500);

  // Sort weeks by week_index and days by day_of_week in memory
  const templates = (data ?? []).map((t) => ({
    ...t,
    weeks: (t.weeks ?? [])
      .sort((a: { week_index: number }, b: { week_index: number }) => a.week_index - b.week_index)
      .map((w: { days: { day_of_week: number }[] }) => ({
        ...w,
        days: (w.days ?? []).sort(
          (a: { day_of_week: number }, b: { day_of_week: number }) => a.day_of_week - b.day_of_week
        ),
      })),
  }));

  return NextResponse.json({ templates });
}

export async function POST(req: Request) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const _cid = await getCompanyId(); const company = _cid ? { id: _cid } : null;
  if (!company) return jsonError("Configura primero la empresa en Ajustes", 412);

  const body = await req.json().catch(() => null);
  if (!body?.name?.trim()) return jsonError("El nombre de la plantilla es obligatorio");
  if (!["single", "rotating"].includes(body?.week_type)) {
    return jsonError("week_type debe ser 'single' o 'rotating'");
  }
  if (!Array.isArray(body?.weeks) || body.weeks.length === 0) {
    return jsonError("Se requiere al menos una semana");
  }

  // 1. Insert template
  const { data: template, error: tplErr } = await supabase
    .from("work_schedule_templates")
    .insert({
      company_id: company.id,
      name: body.name.trim(),
      week_type: body.week_type,
      is_default: body.is_default ?? false,
      is_active: true,
    })
    .select()
    .single();
  if (tplErr) return jsonError(tplErr.message, 500);

  // 2 & 3. Insert weeks and their days sequentially
  for (const week of body.weeks) {
    if (week.week_index === undefined || week.week_index === null) {
      return jsonError("Cada semana debe tener week_index");
    }

    const { data: insertedWeek, error: wkErr } = await supabase
      .from("work_schedule_weeks")
      .insert({
        template_id: template.id,
        week_label: week.week_label ?? `Semana ${week.week_index + 1}`,
        week_index: week.week_index,
      })
      .select()
      .single();
    if (wkErr) return jsonError(wkErr.message, 500);

    if (Array.isArray(week.days) && week.days.length > 0) {
      const days = week.days.map((d: {
        day_of_week: number;
        is_working_day: boolean;
        slots: { start: string; end: string }[];
        total_minutes: number;
      }) => ({
        week_id: insertedWeek.id,
        day_of_week: d.day_of_week,
        is_working_day: d.is_working_day ?? false,
        slots: d.slots ?? [],
        total_minutes: d.total_minutes ?? 0,
      }));

      const { error: dayErr } = await supabase.from("work_schedule_days").insert(days);
      if (dayErr) return jsonError(dayErr.message, 500);
    }
  }

  // Return the full template with weeks+days
  const { data: full, error: fetchErr } = await supabase
    .from("work_schedule_templates")
    .select("*, weeks:work_schedule_weeks(*, days:work_schedule_days(*))")
    .eq("id", template.id)
    .single();
  if (fetchErr) return jsonError(fetchErr.message, 500);

  const result = {
    ...full,
    weeks: (full.weeks ?? [])
      .sort((a: { week_index: number }, b: { week_index: number }) => a.week_index - b.week_index)
      .map((w: { days: { day_of_week: number }[] }) => ({
        ...w,
        days: (w.days ?? []).sort(
          (a: { day_of_week: number }, b: { day_of_week: number }) => a.day_of_week - b.day_of_week
        ),
      })),
  };

  return NextResponse.json({ template: result }, { status: 201 });
}
