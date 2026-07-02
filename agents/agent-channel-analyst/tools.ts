import type { AgentTool } from "@/agents/core";
import { createAdminClient } from "@/lib/supabase/server";

type QueryArgs = {
  period?: string;
  sector?: string;
  location?: string;
  source?: string;
};

export async function queryChannelData(args: QueryArgs) {
  const supabase = createAdminClient();
  const { period = "30d", sector = "", location = "", source = "" } = args;

  const periodDays: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90, all: 0 };
  const days = periodDays[period] ?? 30;
  const since = days > 0 ? new Date(Date.now() - days * 86_400_000).toISOString() : null;

  let appQuery = supabase
    .from("applications")
    .select("utm, fit_score, status, created_at, jobs!inner(id, title, sector, location)")
    .not("utm", "is", null);
  if (since) appQuery = appQuery.gte("created_at", since);
  if (sector) appQuery = appQuery.eq("jobs.sector", sector);
  if (location) appQuery = appQuery.ilike("jobs.location", `%${location}%`);

  let campQuery = supabase
    .from("campaigns")
    .select("budget, spend, views, status, started_at, channels(name, utm_source)")
    .neq("status", "finished");
  if (since) campQuery = campQuery.gte("started_at", since);

  const [{ data: applications }, { data: campaigns }, { data: channels }] = await Promise.all([
    appQuery,
    campQuery,
    supabase.from("channels").select("id, name, utm_source, kind, base_cpa"),
  ]);

  type Agg = {
    applications: number;
    fit_scores: number[];
    hired: number;
    sectors: Record<string, number>;
    locations: Record<string, number>;
    top_jobs: Record<string, { title: string; count: number }>;
  };

  const bySource: Record<string, Agg> = {};

  for (const app of applications ?? []) {
    const utm = app.utm as Record<string, string> | null;
    const src = utm?.utm_source ?? "direct";
    if (source && src !== source) continue;
    const j = app.jobs as unknown as { id: string; title: string; sector: string | null; location: string | null } | null;
    if (!bySource[src]) bySource[src] = { applications: 0, fit_scores: [], hired: 0, sectors: {}, locations: {}, top_jobs: {} };
    const agg = bySource[src];
    agg.applications++;
    if (app.fit_score) agg.fit_scores.push(app.fit_score);
    if (app.status === "hired") agg.hired++;
    if (j?.sector) agg.sectors[j.sector] = (agg.sectors[j.sector] ?? 0) + 1;
    if (j?.location) agg.locations[j.location] = (agg.locations[j.location] ?? 0) + 1;
    if (j?.id) {
      if (!agg.top_jobs[j.id]) agg.top_jobs[j.id] = { title: j.title ?? "—", count: 0 };
      agg.top_jobs[j.id].count++;
    }
  }

  const campBySource: Record<string, { budget: number; spend: number; views: number; active: number; stale: number }> = {};
  for (const c of campaigns ?? []) {
    const ch = c.channels as unknown as { name: string; utm_source: string | null } | null;
    const src = ch?.utm_source ?? "unknown";
    if (!campBySource[src]) campBySource[src] = { budget: 0, spend: 0, views: 0, active: 0, stale: 0 };
    campBySource[src].budget += Number(c.budget);
    campBySource[src].spend += Number(c.spend);
    campBySource[src].views += Number(c.views);
    if (c.status === "active") campBySource[src].active++;
    const daysActive = c.started_at
      ? Math.floor((Date.now() - new Date(c.started_at).getTime()) / 86_400_000)
      : 0;
    if (c.status === "active" && daysActive >= 5 && (bySource[src]?.applications ?? 0) === 0) {
      campBySource[src].stale++;
    }
  }

  type Row = {
    source: string; channel_name: string; applications: number; hired: number;
    avg_fit: number | null; cpa: number | null; conversion: number | null;
    budget: number; spend: number; views: number; active_campaigns: number; stale_campaigns: number;
    top_sector: string | null; top_location: string | null; top_job: string | null;
  };

  const rows: Row[] = Object.entries(bySource)
    .map(([src, agg]) => {
      const camp = campBySource[src];
      const avg_fit = agg.fit_scores.length
        ? Math.round(agg.fit_scores.reduce((s, v) => s + v, 0) / agg.fit_scores.length)
        : null;
      const cpa = camp?.spend && agg.applications > 0 ? Math.round(camp.spend / agg.applications) : null;
      const conversion = camp?.views ? Math.round((agg.applications / camp.views) * 1000) / 10 : null;
      const top_sector = Object.entries(agg.sectors).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      const top_location = Object.entries(agg.locations).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      const top_job = Object.values(agg.top_jobs).sort((a, b) => b.count - a.count)[0] ?? null;
      return {
        source: src,
        channel_name: channels?.find((ch) => ch.utm_source === src)?.name ?? src,
        applications: agg.applications,
        hired: agg.hired,
        avg_fit,
        cpa,
        conversion,
        budget: camp?.budget ?? 0,
        spend: camp?.spend ?? 0,
        views: camp?.views ?? 0,
        active_campaigns: camp?.active ?? 0,
        stale_campaigns: camp?.stale ?? 0,
        top_sector,
        top_location,
        top_job: top_job ? `${top_job.title} (${top_job.count} aplic.)` : null,
      };
    })
    .sort((a, b) => b.applications - a.applications);

  // Also include channels with active campaigns but 0 applications (stale)
  for (const [src, camp] of Object.entries(campBySource)) {
    if (!bySource[src] && camp.active > 0) {
      const ch = channels?.find((c) => c.utm_source === src);
      rows.push({
        source: src,
        channel_name: ch?.name ?? src,
        applications: 0,
        hired: 0,
        avg_fit: null,
        cpa: null,
        conversion: null,
        budget: camp.budget,
        spend: camp.spend,
        views: camp.views,
        active_campaigns: camp.active,
        stale_campaigns: camp.stale,
        top_sector: null,
        top_location: null,
        top_job: null,
      });
    }
  }

  const total = rows.reduce((s, r) => s + r.applications, 0);
  return { rows, total_applications: total, period, filters: { sector, location, source } };
}

export const tools: AgentTool[] = [
  {
    definition: {
      type: "function",
      function: {
        name: "query_channel_data",
        description:
          "Consulta los datos reales de rendimiento de canales de distribución de esta cuenta. Aplica los filtros que correspondan según la pregunta del usuario. Llama a esta tool SIEMPRE antes de responder.",
        parameters: {
          type: "object",
          properties: {
            period: {
              type: "string",
              enum: ["7d", "30d", "90d", "all"],
              description: "Periodo de tiempo. '7d'=última semana, '30d'=último mes, '90d'=últimos 3 meses, 'all'=todo.",
            },
            sector: {
              type: "string",
              description: "Filtrar por sector de la oferta. Ej: 'Tecnología', 'Hostelería'.",
            },
            location: {
              type: "string",
              description: "Filtrar por ubicación (match parcial). Ej: 'Madrid', 'Barcelona'.",
            },
            source: {
              type: "string",
              description: "Filtrar por canal específico (utm_source). Ej: 'linkedin', 'infojobs', 'indeed'.",
            },
          },
        },
      },
    },
    execute: (args) => queryChannelData(args as QueryArgs),
  },
];
