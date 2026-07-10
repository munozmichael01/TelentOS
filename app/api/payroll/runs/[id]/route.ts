import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const { companyId, error } = await requireApiRole(["owner", "hr_admin"]);
  if (error) return error;

  const db = createAdminClient();

  const [
    { data: run },
    { data: lines },
    { data: audit },
    { data: exportLog },
  ] = await Promise.all([
    db
      .from("pay_runs")
      .select("*")
      .eq("id", params.id)
      .eq("company_id", companyId!)
      .maybeSingle(),
    db
      .from("pay_run_lines")
      .select("*, employees(id, name, role_title, department)")
      .eq("pay_run_id", params.id)
      .order("created_at"),
    db
      .from("pay_run_audit_log")
      .select("*")
      .eq("pay_run_id", params.id)
      .order("created_at", { ascending: false })
      .limit(10),
    db
      .from("payroll_exports")
      .select("*")
      .eq("pay_run_id", params.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (!run) return NextResponse.json({ error: "Corrida no encontrada" }, { status: 404 });

  const lineIds = (lines ?? []).map((l: { id: string }) => l.id);
  const { data: lineItems } = lineIds.length
    ? await db
        .from("pay_run_line_items")
        .select("*")
        .in("line_id", lineIds)
        .order("order_index")
    : { data: [] };

  type LineItem = { id: string; line_id: string; category: string; label: string; amount: number; quantity_label: string | null; order_index: number };
  const itemsByLine: Record<string, LineItem[]> = {};
  for (const item of (lineItems ?? []) as LineItem[]) {
    if (!itemsByLine[item.line_id]) itemsByLine[item.line_id] = [];
    itemsByLine[item.line_id].push(item);
  }

  // Employees active during the period but with no line (AC-2f)
  const [periodYear, periodMonth] = run.period_month.split("-").map(Number);
  const period_end = new Date(periodYear, periodMonth, 0).toISOString().split("T")[0];
  const { data: allEmployees } = await db
    .from("employees")
    .select("id, name")
    .eq("company_id", companyId!)
    .eq("status", "active")
    .or(`start_date.is.null,start_date.lte.${period_end}`);

  const lineEmpIds = new Set((lines ?? []).map((l: { employee_id: string }) => l.employee_id));
  const withoutLine = (allEmployees ?? []).filter((e: { id: string }) => !lineEmpIds.has(e.id));

  return NextResponse.json({
    run,
    lines: lines ?? [],
    itemsByLine,
    audit: audit ?? [],
    exportLog: exportLog ?? [],
    withoutLine,
  });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { companyId, error } = await requireApiRole(["owner", "hr_admin"]);
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const allowed = ["status", "entity_name", "gross", "net", "employer_cost", "employee_count"];
  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) patch[key] = body[key];
  }

  const db = createAdminClient();
  const { data: run, error: dbErr } = await db
    .from("pay_runs")
    .update(patch)
    .eq("id", params.id)
    .eq("company_id", companyId!)
    .select()
    .maybeSingle();

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json({ run });
}
