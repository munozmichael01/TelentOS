import { runAgent, type AgentResult } from "@/agents/core";
import { SYSTEM_PROMPT } from "./prompt";
import { tools, queryChannelData } from "./tools";

export type AnalystResponse = {
  answer: string;
  suggested_questions: string[];
  redirect: { url: string; label: string } | null;
  filters_applied: { period?: string; sector?: string; location?: string; source?: string };
};

export type ChannelAnalystInput = {
  query: string;
  history: { role: "user" | "assistant"; content: string }[];
};

async function fallbackAnalysis(input: ChannelAnalystInput): Promise<AnalystResponse> {
  const data = await queryChannelData({ period: "30d" });
  const top = data.rows[0];
  const q = input.query.toLowerCase();

  let answer: string;

  if (q.includes("cpa") || q.includes("coste") || q.includes("cost")) {
    const withCpa = data.rows.filter((r) => r.cpa != null).sort((a, b) => (a.cpa ?? 999) - (b.cpa ?? 999));
    if (withCpa.length) {
      answer = `El canal con menor CPA es **${withCpa[0].channel_name}** con ${withCpa[0].cpa}€ por candidatura en los últimos 30 días. Total de ${data.total_applications} candidaturas registradas entre ${data.rows.length} canales.`;
    } else {
      answer = `No hay datos de campañas de pago activas en los últimos 30 días. Activa campañas desde la pestaña de Distribución de cada oferta para ver el CPA real.`;
    }
  } else if (q.includes("sector")) {
    const bySector: Record<string, number> = {};
    data.rows.forEach((r) => { if (r.top_sector) bySector[r.top_sector] = (bySector[r.top_sector] ?? 0) + r.applications; });
    const topSector = Object.entries(bySector).sort((a, b) => b[1] - a[1])[0];
    answer = topSector
      ? `El sector con más candidaturas este mes es **${topSector[0]}** con ${topSector[1]} inscripciones. El canal líder general es **${top?.channel_name ?? "—"}** con ${top?.applications ?? 0} candidaturas.`
      : `Sin datos de sector en los últimos 30 días. Asegúrate de que las ofertas tienen el campo sector configurado.`;
  } else if (q.includes("sin candidatura") || q.includes("stale") || q.includes("días")) {
    const stale = data.rows.filter((r) => r.stale_campaigns > 0);
    answer = stale.length
      ? `Hay ${stale.reduce((s, r) => s + r.stale_campaigns, 0)} campaña(s) con más de 5 días activas sin recibir candidaturas: ${stale.map((r) => r.channel_name).join(", ")}. Considera pausarlas o ajustar el presupuesto.`
      : `No hay campañas estancadas. Todas las campañas activas han recibido candidaturas en los últimos 5 días.`;
  } else {
    answer = top
      ? `El canal con más candidaturas en los últimos 30 días es **${top.channel_name}** con ${top.applications} inscripciones${top.cpa != null ? ` y un CPA de ${top.cpa}€` : ""}. Total: ${data.total_applications} candidaturas entre ${data.rows.length} canales activos.`
      : `Sin datos de candidaturas en los últimos 30 días. Genera URLs de tracking UTM desde la pestaña Distribución de cada oferta para empezar a medir.`;
  }

  return {
    answer,
    suggested_questions: [
      "¿Qué canal trajo más candidaturas este mes?",
      "¿Cuál es el canal con menor CPA?",
      "¿Qué campañas llevan más de 5 días sin candidaturas?",
      "¿Qué canal funciona mejor por sector?",
    ],
    redirect: null,
    filters_applied: { period: "30d" },
  };
}

export async function runChannelAnalyst(
  input: ChannelAnalystInput
): Promise<AgentResult<AnalystResponse>> {
  // Pass history as real OpenAI messages so the model has genuine conversational context
  const priorMessages = input.history.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  return runAgent<AnalystResponse>({
    agent: "channel-analyst",
    system: SYSTEM_PROMPT,
    user: input.query,
    priorMessages,
    tools,
    input,
    fallback: () => fallbackAnalysis(input),
  });
}
