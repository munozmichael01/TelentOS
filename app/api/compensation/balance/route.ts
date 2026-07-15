import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";
import { getCompanyId } from "@/lib/workspace";

export async function GET(req: Request) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const _cid = await getCompanyId(); const company = _cid ? { id: _cid } : null;
  if (!company) return jsonError("Configura primero la empresa en Ajustes", 412);

  const url = new URL(req.url);
  const employee_id = url.searchParams.get("employee_id");
  if (!employee_id) return jsonError("Se requiere employee_id");

  const today = new Date().toISOString().slice(0, 10);

  const { data: records, error: dbError } = await supabase
    .from("compensation_records")
    .select("balance_minutes, compensated_minutes")
    .eq("company_id", company.id)
    .eq("employee_id", employee_id)
    .lte("period_end", today);

  if (dbError) return jsonError(dbError.message, 500);

  let accumulated_minutes = 0;
  let compensated_minutes = 0;

  for (const r of records ?? []) {
    accumulated_minutes += r.balance_minutes ?? 0;
    compensated_minutes += r.compensated_minutes ?? 0;
  }

  const pending_minutes = accumulated_minutes - compensated_minutes;

  return NextResponse.json({
    balance: { accumulated_minutes, compensated_minutes, pending_minutes },
  });
}
