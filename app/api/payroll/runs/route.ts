import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api";

export async function GET() {
  const { supabase, companyId, error } = await requireApiRole(["owner", "hr_admin"]);
  if (error) return error;

  const { data: runs } = await supabase
    .from("pay_runs")
    .select("*")
    .eq("company_id", companyId!)
    .order("period_month", { ascending: false });

  return NextResponse.json({ runs: runs ?? [] });
}

export async function POST(req: Request) {
  const { supabase, companyId, error } = await requireApiRole(["owner", "hr_admin"]);
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body?.period_label || !body?.period_month || !body?.entity_name) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }

  const { data: run, error: dbErr } = await supabase
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

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json({ run });
}
