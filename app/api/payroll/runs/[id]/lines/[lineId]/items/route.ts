import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(
  req: Request,
  { params }: { params: { id: string; lineId: string } },
) {
  const { companyId, user, error } = await requireApiRole(["owner", "hr_admin"]);
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const { label, amount, category = "earning" } = body;
  if (!label || typeof amount !== "number") {
    return NextResponse.json({ error: "Faltan campos requeridos: label, amount" }, { status: 400 });
  }
  if (!["earning", "deduction"].includes(category)) {
    return NextResponse.json({ error: "category debe ser 'earning' o 'deduction'" }, { status: 400 });
  }

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

  const { data: lastItem } = await db
    .from("pay_run_line_items")
    .select("order_index")
    .eq("line_id", params.lineId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextIdx = lastItem ? lastItem.order_index + 1 : 1;

  const { data: newItem, error: insertErr } = await db
    .from("pay_run_line_items")
    .insert({
      line_id: params.lineId,
      category,
      label,
      amount: Math.abs(amount),
      order_index: nextIdx,
    })
    .select()
    .maybeSingle();

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  // Recalculate line totals (generic pack: net = gross = earnings - deductions)
  const { data: allItems } = await db
    .from("pay_run_line_items")
    .select("category, amount")
    .eq("line_id", params.lineId);

  type Item = { category: string; amount: number };
  const items = (allItems ?? []) as Item[];
  const earningsTotal = items.filter((i) => i.category === "earning").reduce((s, i) => s + i.amount, 0);
  const deductionsTotal = items.filter((i) => i.category === "deduction").reduce((s, i) => s + i.amount, 0);
  const newGross = earningsTotal - deductionsTotal;

  await db
    .from("pay_run_lines")
    .update({ gross: newGross, net: newGross, employer_cost: newGross })
    .eq("id", params.lineId);

  // Recalculate run totals
  const { data: allLines } = await db
    .from("pay_run_lines")
    .select("gross")
    .eq("pay_run_id", params.id);

  type LineRow = { gross: number };
  const runGross = ((allLines ?? []) as LineRow[]).reduce((s, l) => s + l.gross, 0);

  await db
    .from("pay_runs")
    .update({ gross: runGross, net: runGross, employer_cost: runGross })
    .eq("id", params.id);

  const { data: emp } = await db
    .from("employees")
    .select("name")
    .eq("id", line.employee_id)
    .maybeSingle();

  await db.from("pay_run_audit_log").insert({
    pay_run_id: params.id,
    text: `Ajuste manual · ${emp?.name ?? params.lineId} · "${label}" (${category === "earning" ? "+" : "−"}${Math.abs(amount).toFixed(2)})`,
    who: user?.email ?? "Sistema",
  });

  return NextResponse.json({ item: newItem });
}
