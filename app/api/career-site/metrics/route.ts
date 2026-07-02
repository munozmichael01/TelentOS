import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getCompany } from "@/lib/workspace";
import type { CareerSiteMetrics } from "@/lib/career-site-types";

export async function GET(req: Request) {
  const company = await getCompany();
  if (!company) return NextResponse.json({ error: "No company" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const days = Math.min(parseInt(searchParams.get("days") ?? "30"), 365);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const admin = createAdminClient();

  try {
    // Page views
    const { count: pageViews } = await admin
      .from("career_site_events")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id)
      .eq("event_type", "page_view")
      .gte("created_at", since);

    // Job views
    const { count: jobViews } = await admin
      .from("career_site_events")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id)
      .eq("event_type", "job_view")
      .gte("created_at", since);

    // Applications via career site (event_type = 'application')
    const { count: applications } = await admin
      .from("career_site_events")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id)
      .eq("event_type", "application")
      .gte("created_at", since);

    // Top jobs by views
    const { data: jobViewRows } = await admin
      .from("career_site_events")
      .select("job_id")
      .eq("company_id", company.id)
      .eq("event_type", "job_view")
      .not("job_id", "is", null)
      .gte("created_at", since);

    // Aggregate job views in JS
    const jobViewCounts: Record<string, number> = {};
    for (const row of jobViewRows ?? []) {
      if (row.job_id) jobViewCounts[row.job_id] = (jobViewCounts[row.job_id] ?? 0) + 1;
    }

    const topJobIds = Object.entries(jobViewCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id);

    let topJobs: CareerSiteMetrics["topJobs"] = [];
    if (topJobIds.length > 0) {
      const supabase = createClient();
      const { data: jobRows } = await supabase
        .from("jobs")
        .select("id, title")
        .in("id", topJobIds);
      topJobs = (jobRows ?? []).map((j) => ({
        id: j.id,
        title: j.title,
        views: jobViewCounts[j.id] ?? 0,
      }));
    }

    const jv   = jobViews ?? 0;
    const apps = applications ?? 0;

    const metrics: CareerSiteMetrics = {
      pageViews: pageViews ?? 0,
      jobViews: jv,
      applications: apps,
      conversionRate: jv > 0 ? Math.round((apps / jv) * 1000) / 10 : 0,
      topJobs,
    };

    return NextResponse.json(metrics);
  } catch {
    // Table may not exist yet (migration pending)
    const empty: CareerSiteMetrics = { pageViews: 0, jobViews: 0, applications: 0, conversionRate: 0, topJobs: [] };
    return NextResponse.json(empty);
  }
}
