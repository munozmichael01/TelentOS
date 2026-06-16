import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";
import { CHANNEL_STATS } from "@/lib/data/channel-performance";

/**
 * Mock de integración con job boards: simula el paso de un día de campaña
 * (views, aplicaciones y gasto coherentes con la performance del canal).
 * En producción, este endpoint sería el webhook/poller de cada integración.
 */
export async function POST(req: Request) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body?.jobId) return jsonError("Se requiere 'jobId'");

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("*, channels(name)")
    .eq("job_id", body.jobId)
    .eq("status", "active");

  for (const c of campaigns ?? []) {
    const channel = c.channels as unknown as { name: string } | null;
    const stats = CHANNEL_STATS.find((s) => s.channel === channel?.name);
    if (!stats) continue;

    const remaining = Math.max(0, Number(c.budget) - Number(c.spend));
    const dailyViews = Math.round((300 + Math.random() * 900) * stats.volume_index);
    const dailyApps = Math.max(0, Math.round(dailyViews * stats.avg_conversion * (0.7 + Math.random() * 0.6)));
    const dailySpend = stats.avg_cpa === 0 ? 0 : Math.min(remaining, Math.round(dailyApps * stats.avg_cpa * (0.8 + Math.random() * 0.4)));

    await supabase
      .from("campaigns")
      .update({
        views: c.views + dailyViews,
        applications: c.applications + (dailySpend === 0 && stats.avg_cpa > 0 ? 0 : dailyApps),
        spend: Number(c.spend) + dailySpend,
        // presupuesto agotado → la campaña termina
        status: stats.avg_cpa > 0 && Number(c.spend) + dailySpend >= Number(c.budget) && Number(c.budget) > 0 ? "finished" : "active",
      })
      .eq("id", c.id);
  }

  return NextResponse.json({ ok: true, updated: campaigns?.length ?? 0 });
}
