import { createClient, createAdminClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api";

/**
 * Resuelve sobre QUÉ empleado puede actuar quien llama.
 *
 * Los endpoints de jornada, ausencias y documentos aceptan un `employee_id` del cliente y solo
 * comprueban que haya sesión (`requireUser`). Eso vale mientras el único consumidor es el
 * dashboard de RR.HH., pero al abrir el portal significa que **un empleado podría fichar o
 * pedir vacaciones por un compañero**. Aquí se cierra:
 *
 *   · owner / hr_admin  → pueden actuar sobre cualquier ficha de SU empresa.
 *   · el resto          → solo sobre la suya, se ignora lo que venga en el cuerpo.
 *
 * Devuelve el `employeeId` efectivo o un error listo para responder.
 */
export async function resolveActingEmployee(requestedEmployeeId?: string | null): Promise<
  | { employeeId: string; companyId: string; isHr: boolean; error?: undefined }
  | { error: ReturnType<typeof jsonError>; employeeId?: undefined; companyId?: undefined; isHr?: undefined }
> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: jsonError("No autenticado", 401) };

  const admin = createAdminClient();
  const [{ data: member }, { data: own }] = await Promise.all([
    admin.from("company_members").select("role, company_id").eq("user_id", user.id).maybeSingle(),
    admin.from("employees").select("id, company_id").eq("user_id", user.id).maybeSingle(),
  ]);

  const isHr = member?.role === "owner" || member?.role === "hr_admin";
  const companyId = (member?.company_id as string | undefined) ?? (own?.company_id as string | undefined);
  if (!companyId) return { error: jsonError("No perteneces a ninguna empresa", 412) };

  // RR.HH. puede actuar por otro, pero solo dentro de su empresa.
  if (isHr && requestedEmployeeId) {
    const { data: target } = await admin
      .from("employees").select("id").eq("id", requestedEmployeeId).eq("company_id", companyId).maybeSingle();
    if (!target) return { error: jsonError("Ese empleado no es de tu empresa", 403) };
    return { employeeId: requestedEmployeeId, companyId, isHr: true };
  }

  if (!own?.id) return { error: jsonError("Tu usuario no tiene ficha de empleado", 412) };
  return { employeeId: own.id as string, companyId, isHr };
}
