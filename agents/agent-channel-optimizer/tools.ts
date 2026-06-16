import type { AgentTool } from "@/agents/core";
import { getChannelPerformance } from "@/lib/data/channel-performance";
import { createClient } from "@/lib/supabase/server";

export const tools: AgentTool[] = [
  {
    definition: {
      type: "function",
      function: {
        name: "get_channels",
        description: "Lista los canales de distribución disponibles con su id, tipo y CPA base.",
        parameters: { type: "object", properties: {} },
      },
    },
    execute: async () => {
      const supabase = createClient();
      const { data } = await supabase.from("channels").select("id,name,kind,base_cpa,audience");
      return data ?? [];
    },
  },
  {
    definition: {
      type: "function",
      function: {
        name: "get_channel_performance",
        description:
          "Performance histórica de campañas por canal: CPA medio, conversión, índice de calidad (0-1), índice de volumen (0-1) y afinidad con el sector dado.",
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
];
