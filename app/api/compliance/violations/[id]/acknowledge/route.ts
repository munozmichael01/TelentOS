import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const { supabase, error, user } = await requireUser();
  if (error) return error;

  const { data: company } = await supabase.from("companies").select("id").limit(1).maybeSingle();
  if (!company) return jsonError("Configura primero la empresa en Ajustes", 412);

  // Verify the violation belongs to this company
  const { data: violation } = await supabase
    .from("compliance_violations")
    .select("id")
    .eq("id", params.id)
    .eq("company_id", company.id)
    .maybeSingle();

  if (!violation) return jsonError("Infracción no encontrada", 404);

  // Resolve acknowledging employee record
  const { data: employeeRecord } = await supabase
    .from("employees")
    .select("id")
    .eq("company_id", company.id)
    .eq("auth_user_id", user!.id)
    .maybeSingle();

  const { data, error: dbError } = await supabase
    .from("compliance_violations")
    .update({
      acknowledged_at: new Date().toISOString(),
      acknowledged_by_employee_id: employeeRecord?.id ?? null,
    })
    .eq("id", params.id)
    .select()
    .single();

  if (dbError) return jsonError(dbError.message, 500);
  return NextResponse.json({ violation: data });
}
