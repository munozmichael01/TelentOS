import { requireRole } from "@/lib/auth-guard";

/**
 * Guarda de rol de la sección. Va en el LAYOUT y no en cada página: el layout cubre el subárbol
 * entero, así que una pantalla nueva nace protegida. Los roles salen de `SECTION_ROLES`
 * (lib/auth/section-roles.ts), que es la misma lista que consume el menú — antes vivía solo en
 * el nav, así que esconder el enlace era toda la protección y quien escribía la URL entraba.
 */
export default async function TimesheetsSectionLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["owner", "hr_admin", "manager"]);
  return <>{children}</>;
}
