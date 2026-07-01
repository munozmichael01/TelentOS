import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";
import { seedHrisDefaults } from "@/lib/hris-seed";

export async function POST() {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (!company) return jsonError("Configura primero la empresa en Ajustes", 412);

  await seedHrisDefaults(supabase, company.id);
  return NextResponse.json({ seeded: true });
}
