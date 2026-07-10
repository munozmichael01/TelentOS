import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireApiRole } from "@/lib/api";
import { getCompany } from "@/lib/workspace";

export async function POST(req: Request) {
  // Publicar la web pública de empleo: solo roles de recruiting (M2)
  const { error: authError } = await requireApiRole(["owner", "hr_admin", "recruiter"]);
  if (authError) return authError;

  const company = await getCompany();
  if (!company) return NextResponse.json({ error: "No company" }, { status: 401 });

  const body = await req.json();
  const supabase = createClient();

  if (body.unpublish) {
    const { error } = await supabase
      .from("career_site_pages")
      .update({ is_published: false, updated_at: new Date().toISOString() })
      .eq("company_id", company.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, is_published: false });
  }

  // Snapshot current draft as published_content
  const { data: current } = await supabase
    .from("career_site_pages")
    .select("draft_content")
    .eq("company_id", company.id)
    .maybeSingle();

  const { error } = await supabase
    .from("career_site_pages")
    .upsert(
      {
        company_id: company.id,
        slug: company.slug,
        is_published: true,
        published_at: new Date().toISOString(),
        published_content: current?.draft_content ?? {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: "company_id" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, is_published: true });
}
