import { runAgent, type AgentResult } from "@/agents/core";
import { SYSTEM_PROMPT } from "./prompt";
import { tools, getEmployeeContext } from "./tools";

export type OnboardingChecklist = {
  tasks: {
    title: string;
    description: string;
    assignee: string;
    due_offset_days: number;
  }[];
  rationale: string;
};

export type OnboardingBuilderInput = { employeeId: string };

/** Heurística sin LLM: checklist base + bloque específico por departamento. */
async function fallbackChecklist(input: OnboardingBuilderInput): Promise<OnboardingChecklist> {
  const ctx = await getEmployeeContext(input.employeeId);
  if ("error" in ctx) return { tasks: [], rationale: "Empleado no encontrado." };

  const managerName = ctx.manager?.name ?? "Manager";
  const dept = (ctx.employee.department ?? "").toLowerCase();

  const base = [
    { title: "Preparar equipo y accesos", description: "Portátil, email corporativo y herramientas base.", assignee: "IT", due_offset_days: -3 },
    { title: "Firma de contrato y alta laboral", description: "Contrato, alta en seguridad social y datos bancarios.", assignee: "People", due_offset_days: -1 },
    { title: "Sesión de bienvenida", description: "Presentación de la empresa, cultura y políticas internas.", assignee: "People", due_offset_days: 0 },
    { title: "Reunión 1:1 con manager", description: `Objetivos del primer mes con ${managerName}.`, assignee: managerName, due_offset_days: 1 },
  ];

  const byDept = dept.includes("engineer") || dept.includes("tecnolog")
    ? [
        { title: "Setup de entorno de desarrollo", description: "Repos, entorno local y acceso a staging.", assignee: "IT", due_offset_days: 1 },
        { title: "Walkthrough de arquitectura", description: "Sesión técnica con un senior del equipo.", assignee: managerName, due_offset_days: 3 },
        { title: "Primera tarea guiada", description: "Issue de complejidad baja con pair programming.", assignee: ctx.employee.name, due_offset_days: 5 },
      ]
    : dept.includes("venta") || dept.includes("comercial") || dept.includes("success")
      ? [
          { title: "Formación en producto", description: "Demo completa y casos de uso principales.", assignee: managerName, due_offset_days: 2 },
          { title: "Alta y formación en CRM", description: "Pipeline, reporting y cadencias.", assignee: "IT", due_offset_days: 2 },
          { title: "Shadowing de llamadas", description: "Acompañar 3 llamadas reales con un compañero senior.", assignee: managerName, due_offset_days: 4 },
        ]
      : [
          { title: "Formación en procesos del área", description: "Procedimientos, herramientas y seguridad del puesto.", assignee: managerName, due_offset_days: 2 },
          { title: "Presentación al equipo", description: "Ronda de presentaciones con el departamento.", assignee: managerName, due_offset_days: 0 },
        ];

  return {
    tasks: [...base, ...byDept, { title: "Revisión fin de primera semana", description: "Feedback bidireccional y resolución de bloqueos.", assignee: managerName, due_offset_days: 7 }],
    rationale: `Checklist heurístico (sin OPENAI_API_KEY) adaptado al departamento "${ctx.employee.department ?? "General"}".`,
  };
}

export async function runOnboardingBuilder(
  input: OnboardingBuilderInput
): Promise<AgentResult<OnboardingChecklist>> {
  return runAgent<OnboardingChecklist>({
    agent: "onboarding-builder",
    system: SYSTEM_PROMPT,
    user: `Genera el checklist de onboarding para el empleado con id "${input.employeeId}". Obtén primero su contexto con la tool.`,
    tools,
    input,
    fallback: () => fallbackChecklist(input),
  });
}
