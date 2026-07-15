import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";
import { getCompanyId } from "@/lib/workspace";

/**
 * Continuidad ATS → HRIS: promueve al candidato a empleado sin reintroducir
 * datos. Crea el empleado, mueve la candidatura a la etapa "Contratado" y
 * registra el evento.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => ({}));

  const { data: app } = await supabase
    .from("applications")
    .select("*, candidates(*), jobs(title, department), job_stages(name), offer_salary, offer_currency, offer_frequency, offer_start_date")
    .eq("id", params.id)
    .maybeSingle();
  if (!app) return jsonError("Candidatura no encontrada", 404);

  // Evita doble contratación
  const { data: existing } = await supabase
    .from("employees")
    .select("id")
    .eq("application_id", params.id)
    .maybeSingle();
  if (existing) return NextResponse.json({ employee_id: existing.id, already: true });

  const _cid = await getCompanyId(); const company = _cid ? { id: _cid } : null;
  if (!company) return jsonError("Configura primero la empresa en Ajustes", 412);

  const candidate = app.candidates as unknown as { id: string; name: string; email: string };
  const job = app.jobs as unknown as { title: string | null; department: string | null } | null;
  const { data: employee, error: empErr } = await supabase
    .from("employees")
    .insert({
      company_id: company.id,
      candidate_id: candidate.id,
      application_id: app.id,
      name: candidate.name,
      email: candidate.email,
      role_title: job?.title ?? null,
      department: job?.department ?? null,
      start_date: body.start_date ?? new Date().toISOString().slice(0, 10),
      contract_type: body.contract_type ?? "indefinido",
      manager_id: body.manager_id ?? null,
    })
    .select("id")
    .single();
  if (empErr) return jsonError(empErr.message, 500);

  // Mueve la candidatura a la etapa terminal "Contratado" si existe
  const { data: hiredStage } = await supabase
    .from("job_stages")
    .select("id, name")
    .eq("job_id", app.job_id)
    .ilike("name", "%contratado%")
    .maybeSingle();

  await supabase
    .from("applications")
    .update({ status: "hired", ...(hiredStage ? { stage_id: hiredStage.id } : {}) })
    .eq("id", params.id);

  await supabase.from("application_events").insert({
    application_id: params.id,
    type: "hired",
    from_stage: (app.job_stages as unknown as { name: string } | null)?.name ?? null,
    to_stage: hiredStage?.name ?? "Contratado",
    reason: body.reason ?? "Contratación confirmada — promovido a empleado",
    actor_id: user.id,
    actor_email: user.email,
  });

  return NextResponse.json({ employee_id: employee.id });
}
