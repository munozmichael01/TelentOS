import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getCompany } from "@/lib/workspace";

type Role = "owner" | "hr_admin" | "recruiter" | "manager" | "employee";

/**
 * Server-side role guard. Call at the top of a page or layout.
 * Redirects to /dashboard if the current user has no membership row or an insufficient role.
 */
export async function requireRole(allowedRoles: Role[]): Promise<Role> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/employer/sign-in");

  const company = await getCompany();
  if (!company) redirect("/employer/dashboard");

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("company_members")
    .select("role")
    .eq("company_id", company.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member?.role) redirect("/employer/dashboard");

  const role = member.role as Role;
  if (!allowedRoles.includes(role)) redirect("/employer/dashboard");

  return role;
}
