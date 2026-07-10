import { NextResponse } from "next/server";
import { requireApiRole, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";
import { generatePayRunLines } from "@/lib/payroll/generate-lines";

export async function GET() {
  const { companyId, error } = await requireApiRole(["owner", "hr_admin"]);
  if (error) return error;

  const db = createAdminClient();
  const { data: runs } = await db
    .from("pay_runs")
    .select("*")
    .eq("company_id", companyId!)
    .order("period_month", { ascending: false });

  return NextResponse.json({ runs: runs ?? [] });
}

export async function POST(req: Request) {
  const { companyId, user, error } = await requireApiRole(["owner", "hr_admin"]);
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body?.period_label || !body?.period_month || !body?.entity_name) {
    return jsonError("Faltan campos obligatorios", 400);
  }

  const db = createAdminClient();

  // AC-2c: block duplicate period + entity
  const { data: existing } = await db
    .from("pay_runs")
    .select("id")
    .eq("company_id", companyId!)
    .eq("period_month", body.period_month)
    .eq("entity_name", body.entity_name)
    .maybeSingle();

  if (existing) {
    return jsonError("Ya existe una corrida para este período y entidad", 409);
  }

  const { data: run, error: dbErr } = await db
    .from("pay_runs")
    .insert({
      company_id: companyId!,
      period_label: body.period_label,
      period_month: body.period_month,
      entity_name: body.entity_name,
      run_type: body.run_type ?? "monthly",
      currency: body.currency ?? "USD",
    })
    .select()
    .single();

  if (dbErr) return jsonError(dbErr.message, 500);

  const generatedBy = user?.email ?? "Sistema";
  const motorResult = await generatePayRunLines(run.id, companyId!, generatedBy).catch(
    (e) => ({ lineCount: 0, incidents: [], gross: 0, motorError: e instanceof Error ? e.message : "Error inesperado" }),
  );

  return NextResponse.json({ run, ...motorResult }, { status: 201 });
}
