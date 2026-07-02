import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { event_type, company_id, job_id } = await req.json();
    if (!event_type || !company_id) return NextResponse.json({ ok: false }, { status: 400 });

    const admin = createAdminClient();

    // Verify company exists to prevent abuse
    const { data: co } = await admin.from("companies").select("id").eq("id", company_id).maybeSingle();
    if (!co) return NextResponse.json({ ok: false }, { status: 404 });

    await admin.from("career_site_events").insert({
      company_id,
      event_type,
      job_id: job_id ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
