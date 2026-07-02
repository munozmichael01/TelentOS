import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const jobId = params.id;

  const [{ data: job }, { data: careerEvents }, { data: applications }, { data: channels }] =
    await Promise.all([
      supabase.from("jobs").select("id, companies(slug)").eq("id", jobId).maybeSingle(),
      supabase
        .from("career_site_events")
        .select("id")
        .eq("job_id", jobId)
        .eq("event_type", "job_view"),
      supabase.from("applications").select("utm").eq("job_id", jobId),
      supabase.from("channels").select("*").neq("name", "Career Site").order("base_cpa"),
    ]);

  if (!job) return jsonError("Not found", 404);

  // Real application counts by UTM source
  const utmMap: Record<string, number> = {};
  for (const app of applications ?? []) {
    const src = (app.utm as Record<string, string> | null)?.utm_source ?? "direct";
    utmMap[src] = (utmMap[src] ?? 0) + 1;
  }

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
  });
}
