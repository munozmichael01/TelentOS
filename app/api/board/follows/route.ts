import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api";

// Seguir empresa (candidato). RLS `company_follows_own`. GET ?companyId= → { following }.
// POST { companyId } sigue; DELETE ?companyId= deja de seguir.

export async function GET(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ following: false });
  const companyId = new URL(req.url).searchParams.get("companyId");
  if (!companyId) return jsonError("Falta companyId");
  const { data } = await supabase.from("company_follows").select("company_id").eq("user_id", user.id).eq("company_id", companyId).maybeSingle();
  return NextResponse.json({ following: !!data });
}

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return jsonError("No autenticado", 401);
  const body = await req.json().catch(() => null);
  const companyId = String(body?.companyId ?? "");
  if (!companyId) return jsonError("Falta companyId");
  const { error } = await supabase.from("company_follows").upsert({ user_id: user.id, company_id: companyId });
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ following: true });
}

export async function DELETE(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return jsonError("No autenticado", 401);
  const companyId = new URL(req.url).searchParams.get("companyId");
  if (!companyId) return jsonError("Falta companyId");
  const { error } = await supabase.from("company_follows").delete().eq("user_id", user.id).eq("company_id", companyId);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ following: false });
}
