import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const { data: company } = await supabase.from("companies").select("id").limit(1).maybeSingle();
  if (!company) return jsonError("Configura primero la empresa en Ajustes", 412);

  // Verify the employee belongs to this company
  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("id", params.id)
    .eq("company_id", company.id)
    .maybeSingle();
  if (!employee) return jsonError("Empleado no encontrado", 404);

  const { data, error: dbError } = await supabase
    .from("compensation_records")
    .select("*")
    .eq("company_id", company.id)
    .eq("employee_id", params.id)
    .order("period_start", { ascending: false });

  if (dbError) return jsonError(dbError.message, 500);
  return NextResponse.json({ records: data ?? [] });
}
