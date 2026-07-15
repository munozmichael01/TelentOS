import { NextResponse } from "next/server";
import { requireApiRole, jsonError } from "@/lib/api";

const EDITABLE = [
  "name", "email", "role_title", "department", "start_date",
  "contract_type", "manager_id", "vacation_days_total", "status",
  "national_id", "birth_date", "address",
  "phone", "emergency_contact_name", "emergency_contact_phone",
  "seniority_level", "country", "city", "work_location", "work_modality",
  "legal_entity", "benefits",
] as const;

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { supabase, error } = await requireApiRole(["owner", "hr_admin"]);
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};
  for (const key of EDITABLE) {
    if (key in body) updates[key] = body[key] === "" ? null : body[key];
  }
  if (updates.manager_id === params.id) return jsonError("Un empleado no puede reportarse a sí mismo");

  const { data, error: dbError } = await supabase
    .from("employees")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single();
  if (dbError) return jsonError(dbError.message, 500);
  return NextResponse.json({ employee: data });
}
