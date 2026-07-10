import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireApiRole } from "@/lib/api";
import { getCompany } from "@/lib/workspace";

// El career site público lo editan roles de recruiting (M2) — un employee no.
const EDITOR_ROLES = ["owner", "hr_admin", "recruiter"] as const;

export async function GET() {
  const { error: authError } = await requireApiRole([...EDITOR_ROLES]);
  if (authError) return authError;

  const company = await getCompany();
  if (!company) return NextResponse.json({ data: null });

  const supabase = createClient();
  const { data } = await supabase
    .from("career_site_pages")
    .select("*")
    .eq("company_id", company.id)
    .maybeSingle();

  return NextResponse.json({ data });
}

export async function PATCH(req: Request) {
  const { error: authError } = await requireApiRole([...EDITOR_ROLES]);
  if (authError) return authError;

  const company = await getCompany();
  if (!company) return NextResponse.json({ error: "No company" }, { status: 401 });

  const body = await req.json();
  const supabase = createClient();

  const patch: Record<string, unknown> = {
    company_id: company.id,
    slug: company.slug,
    updated_at: new Date().toISOString(),
  };
  if ("draft_content" in body) patch.draft_content = body.draft_content ?? {};
  if ("branding" in body) patch.branding = body.branding ?? {};

  const { data, error } = await supabase
    .from("career_site_pages")
    .upsert(patch, { onConflict: "company_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
