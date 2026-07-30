import type { SupabaseClient } from "@supabase/supabase-js";

// Expediente del empleado (migr. 0069): historial APPEND-ONLY de lo que le pasa a una persona.
// La tabla no tiene enum de tipos a propósito (cada bloque del módulo añade los suyos y un enum
// obligaría a migrar cada vez); la lista válida vive aquí, que es donde se consulta.

export const EMPLOYEE_EVENT_TYPES = [
  "hired",              // alta como empleado
  "role_changed",       // cambio de cargo o de nivel
  "promotion",          // promoción aprobada (bloque 4)
  "cycle_started",      // entra en un ciclo de evaluación (bloque 3)
  "self_review",        // envía su autoevaluación
  "manager_review",     // su manager envía la evaluación
  "rating_published",   // resultado publicado y congelado
  "calibration_adjust", // ajuste en calibración, con justificación
  "development_plan",   // plan de desarrollo creado o actualizado (bloque 4)
  "improvement_plan",   // plan de mejora (bloque 4)
  "acknowledged",       // acuse del empleado
] as const;

export type EmployeeEventType = (typeof EMPLOYEE_EVENT_TYPES)[number];

export type EmployeeEvent = {
  id: string;
  employee_id: string;
  type: EmployeeEventType | string;
  summary: string | null;
  payload: Record<string, unknown>;
  actor_id: string | null;
  actor_email: string | null;
  created_at: string;
};

/**
 * Registra un evento en el expediente. Nunca lanza: el expediente es un registro lateral y un
 * fallo aquí no debe tumbar la acción de negocio que lo originó (contratar, publicar un
 * resultado). Si falla, se avisa por consola y se sigue.
 */
export async function recordEmployeeEvent(
  db: SupabaseClient,
  input: {
    employeeId: string;
    type: EmployeeEventType;
    summary?: string;
    payload?: Record<string, unknown>;
    actorId?: string | null;
    actorEmail?: string | null;
  },
): Promise<void> {
  const { error } = await db.from("employee_events").insert({
    employee_id: input.employeeId,
    type: input.type,
    summary: input.summary ?? null,
    payload: input.payload ?? {},
    actor_id: input.actorId ?? null,
    actor_email: input.actorEmail ?? null,
  });
  if (error) console.error("[employee_events] no se pudo registrar el evento:", error.message);
}

/** Expediente de una persona, del más reciente al más antiguo. */
export async function getEmployeeEvents(db: SupabaseClient, employeeId: string, limit = 50): Promise<EmployeeEvent[]> {
  const { data } = await db
    .from("employee_events")
    .select("id, employee_id, type, summary, payload, actor_id, actor_email, created_at")
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as EmployeeEvent[];
}
