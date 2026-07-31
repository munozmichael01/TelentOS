import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Employee } from "@/lib/types";

/**
 * La ficha de empleado del usuario autenticado. Es la base de las cinco pantallas del portal
 * (/app/me/*), así que vive en un solo sitio: cada pantalla resuelve "quién soy" igual.
 *
 * El vínculo es `employees.user_id`, que fija la invitación de RR.HH. Si el usuario no tiene
 * ficha vinculada no hay portal que mostrar — se le manda al dashboard, donde su rol decide
 * qué ve. Devuelve también el cliente RLS ya creado para no abrir dos por página.
 */
export async function getMyEmployee(locale: string): Promise<{ supabase: ReturnType<typeof createClient>; employee: Employee }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/login", locale });

  const { data } = await supabase
    .from("employees")
    .select("*")
    .eq("user_id", user!.id)
    .maybeSingle();

  if (!data) redirect({ href: "/app/dashboard", locale });
  return { supabase, employee: data as Employee };
}
