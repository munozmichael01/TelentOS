import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revokeAudience } from "@/lib/auth/audiences";

export const dynamic = "force-dynamic";

/**
 * Portal del empleado — producto propio, con su puerta (`/employee/sign-in`) y su navegación.
 *
 * Una misma persona puede administrar la empresa y ser plantilla: son dos altas distintas sobre
 * la misma identidad, no dos vistas del mismo sitio.
 *
 * Sin ficha de empleado NO se redirige a otro producto. Antes esto hacía `redirect("/app/dashboard")`
 * y, como el middleware devolvía al portal a quien tenía el claim de empleado, las dos reglas se
 * mordían y la cuenta quedaba encerrada en un bucle infinito de redirects sin poder ni salir
 * (docs/auditoria-autenticacion.md). Ahora el alta caduca —el hecho que la sostenía ya no está— y
 * la puerta del propio producto lo explica.
 */
export default async function EmployeePortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/employee/sign-in");

  const admin = createAdminClient();
  const { data: employee } = await admin
    .from("employees").select("id, company_id").eq("user_id", user.id).maybeSingle();
  if (!employee) {
    await revokeAudience(admin, user.id, "employee");
    redirect("/employee/sign-in");
  }

  // ¿Además administra? Solo para ofrecerle el enlace a la puerta del otro producto: sin ninguna
  // pista no descubriría que existe. No es un selector de contexto — se sale y se entra.
  const { data: member } = await admin
    .from("company_members").select("role").eq("user_id", user.id).eq("company_id", employee.company_id).maybeSingle();
  const isAlsoStaff = !!member?.role && member.role !== "employee";

  return (
    <AppShell
      variant="portal"
      crossLink={isAlsoStaff ? { href: "/employer/dashboard", label: "Ir a administración" } : null}
    >
      {children}
    </AppShell>
  );
}
