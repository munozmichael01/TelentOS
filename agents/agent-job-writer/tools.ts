import type { AgentTool } from "@/agents/core";
import { getMarketSalary, suggestSkills } from "@/lib/data/market";

export const tools: AgentTool[] = [
  {
    definition: {
      type: "function",
      function: {
        name: "get_market_salary",
        description:
          "Devuelve la banda salarial de mercado (min/max EUR anuales) para un título de puesto y ubicación en España.",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string", description: "Título del puesto" },
            location: { type: "string", description: "Ciudad o 'Remoto'" },
          },
          required: ["title"],
        },
      },
    },
    execute: (args) => getMarketSalary(String(args.title), args.location ? String(args.location) : undefined),
  },
  {
    definition: {
      type: "function",
      function: {
        name: "suggest_skills",
        description:
          "Devuelve las skills más habituales y el sector típico para un título de puesto.",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string", description: "Título del puesto" },
          },
          required: ["title"],
        },
      },
    },
    execute: (args) => suggestSkills(String(args.title)),
  },
];
