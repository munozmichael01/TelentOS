import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; lineId: string } },
) {
  const { companyId, user, error } = await requireApiRole(["owner", "hr_admin"]);
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body?.action) return NextResponse.json({ error: "Falta 'action'" }, { status: 400 });

  const db = createAdminClient();

  const { data: runCheck } = await db
    .from("pay_runs")
    .select("id")
    .eq("id", params.id)
    .eq("company_id", companyId!)
    .maybeSingle();
  if (!runCheck) return NextResponse.json({ error: "Corrida no encontrada" }, { status: 404 });

  const { data: line } = await db
    .from("pay_run_lines")
    .select("id, employee_id")
    .eq("id", params.lineId)
    .eq("pay_run_id", params.id)
    .maybeSingle();
  if (!line) return NextResponse.json({ error: "Línea no encontrada" }, { status: 404 });

  type Patch = Record<string, unknown>;
  let patch: Patch = {};
  let auditText = "";

  switch (body.action) {
    case "approve":
      patch = { status: "approved", has_adjustment_issue: false };
      auditText = "Línea aprobada";
      break;
    case "request_changes":
      patch = { status: "draft", has_adjustment_issue: true };
      auditText = body.note ? `Cambios solicitados: ${body.note}` : "Cambios solicitados";
      break;
    case "resolve_changes":
      patch = { has_adjustment_issue: false };
      auditText = "Incidencia de ajuste resuelta";
      break;
    default:
      return NextResponse.json({ error: `Acción inválida: ${body.action}` }, { status: 400 });
  }

  const { data: updated, error: dbErr } = await db
    .from("pay_run_lines")
    .update(patch)
    .eq("id", params.lineId)
    .select()
    .maybeSingle();

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  const { data: emp } = await db
    .from("employees")
    .select("name")
    .eq("id", line.employee_id)
    .maybeSingle();

  await db.from("pay_run_audit_log").insert({
    pay_run_id: params.id,
    text: `${auditText} · ${emp?.name ?? params.lineId}`,
    who: user?.email ?? "Sistema",
  });

  return NextResponse.json({ line: updated });
}
