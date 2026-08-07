import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";
import { grantAudience } from "@/lib/auth/audiences";

/**
 * Alta en el producto de empresa, para quien acaba de registrarse en su puerta.
 *
 * Solo concede `staff`, y solo a quien llama sobre sí mismo. Los otros dos productos no se
 * autoconceden: al portal del empleado te da acceso tu empresa invitándote, y el alta de
 * candidato la hace su propio registro del board. Poner aquí un `product` del cuerpo convertiría
 * este endpoint en "concédeme lo que pida".
 *
 * El alta va ANTES de que exista la empresa: sin ella, quien se acaba de registrar no podría
 * llegar a `/employer/onboarding` a crearla.
 */
export async function POST() {
  const { user, error } = await requireUser();
  if (error) return error;

  const audiences = await grantAudience(createAdminClient(), user.id, "staff");
  return NextResponse.json({ audiences });
}
