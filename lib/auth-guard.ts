import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getCompany } from "@/lib/workspace";

type Role = "owner" | "hr_admin" | "recruiter" | "manager" | "employee";

/**
 * Server-side role guard. Call at the top of a page or layout.
 * Redirects to /dashboard if the current user's role is not in allowedRoles.
 * Users without a company_members row are treated as hr_admin (transition period).
 */
export async function requireRole(allowedRoles: Role[]): Promise<Role> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const company = await getCompany();
  if (!company) redirect("/dashboard");

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("company_members")
    .select("role")
    .eq("company_id", company.id)
    .eq("user_id", user.id)
    .maybeSingle();

  const role = ((member?.role ?? "hr_admin") as Role);
  if (!allowedRoles.includes(role)) redirect("/dashboard");

  return role;
}
