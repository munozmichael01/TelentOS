import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";

export async function GET() {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (!company) return jsonError("Configura primero la empresa en Ajustes", 412);

  const { data: insights, error: dbError } = await supabase
    .from("agent_insights")
    .select("*")
    .eq("company_id", company.id)
    .order("generated_at", { ascending: false })
    .limit(10);

  if (dbError) return jsonError(dbError.message, 500);
  return NextResponse.json({ insights: insights ?? [] });
}
