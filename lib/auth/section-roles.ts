export type Role = "owner" | "hr_admin" | "recruiter" | "manager" | "employee";

/**
 * Qué roles pueden entrar en cada sección del admin B2B.
 *
 * **Fuente única.** Este mapa lo consumen las DOS partes: el menú, para no enseñar lo que no
 * toca, y los layouts del servidor, para no dejar entrar. Vivía solo en `app-shell.tsx`, así que
 * lo único que hacía era esconder el enlace — quien escribía la URL a mano entraba igual.
 *
 * Comprobado en producción el 12-ago: un `manager` abría `/employer/payroll/profiles` y veía el
 * **salario base de toda la plantilla**, y `/employer/payroll/runs` con las corridas de nómina.
 * La RLS aísla entre EMPRESAS, así que no había fuga entre clientes; lo que no se imponía era el
 * reparto por rol dentro de la empresa.
 *
 * Regla al añadir una sección: se anota aquí y se pone `requireRole` en el layout de su carpeta.
 * Un `page.tsx` suelto sin layout se olvida; el layout cubre el subárbol entero.
 */
export const SECTION_ROLES: Record<string, Role[]> = {
  "/employer/dashboard": ["owner", "hr_admin", "recruiter", "manager"],
  "/employer/employees": ["owner", "hr_admin", "manager"],
  "/employer/org": ["owner", "hr_admin", "recruiter", "manager"],
  "/employer/settings/absences": ["owner", "hr_admin"],
  "/employer/settings/schedules": ["owner", "hr_admin"],
  // reclutamiento — el manager no entra al pipeline de selección
  "/employer/jobs": ["owner", "hr_admin", "recruiter"],
  "/employer/applications": ["owner", "hr_admin", "recruiter"],
  "/employer/candidates": ["owner", "hr_admin", "recruiter"],
  "/employer/career-site": ["owner", "hr_admin", "recruiter"],
  "/employer/channels": ["owner", "hr_admin", "recruiter"],
  // personas — el manager solo ve su equipo (lo acota la RLS)
  "/employer/timeoff": ["owner", "hr_admin", "manager"],
  "/employer/timeoff/calendar": ["owner", "hr_admin", "manager"],
  "/employer/hours": ["owner", "hr_admin", "manager"],
  "/employer/timesheets": ["owner", "hr_admin", "manager"],
  // sensibles — solo administración
  "/employer/hours/compensation": ["owner", "hr_admin"],
  // nómina — datos financieros de personas: solo owner y RR.HH.
  "/employer/payroll": ["owner", "hr_admin"],
  "/employer/payroll/runs": ["owner", "hr_admin"],
  "/employer/payroll/profiles": ["owner", "hr_admin"],
  "/employer/settings": ["owner", "hr_admin"],
  "/employer/settings/team": ["owner"],
  "/employer/settings/billing": ["owner"],
  "/employer/settings/compliance": ["owner", "hr_admin"],
  "/employer/settings/payroll": ["owner", "hr_admin"],
  "/employer/settings/skills": ["owner", "hr_admin", "recruiter"],
};

/** Roles de una sección, resolviendo por el prefijo más específico que coincida. */
export function rolesForSection(path: string): Role[] | undefined {
  const match = Object.keys(SECTION_ROLES)
    .filter((k) => path === k || path.startsWith(`${k}/`))
    .sort((a, b) => b.length - a.length)[0];
  return match ? SECTION_ROLES[match] : undefined;
}
