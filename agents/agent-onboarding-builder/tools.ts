import type { AgentTool } from "@/agents/core";
import { createClient } from "@/lib/supabase/server";

export async function getEmployeeContext(employeeId: string) {
  const supabase = createClient();
  const { data: employee } = await supabase
    .from("employees")
    .select("id,name,role_title,department,start_date,contract_type,manager_id")
    .eq("id", employeeId)
    .maybeSingle();
  if (!employee) return { error: "Empleado no encontrado" };

  const { data: manager } = employee.manager_id
    ? await supabase.from("employees").select("name,role_title").eq("id", employee.manager_id).maybeSingle()
    : { data: null };

  const { data: teammates } = await supabase
    .from("employees")
    .select("name,role_title")
    .eq("department", employee.department ?? "")
    .neq("id", employeeId)
    .limit(10);

  return { employee, manager, teammates: teammates ?? [] };
}

export const tools: AgentTool[] = [
  {
    definition: {
      type: "function",
      function: {
        name: "get_employee_context",
        description:
          "Devuelve los datos del empleado (rol, departamento, fecha de inicio), su manager y sus compañeros de departamento.",
        parameters: {
          type: "object",
          properties: {
            employee_id: { type: "string", description: "UUID del empleado" },
          },
          required: ["employee_id"],
        },
      },
    },
    execute: (args) => getEmployeeContext(String(args.employee_id)),
  },
];
