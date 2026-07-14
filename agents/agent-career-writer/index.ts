import { z } from "zod";
import { runAgent, type AgentResult } from "@/agents/core";
import { SYSTEM_PROMPT } from "./prompt";

/**
 * Redactor del career site (agentes, superficie B-9 · rework 2026-07-14).
 * Genera TODO el contenido redactable del site DE UNA VEZ a partir del intake
 * (a qué os dedicáis, valores, beneficios, métricas, tono). Solo los bloques 🟢
 * (prosa anclada en el intake); nunca fabrica testimonios, imágenes ni cifras que
 * no estén en el intake. Nunca publica (invariante). Redacción → gpt-4o-mini.
 */

export type CareerTone = "cercano" | "profesional" | "creativo";

export type CareerIntake = {
  about: string;
  values: string[];
  benefits: string[];
  metrics: { value: string; label: string }[];
  tone: CareerTone;
};

const IconItem = z.object({ icon: z.string(), name: z.string() });
const Metric = z.object({ value: z.string(), label: z.string() });
const Faq = z.object({ question: z.string(), answer: z.string() });

/** Todas las claves 🟢 que la generación rellena de una vez. */
const SITE_SCHEMA = z.object({
  headline: z.string(),
  aboutTitle: z.string(),
  aboutDescription: z.string(),
  aboutMetrics: z.array(Metric),
  cultureTitle: z.string(),
  cultureDescription: z.string(),
  cultureValues: z.array(IconItem),
  benefitsTitle: z.string(),
  benefits: z.array(IconItem),
  lookingForTitle: z.string(),
  lookingForDescription: z.string(),
  faqsTitle: z.string(),
  faqs: z.array(Faq),
});

export type CareerSiteProposal = z.infer<typeof SITE_SCHEMA>;

export type CareerWriterInput = {
  companyId?: string;
  intake: CareerIntake;
  company?: { name?: string; description?: string | null; country?: string | null };
};

export type CareerWriterResult = { proposal: CareerSiteProposal; rationale?: string };

// Emojis por defecto para valores/beneficios cuando el fallback no tiene mapping.
const VALUE_EMOJI = ["🎯", "🤝", "🔧", "🌱", "⚡", "💡", "👥"];
const BENEFIT_EMOJI: Record<string, string> = {
  "seguro médico": "🏥", teletrabajo: "🏡", remoto: "🏡", formación: "📚",
  "viernes cortos": "🌴", "retribución flexible": "🍽️", vacaciones: "🌴",
};
function benefitIcon(name: string): string {
  const k = name.toLowerCase();
  for (const [key, icon] of Object.entries(BENEFIT_EMOJI)) if (k.includes(key)) return icon;
  return "✨";
}

/** Prosa determinista por tono — base del redactor y fallback sin OPENAI_API_KEY. */
const TONE_COPY: Record<CareerTone, { headlinePrefix: string; aboutTitle: string; cultureDesc: string; lookingTitle: string; lookingDesc: string }> = {
  cercano: {
    headlinePrefix: "Únete a",
    aboutTitle: "Quiénes somos",
    cultureDesc: "Lo que nos mueve cada día, sin postureo.",
    lookingTitle: "El perfil que buscamos",
    lookingDesc: "Buscamos gente con curiosidad y ganas de construir. Pedimos criterio, cuidado por el detalle y ganas de mejorar lo que tocas.",
  },
  profesional: {
    headlinePrefix: "Desarrolla tu carrera en",
    aboutTitle: "Acerca de la compañía",
    cultureDesc: "Los principios que guían nuestro trabajo.",
    lookingTitle: "El perfil que buscamos",
    lookingDesc: "Valoramos el rigor, la autonomía y la orientación a resultados, con capacidad de colaboración en equipos multidisciplinares.",
  },
  creativo: {
    headlinePrefix: "Ayúdanos a reinventar",
    aboutTitle: "Quiénes somos",
    cultureDesc: "Las ideas por las que nos levantamos.",
    lookingTitle: "A quién buscamos",
    lookingDesc: "Buscamos a quien cuestione, prototipe y no espere permiso para mejorar las cosas.",
  },
};

/** Fallback determinista: construye todo el site desde el intake, sin inventar hechos. */
function fallbackProposal(input: CareerWriterInput): CareerWriterResult {
  const { intake } = input;
  const t = TONE_COPY[intake.tone] ?? TONE_COPY.cercano;
  const name = input.company?.name ?? "nuestro equipo";
  const about = intake.about?.trim() || `Conoce a ${name} y por qué es un buen lugar para crecer.`;
  const remote = intake.benefits.some((b) => /remot|teletra/i.test(b));
  return {
    proposal: {
      headline: `${t.headlinePrefix} ${name}`,
      aboutTitle: t.aboutTitle,
      aboutDescription: about,
      aboutMetrics: intake.metrics.map((m) => ({ value: m.value, label: m.label })), // solo las del intake
      cultureTitle: "Nuestra cultura",
      cultureDescription: t.cultureDesc,
      cultureValues: intake.values.map((v, i) => ({ icon: VALUE_EMOJI[i % VALUE_EMOJI.length], name: v })),
      benefitsTitle: "Qué te ofrecemos",
      benefits: intake.benefits.map((b) => ({ icon: benefitIcon(b), name: b })),
      lookingForTitle: t.lookingTitle,
      lookingForDescription: t.lookingDesc,
      faqsTitle: "Preguntas frecuentes",
      faqs: [
        { question: "¿Cómo es el proceso de selección?", answer: "Una primera conversación, una prueba práctica corta y una charla con el equipo. Transparente y sin sorpresas." },
        { question: "¿Se puede teletrabajar?", answer: remote ? "Sí: teletrabajo flexible y horario adaptable." : "Trabajamos de forma flexible; lo concretamos en la primera llamada." },
        { question: "¿Cuáles son los siguientes pasos?", answer: "Aplica a una de nuestras ofertas y te contactamos para agendar la primera conversación." },
      ],
    },
  };
}

export async function runCareerWriter(input: CareerWriterInput): Promise<AgentResult<CareerWriterResult>> {
  const OutSchema = z.object({ proposal: SITE_SCHEMA, rationale: z.string().optional() });

  const ctx = input.company
    ? `Empresa: ${input.company.name ?? "—"}${input.company.country ? ` (${input.company.country})` : ""}.`
    : "";
  const it = input.intake;
  const user =
    `Genera el contenido del career site con este intake.\n${ctx}\n` +
    `Tono: ${it.tone}.\n` +
    `A qué se dedica: ${it.about || "(no especificado)"}.\n` +
    `Valores (un cultureValue por cada uno): ${it.values.join(", ") || "(ninguno)"}.\n` +
    `Beneficios (un benefit por cada uno): ${it.benefits.join(", ") || "(ninguno)"}.\n` +
    `Métricas (usa SOLO estas, vacío si no hay): ${it.metrics.map((m) => `${m.value} ${m.label}`).join(" · ") || "(ninguna)"}.`;

  const res = await runAgent<CareerWriterResult>({
    agent: "career-writer",
    model: "gpt-4o-mini",
    maxTokens: 1200,
    system: SYSTEM_PROMPT,
    user,
    tools: [],
    input: { companyId: input.companyId, tone: it.tone, values: it.values.length, benefits: it.benefits.length },
    validate: (v) => OutSchema.parse(v),
    fallback: () => fallbackProposal(input),
  });

  return { output: { proposal: res.output.proposal, rationale: res.output.rationale }, status: res.status };
}
