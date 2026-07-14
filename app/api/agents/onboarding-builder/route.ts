import { NextResponse } from "next/server";
import { requireApiRole, jsonError } from "@/lib/api";
import { runOnboardingBuilder } from "@/agents/agent-onboarding-builder";

export async function POST(req: Request) {
  const { companyId, supabase, error } = await requireApiRole(["owner", "hr_admin", "recruiter"]);
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body?.employeeId) return jsonError("Se requiere 'employeeId'");

  const result = await runOnboardingBuilder({ employeeId: body.employeeId, companyId: companyId! });

  // El humano ya pulsó "Generar": persistimos el checklist propuesto como
  // tareas editables (se pueden borrar/cambiar una a una desde la UI).
  if (body.persist && result.output.tasks.length) {
    const { data: employee } = await supabase
      .from("employees")
      .select("start_date")
      .eq("id", body.employeeId)
      .maybeSingle();
    const start = employee?.start_date ? new Date(employee.start_date) : new Date();

    const rows = result.output.tasks.map((t, i) => {
      const due = new Date(start);
      due.setDate(due.getDate() + (t.due_offset_days ?? 0));
      return {
        employee_id: body.employeeId,
        title: t.title,
        description: t.description,
        assignee: t.assignee,
        due_date: due.toISOString().slice(0, 10),
        order_index: i,
        generated_by: "agent",
      };
    });
    await supabase.from("onboarding_tasks").insert(rows);
  }

  return NextResponse.json(result);
}
