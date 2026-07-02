import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const jobId = params.id;

  const [
    { data: job },
    { data: careerEvents },
    { data: applications },
    { data: channels },
    { data: latestPlan },
    { data: channelReport },
  ] = await Promise.all([
    supabase.from("jobs").select("id, companies(slug)").eq("id", jobId).maybeSingle(),
    supabase.from("career_site_events").select("id").eq("job_id", jobId).eq("event_type", "job_view"),
    supabase.from("applications").select("utm, created_at").eq("job_id", jobId),
    supabase.from("channels").select("*").neq("name", "Career Site").order("base_cpa"),
    // Most recent plan that hasn't been superseded or activated
    supabase
      .from("distribution_plans")
      .select("*")
      .eq("job_id", jobId)
      .in("status", ["pending", "activated"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Cross-job channel performance: aggregate by sector+location for reporting
    supabase
      .from("applications")
      .select("utm, job_id, jobs!inner(sector, location, title)")
      .not("utm", "is", null),
  ]);

  if (!job) return jsonError("Not found", 404);

  // Real application counts for this job by UTM source
  const utmMap: Record<string, number> = {};
  for (const app of applications ?? []) {
    const src = (app.utm as Record<string, string> | null)?.utm_source ?? "direct";
    utmMap[src] = (utmMap[src] ?? 0) + 1;
  }

  // Cross-job channel performance report: { channel → { total_apps, jobs: [{sector, location}] } }
  type ReportEntry = { applications: number; sectors: Record<string, number>; locations: Record<string, number> };
  const report: Record<string, ReportEntry> = {};
  for (const row of channelReport ?? []) {
    const src = (row.utm as Record<string, string> | null)?.utm_source;
    if (!src || src === "direct") continue;
    const job = row.jobs as unknown as { sector: string | null; location: string | null } | null;
    if (!report[src]) report[src] = { applications: 0, sectors: {}, locations: {} };
    report[src].applications++;
    if (job?.sector) report[src].sectors[job.sector] = (report[src].sectors[job.sector] ?? 0) + 1;
    if (job?.location) report[src].locations[job.location] = (report[src].locations[job.location] ?? 0) + 1;
  }

  const channelInsights = Object.entries(report)
    .map(([source, data]) => ({
      source,
      total_applications: data.applications,
      top_sector: Object.entries(data.sectors).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
      top_location: Object.entries(data.locations).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
    }))
    .sort((a, b) => b.total_applications - a.total_applications);

  return NextResponse.json({
    company_slug: (job.companies as unknown as { slug: string } | null)?.slug ?? "",
    career_site: {
      job_views: (careerEvents ?? []).length,
      applications: utmMap["career_site"] ?? 0,
    },
    utm_channels: Object.entries(utmMap)
      .filter(([src]) => src !== "career_site")
      .map(([source, count]) => ({ source, applications: count }))
      .sort((a, b) => b.applications - a.applications),
    channels: channels ?? [],
    active_plan: latestPlan ?? null,
    channel_insights: channelInsights,
  });
}
