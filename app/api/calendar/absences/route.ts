import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";

export async function GET(req: Request) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  if (!from || !to)
    return jsonError("Los parámetros 'from' y 'to' son obligatorios (YYYY-MM-DD)");

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (!company)
    return jsonError("Configura primero la empresa en Ajustes", 412);

  // Return absences that overlap the requested range: start_date <= to AND end_date >= from
  const { data, error: dbError } = await supabase
    .from("absence_requests")
    .select(
      "*, employees!employee_id(name), absence_types(name, color, icon)"
    )
    .eq("company_id", company.id)
    .in("status", ["pending", "approved"])
    .lte("start_date", to)
    .gte("end_date", from)
    .order("start_date", { ascending: true });

  if (dbError) return jsonError(dbError.message, 500);

  return NextResponse.json({ absences: data });
}
