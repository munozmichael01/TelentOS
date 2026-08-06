import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Detalle de un recibo de nómina.
 *
 * Lo piden dos sitios: RR.HH. desde el perfil salarial y el propio empleado desde su portal. En
 * vez de duplicar el endpoint, la lectura va con la sesión del usuario y **es la RLS quien
 * decide**: RR.HH. ve los de su empresa, el empleado solo el suyo y solo de corridas cerradas
 * (migr. 0073 y 0077). Si no le corresponde, la consulta vuelve vacía y aquí sale un 404.
 */
export async function GET(_: Request, { params }: { params: { payslipId: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: payslip } = await supabase
    .from("payslips")
    .select("id, slip_number, generated_at, pay_run_line_id")
    .eq("id", params.payslipId)
    .maybeSingle();

  if (!payslip) return NextResponse.json({ error: "Recibo no encontrado" }, { status: 404 });

  const { data: line } = await supabase
    .from("pay_run_lines")
    .select("id, gross, net, employer_cost, pay_run_id, employee_id, employees(id, name, role_title, department)")
    .eq("id", payslip.pay_run_line_id)
    .maybeSingle();

  if (!line) return NextResponse.json({ error: "Línea no encontrada" }, { status: 404 });

  const { data: run } = await supabase
    .from("pay_runs")
    .select("id, period_label, period_month, currency, entity_name, company_id")
    .eq("id", (line as unknown as { pay_run_id: string }).pay_run_id)
    .maybeSingle();

  if (!run) return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const { data: items } = await supabase
    .from("pay_run_line_items")
    .select("id, category, label, amount, order_index")
    .eq("line_id", payslip.pay_run_line_id)
    .order("order_index");

  return NextResponse.json({ payslip, line, run, items: items ?? [] });
}
