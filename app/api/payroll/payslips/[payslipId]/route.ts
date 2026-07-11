import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(_: Request, { params }: { params: { payslipId: string } }) {
  const { companyId, error } = await requireApiRole(["owner", "hr_admin"]);
  if (error) return error;

  const db = createAdminClient();

  const { data: payslip } = await db
    .from("payslips")
    .select("id, slip_number, generated_at, pay_run_line_id")
    .eq("id", params.payslipId)
    .maybeSingle();

  if (!payslip) return NextResponse.json({ error: "Recibo no encontrado" }, { status: 404 });

  const { data: line } = await db
    .from("pay_run_lines")
    .select("id, gross, net, employer_cost, pay_run_id, employee_id, employees(id, name, role_title, department)")
    .eq("id", payslip.pay_run_line_id)
    .maybeSingle();

  if (!line) return NextResponse.json({ error: "Línea no encontrada" }, { status: 404 });

  // Verificar acceso vía company_id en la corrida
  const { data: run } = await db
    .from("pay_runs")
    .select("id, period_label, period_month, currency, entity_name, company_id")
    .eq("id", (line as unknown as { pay_run_id: string }).pay_run_id)
    .eq("company_id", companyId!)
    .maybeSingle();

  if (!run) return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const { data: items } = await db
    .from("pay_run_line_items")
    .select("id, category, label, amount, order_index")
    .eq("line_id", payslip.pay_run_line_id)
    .order("order_index");

  return NextResponse.json({ payslip, line, run, items: items ?? [] });
}
