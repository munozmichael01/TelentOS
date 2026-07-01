import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCompany } from "@/lib/workspace";

export async function GET() {
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
  const company = await getCompany();
  if (!company) return NextResponse.json({ error: "No company" }, { status: 401 });

  const body = await req.json();
  const supabase = createClient();

  const { data, error } = await supabase
    .from("career_site_pages")
    .upsert(
      {
        company_id: company.id,
        slug: company.slug,
        draft_content: body.draft_content ?? {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: "company_id" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
