import type { AgentTool } from "@/agents/core";
import { getChannelPerformance } from "@/lib/data/channel-performance";
import { createAdminClient } from "@/lib/supabase/server";

export const tools: AgentTool[] = [
  {
    definition: {
      type: "function",
      function: {
        name: "get_channels",
        description: "Lista los canales de distribución disponibles con su id, tipo, CPA base y utm_source.",
        parameters: { type: "object", properties: {} },
      },
    },
    execute: async () => {
      const supabase = createAdminClient();
      const { data } = await supabase.from("channels").select("id,name,kind,base_cpa,audience,utm_source");
      return data ?? [];
    },
  },
  {
    definition: {
      type: "function",
      function: {
        name: "get_channel_performance",
        description:
          "Benchmarks de industria por canal: CPA medio, tasa de conversión, índice de calidad (0-1), índice de volumen (0-1) y afinidad con el sector dado. Úsalo como referencia base cuando no haya datos reales de la oferta.",
        parameters: {
          type: "object",
          properties: {
            sector: { type: "string", description: "Sector de la oferta, ej. 'Tecnología'" },
          },
        },
      },
    },
    execute: (args) => getChannelPerformance(args.sector ? String(args.sector) : undefined),
  },
  {
    definition: {
      type: "function",
      function: {
        name: "get_job_channel_performance",
        description:
          "Performance REAL de esta oferta concreta por canal: candidaturas recibidas por utm_source, CPA real de campañas activas y días de actividad. Usa esto si ya hay datos disponibles — tiene prioridad sobre los benchmarks de industria. Si no hay datos reales suficientes (<3 candidaturas por canal), complementa con get_channel_performance.",
        parameters: {
          type: "object",
          properties: {
            job_id: { type: "string", description: "UUID de la oferta" },
          },
          required: ["job_id"],
        },
      },
    },
    execute: async (args) => {
      const supabase = createAdminClient();
      const jobId = String(args.job_id);

      const [{ data: applications }, { data: campaigns }] = await Promise.all([
        supabase.from("applications").select("utm, created_at").eq("job_id", jobId),
        supabase
          .from("campaigns")
          .select("*, channels(name, utm_source)")
          .eq("job_id", jobId)
          .neq("status", "finished"),
      ]);

      // Group real applications by utm_source
      const utmMap: Record<string, { applications: number; first_seen: string; last_seen: string }> = {};
      for (const app of applications ?? []) {
        const src = (app.utm as Record<string, string> | null)?.utm_source ?? "direct";
        if (!utmMap[src]) utmMap[src] = { applications: 0, first_seen: app.created_at, last_seen: app.created_at };
        utmMap[src].applications++;
        if (app.created_at > utmMap[src].last_seen) utmMap[src].last_seen = app.created_at;
      }

      const totalApps = Object.values(utmMap).reduce((s, v) => s + v.applications, 0);

      // Enrich campaigns with real CPA
      const activeCampaigns = (campaigns ?? []).map((c) => {
        const ch = c.channels as { name: string; utm_source: string | null } | null;
        const utmSrc = ch?.utm_source ?? "";
        const realApps = utmMap[utmSrc]?.applications ?? 0;
        const realCpa = realApps > 0 ? Number(c.spend) / realApps : null;
        const daysSinceStart = c.started_at
          ? Math.max(1, Math.round((Date.now() - new Date(c.started_at).getTime()) / 86_400_000))
          : null;
        return {
          channel: ch?.name ?? "Desconocido",
          utm_source: utmSrc,
          status: c.status,
          budget: c.budget,
          spend: c.spend,
          real_applications: realApps,
          real_cpa: realCpa,
          days_active: daysSinceStart,
          note:
            realApps === 0 && daysSinceStart && daysSinceStart >= 5
              ? "0 candidaturas tras " + daysSinceStart + " días — considera pausar o reasignar presupuesto"
              : null,
        };
      });

      return {
        total_applications: totalApps,
        has_real_data: totalApps >= 3,
        by_source: Object.entries(utmMap)
          .map(([source, data]) => ({ source, ...data }))
          .sort((a, b) => b.applications - a.applications),
        active_campaigns: activeCampaigns,
        insight:
          totalApps === 0
            ? "Sin candidaturas aún — usa benchmarks de industria para la recomendación inicial."
            : `${totalApps} candidaturas reales en total. ${activeCampaigns.filter((c) => c.note).length} campañas con bajo rendimiento detectadas.`,
      };
    },
  },
];
