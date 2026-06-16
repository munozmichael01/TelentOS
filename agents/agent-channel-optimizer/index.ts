import { runAgent, type AgentResult } from "@/agents/core";
import { getChannelPerformance } from "@/lib/data/channel-performance";
import { createClient } from "@/lib/supabase/server";
import type { Job } from "@/lib/types";
import { SYSTEM_PROMPT } from "./prompt";
import { tools } from "./tools";

export type ChannelRecommendation = {
  channel_id: string;
  channel_name: string;
  priority: number;
  budget: number;
  expected_cpa: number;
  expected_applications: number;
  copy: string;
  reason: string;
};

export type ChannelPlan = {
  recommendations: ChannelRecommendation[];
  rationale: string;
};

export type ChannelOptimizerInput = {
  job: Pick<Job, "id" | "title" | "sector" | "location" | "employment_type" | "salary_min" | "salary_max">;
  objective: "volume" | "quality" | "cpa";
  budget: number;
};

/** Heurística sin LLM: scoring por objetivo sobre la performance histórica. */
async function fallbackPlan(input: ChannelOptimizerInput): Promise<ChannelPlan> {
  const supabase = createClient();
  const { data: channels } = await supabase.from("channels").select("id,name,kind,base_cpa");
  const stats = getChannelPerformance(input.job.sector ?? undefined);

  const scored = (channels ?? [])
    .map((ch) => {
      const s = stats.find((x) => x.channel === ch.name);
      if (!s) return null;
      const affinity = s.sector_affinity === "alta" ? 1 : 0.6;
      const score =
        input.objective === "quality"
          ? s.quality_index * affinity
          : input.objective === "volume"
            ? s.volume_index * affinity
            : (1 / Math.max(s.avg_cpa, 1)) * 30 * affinity;
      return { ch, s, affinity, score };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const paid = scored.filter((x) => x.s.avg_cpa > 0);
  const totalScore = paid.reduce((acc, x) => acc + x.score, 0) || 1;
  const salary =
    input.job.salary_min && input.job.salary_max
      ? ` · ${Math.round(input.job.salary_min / 1000)}-${Math.round(input.job.salary_max / 1000)}k €`
      : "";

  return {
    recommendations: scored.map((x, i) => {
      const budget = Math.round((input.budget * x.score) / totalScore);
      const cpa = Math.round(x.s.avg_cpa / x.affinity);
      const copy =
        x.s.kind === "social"
          ? `🚀 Buscamos ${input.job.title}${input.job.location ? ` en ${input.job.location}` : ""}${salary}. Aplica en 2 minutos.`
          : `${input.job.title}${input.job.location ? ` — ${input.job.location}` : ""}${salary}. ${x.s.kind === "job_board" ? "Proceso ágil y feedback garantizado." : "Candidatura directa."}`;
      return {
        channel_id: x.ch.id,
        channel_name: x.ch.name,
        priority: i + 1,
        budget: cpa === 0 ? 0 : budget,
        expected_cpa: cpa,
        expected_applications: cpa === 0 ? Math.round(8 * x.s.volume_index) : Math.round(budget / Math.max(cpa, 1)),
        copy,
        reason: `${x.s.notes} (afinidad sectorial ${x.s.sector_affinity}).`,
      };
    }),
    rationale: `Plan heurístico (sin OPENAI_API_KEY) optimizado para "${input.objective}" sobre performance histórica de campañas en el sector ${input.job.sector ?? "General"}.`,
  };
}

export async function runChannelOptimizer(
  input: ChannelOptimizerInput
): Promise<AgentResult<ChannelPlan>> {
  const user = `Oferta a distribuir:\n${JSON.stringify(input.job, null, 2)}\n\nObjetivo: ${input.objective}\nPresupuesto total: ${input.budget} EUR\n\nGenera el plan de distribución.`;

  return runAgent<ChannelPlan>({
    agent: "channel-optimizer",
    system: SYSTEM_PROMPT,
    user,
    tools,
    input,
    fallback: () => fallbackPlan(input),
  });
}
