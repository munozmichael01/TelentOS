import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";

export async function GET(req: Request) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const { data: company } = await supabase.from("companies").select("id").limit(1).maybeSingle();
  if (!company) return jsonError("Configura primero la empresa en Ajustes", 412);

  const url = new URL(req.url);
  const employee_id = url.searchParams.get("employee_id");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const unacknowledged = url.searchParams.get("unacknowledged");

  let query = supabase
    .from("compliance_violations")
    .select("*, employee:employees!employee_id(name)")
    .eq("company_id", company.id)
    .order("date", { ascending: false });

  if (employee_id) query = query.eq("employee_id", employee_id);
  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);
  if (unacknowledged === "true") query = query.is("acknowledged_at", null);

  const { data, error: dbError } = await query;
  if (dbError) return jsonError(dbError.message, 500);
  return NextResponse.json({ violations: data ?? [] });
}
