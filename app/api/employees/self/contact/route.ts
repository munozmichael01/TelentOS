import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";
import { recordEmployeeEvent } from "@/lib/performance/events";

/** Lo único que el empleado cambia por su cuenta. El resto lo mantiene RR.HH. (migr. 0080). */
const EDITABLE = ["phone", "address", "city", "emergency_contact_name", "emergency_contact_phone"] as const;
type EditableField = (typeof EDITABLE)[number];

const LABELS: Record<EditableField, string> = {
  phone: "teléfono",
  address: "dirección",
  city: "ciudad",
  emergency_contact_name: "contacto de emergencia",
  emergency_contact_phone: "teléfono de emergencia",
};

/**
 * El empleado actualiza sus datos de contacto.
 *
 * No escribe en `employees` directamente: la RLS de esa tabla es de RR.HH. y no distingue
 * columnas, así que una política de "actualiza tu propia fila" le dejaría cambiarse el cargo o el
 * contrato por API. Va por la función `update_my_contact_details`, que solo toca las cinco
 * columnas de arriba y siempre la fila de quien llama.
 *
 * Cada cambio queda en el expediente: sin rastro, una discusión sobre "yo actualicé mi contacto
 * de emergencia" no se puede resolver.
 */
export async function PATCH(req: Request) {
  const { supabase, user, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return jsonError("Cuerpo inválido");

  const { data: before } = await supabase
    .from("employees")
    .select("id, phone, address, city, emergency_contact_name, emergency_contact_phone")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!before) return jsonError("Tu usuario no tiene ficha de empleado", 412);

  const clean = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, 200) : null);
  const next: Record<EditableField, string | null> = {
    phone: clean(body.phone),
    address: clean(body.address),
    city: clean(body.city),
    emergency_contact_name: clean(body.emergency_contact_name),
    emergency_contact_phone: clean(body.emergency_contact_phone),
  };

  const { data, error: rpcError } = await supabase.rpc("update_my_contact_details", {
    p_phone: next.phone,
    p_address: next.address,
    p_city: next.city,
    p_emergency_contact_name: next.emergency_contact_name,
    p_emergency_contact_phone: next.emergency_contact_phone,
  });
  if (rpcError) return jsonError(rpcError.message, 500);

  const changed = EDITABLE.filter((f) => (before[f] ?? null) !== (next[f] ?? null));
  if (changed.length > 0) {
    // Con el cliente admin a propósito: `employee_events` es append-only y no se le abre la
    // escritura al empleado. El actor queda registrado, que es lo que importa.
    await recordEmployeeEvent(createAdminClient(), {
      employeeId: before.id as string,
      type: "contact_updated",
      summary: `Actualizó ${changed.map((f) => LABELS[f]).join(", ")}`,
      payload: { fields: changed },
      actorId: user.id,
      actorEmail: user.email ?? null,
    });
  }

  return NextResponse.json({ employee: data, changed });
}
