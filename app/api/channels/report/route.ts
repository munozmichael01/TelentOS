import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";

export async function GET(req: Request) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") ?? "30d";
  const sector = searchParams.get("sector") ?? "";
  const location = searchParams.get("location") ?? "";
  const jobId = searchParams.get("job_id") ?? "";

  const periodDays: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90, all: 0 };
  const days = periodDays[period] ?? 30;
  const since = days > 0 ? new Date(Date.now() - days * 86_400_000).toISOString() : null;

  let appQuery = supabase
    .from("applications")
    .select("utm, fit_score, status, created_at, jobs!inner(id, title, sector, location, employment_type)")
    .not("utm", "is", null);
  if (since) appQuery = appQuery.gte("created_at", since);
  if (sector) appQuery = appQuery.eq("jobs.sector", sector);
  if (location) appQuery = appQuery.ilike("jobs.location", `%${location}%`);
  if (jobId) appQuery = appQuery.eq("job_id", jobId);

  let campQuery = supabase
    .from("campaigns")
    .select("channel_id, budget, spend, views, status, channels(name, utm_source)")
    .neq("status", "finished");
  if (since) campQuery = campQuery.gte("started_at", since);

  const [{ data: applications }, { data: campaigns }, { data: channels }, { data: sectorRows }, { data: jobs }] =
    await Promise.all([
      appQuery,
      campQuery,
      supabase.from("channels").select("id, name, utm_source, kind, base_cpa").order("name"),
      supabase.from("jobs").select("sector").not("sector", "is", null),
      supabase.from("jobs").select("id, title, sector, location").order("title"),
    ]);

  if (!applications) return jsonError("Error al obtener datos", 500);

  type ChannelAgg = {
    applications: number;
    fit_scores: number[];
    hired: number;
    sectors: Record<string, number>;
    locations: Record<string, number>;
    job_ids: Record<string, { title: string; count: number }>;
  };

  const byChannel: Record<string, ChannelAgg> = {};

  for (const app of applications) {
    const utm = app.utm as Record<string, string> | null;
    const src = utm?.utm_source ?? "direct";
    const j = app.jobs as unknown as { id: string; title: string; sector: string | null; location: string | null } | null;

    if (!byChannel[src]) {
      byChannel[src] = { applications: 0, fit_scores: [], hired: 0, sectors: {}, locations: {}, job_ids: {} };
    }
    const agg = byChannel[src];
    agg.applications++;
    if (app.fit_score) agg.fit_scores.push(app.fit_score);
    if (app.status === "hired") agg.hired++;
    if (j?.sector) agg.sectors[j.sector] = (agg.sectors[j.sector] ?? 0) + 1;
    if (j?.location) agg.locations[j.location] = (agg.locations[j.location] ?? 0) + 1;
    if (j?.id) {
      if (!agg.job_ids[j.id]) agg.job_ids[j.id] = { title: j.title ?? "—", count: 0 };
      agg.job_ids[j.id].count++;
    }
  }

  const campBySource: Record<string, { budget: number; spend: number; views: number; active: number }> = {};
  for (const c of campaigns ?? []) {
    const ch = c.channels as unknown as { name: string; utm_source: string | null } | null;
    const src = ch?.utm_source ?? "unknown";
    if (!campBySource[src]) campBySource[src] = { budget: 0, spend: 0, views: 0, active: 0 };
    campBySource[src].budget += Number(c.budget);
    campBySource[src].spend += Number(c.spend);
    campBySource[src].views += Number(c.views);
    if (c.status === "active") campBySource[src].active++;
  }

  const rows = Object.entries(byChannel)
    .map(([source, agg]) => {
      const camp = campBySource[source];
      const avg_fit = agg.fit_scores.length
        ? Math.round(agg.fit_scores.reduce((s, v) => s + v, 0) / agg.fit_scores.length)
        : null;
      const cpa = camp && agg.applications > 0 ? Math.round(camp.spend / agg.applications) : null;
      const conv = camp && camp.views > 0 ? Math.round((agg.applications / camp.views) * 1000) / 10 : null;
      const top_sector = Object.entries(agg.sectors).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      const top_location = Object.entries(agg.locations).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      const top_jobs = Object.entries(agg.job_ids)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .map(([id, v]) => ({ id, title: v.title, applications: v.count }));
      return {
        source,
        channel_name: channels?.find((ch) => ch.utm_source === source)?.name ?? source,
        applications: agg.applications,
        hired: agg.hired,
        avg_fit,
        cpa,
        conversion: conv,
        budget: camp?.budget ?? 0,
        spend: camp?.spend ?? 0,
        views: camp?.views ?? 0,
        active_campaigns: camp?.active ?? 0,
        top_sector,
        top_location,
        top_jobs,
      };
    })
    .sort((a, b) => b.applications - a.applications);

  const sectorSet = (sectorRows ?? []).map((j) => j.sector).filter((s): s is string => Boolean(s));
  const uniqueSectors = Array.from(new Set(sectorSet)).sort();

  return NextResponse.json({
    rows,
    channels: channels ?? [],
    sectors: uniqueSectors,
    jobs: jobs ?? [],
    meta: { period, since, sector, location, job_id: jobId, total_applications: applications.length },
  });
}
