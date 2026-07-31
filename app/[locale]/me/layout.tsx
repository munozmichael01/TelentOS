import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Portal del empleado — superficie SEPARADA del admin B2B.
 *
 * Una misma persona puede ser owner y a la vez plantilla: mezclar los dos menús en una barra
 * confunde, y a un owner SIN ficha le mostrábamos enlaces muertos. Cada producto tiene su
 * shell y su nav; quien tiene acceso a ambos cruza con un enlace explícito.
 *
 * Se reutiliza `AppShell` con `variant="portal"` en vez de duplicar el chrome (sidebar,
 * cabecera, avatar, colapsado): lo único que cambia es el nav y el enlace cruzado.
 */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Sin ficha de empleado no hay portal que enseñar. Se manda al dashboard, donde su rol
  // decide qué ve (y si tampoco tiene empresa, ese layout lo lleva al onboarding).
  const admin = createAdminClient();
  const { data: employee } = await admin
    .from("employees").select("id, company_id").eq("user_id", user.id).maybeSingle();
  if (!employee) redirect("/app/dashboard");

  // ¿Además administra? Entonces se le ofrece el salto al admin. Un empleado puro no lo ve.
  const { data: member } = await admin
    .from("company_members").select("role").eq("user_id", user.id).eq("company_id", employee.company_id).maybeSingle();
  const isAlsoStaff = !!member?.role && member.role !== "employee";

  return (
    <AppShell
      variant="portal"
      crossLink={isAlsoStaff ? { href: "/app/dashboard", label: "Ir a administración" } : null}
    >
      {children}
    </AppShell>
  );
}
