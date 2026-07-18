import type { AgentTool } from "@/agents/core";
import { createClient } from "@/lib/supabase/server";
import { searchJobs, type BoardSearchParams } from "@/lib/job-board/search";

// El asistente narra SOLO sobre ofertas reales devueltas por esta tool (búsqueda
// determinista, la misma searchJobs del board). Nunca inventa ofertas. El endpoint
// además re-ejecuta searchJobs con los filtros finales para los JobCards autoritativos.
export async function runBoardSearch(params: BoardSearchParams) {
  const supabase = createClient();
  const { jobs, total } = await searchJobs(supabase, { ...params, pageSize: 8 });
  return {
    total,
    jobs: jobs.map((j) => ({
      id: j.id, title: j.title, company: j.company?.name ?? null,
      city: j.city, modality: j.modality,
      salary_min: j.salary_min, salary_max: j.salary_max, salary_currency: j.salary_currency,
      employment_type: j.employment_type,
    })),
  };
}

export const tools: AgentTool[] = [
  {
    definition: {
      type: "function",
      function: {
        name: "search_board",
        description: "Busca ofertas activas reales en el job board con filtros. Devuelve el total y hasta 8 ofertas. Es la ÚNICA fuente de ofertas: nunca cites una que no venga de aquí.",
        parameters: {
          type: "object",
          properties: {
            q: { type: "string", description: "término principal (puesto/rol/tecnología)" },
            location: { type: "string", description: "ciudad o país" },
            modality: { type: "string", enum: ["presencial", "hibrido", "remoto"] },
            contract: { type: "string", description: "tipo de contrato (employment_type)" },
            category: { type: "string" },
            salaryMin: { type: "number" },
          },
        },
      },
    },
    execute: async (args) => runBoardSearch(args as BoardSearchParams),
  },
];
