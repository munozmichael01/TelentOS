import { PageHeader } from "@/components/page-header";
import { TeamPanel } from "@/components/features/team-panel";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getCompany } from "@/lib/workspace";
import { requireRole } from "@/lib/auth-guard";
import { setRequestLocale, getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

type MemberRow = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "hr_admin" | "recruiter" | "manager";
  employeeId: string | null;
  employeeName: string | null;
  employeeTitle: string | null;
  joinedAt: string;
  isYou: boolean;
};

type PendingRow = {
  id: string;
  email: string;
  role: "hr_admin" | "recruiter" | "manager";
  invitedAt: string;
  inviterName: string | null;
};

type EmployeeOption = {
  id: string;
  name: string;
  email: string | null;
  roleTitle: string | null;
  managerId: string | null;
};

export default async function TeamPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  await requireRole(["owner"]);

  const supabase = createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  const company = await getCompany();
  const t = await getTranslations({ locale: params.locale, namespace: "Settings" });

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(params.locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function formatRelative(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return t("team.relativeTime.today");
    if (diffDays === 1) return t("team.relativeTime.oneDayAgo");
    if (diffDays < 30) return t("team.relativeTime.daysAgo", { count: diffDays });
    const diffMonths = Math.floor(diffDays / 30);
    return diffMonths === 1 ? t("team.relativeTime.oneMonthAgo") : t("team.relativeTime.monthsAgo", { count: diffMonths });
  }

  function nameFromUser(u: { email?: string | null; user_metadata?: Record<string, unknown> } | null): string {
    if (!u) return "Usuario";
    const meta = u.user_metadata ?? {};
    return (meta.full_name as string | undefined) || (meta.name as string | undefined) || u.email?.split("@")[0] || "Usuario";
  }

  if (!company || !currentUser) {
    return (
      <div>
        <PageHeader title={t("team.title")} eyebrow={t("eyebrow")} />
        <p style={{ color: "#79746B", fontSize: "14px" }}>{t("team.loadError")}</p>
      </div>
    );
  }

  const admin = createAdminClient();

  // Fetch all company_members
  const { data: allMembers } = await admin
    .from("company_members")
    .select("id, user_id, role, employee_id, invited_by, invited_at, joined_at")
    .eq("company_id", company.id)
    .order("invited_at", { ascending: true });

  // Split active vs pending
  const activeMembers = (allMembers ?? []).filter((m) => m.joined_at !== null);
  const pendingMembers = (allMembers ?? []).filter((m) => m.joined_at === null);

  // Fetch all auth users (for names/emails)
  const { data: { users: authUsers } } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const userMap = new Map(authUsers.map((u) => [u.id, u]));

  // Fetch employees for linked data and autocomplete
  const { data: employees } = await admin
    .from("employees")
    .select("id, name, email, role_title, manager_id")
    .eq("company_id", company.id)
    .eq("status", "active")
    .order("name");

  const empMap = new Map((employees ?? []).map((e) => [e.id, e]));

  // Build active member rows
  const memberRows: MemberRow[] = activeMembers.map((m) => {
    const u = userMap.get(m.user_id);
    const emp = m.employee_id ? empMap.get(m.employee_id) : null;
    return {
      id: m.id,
      name: nameFromUser(u ?? null),
      email: u?.email ?? "",
      role: m.role as MemberRow["role"],
      employeeId: m.employee_id ?? null,
      employeeName: emp?.name ?? null,
      employeeTitle: emp?.role_title ?? null,
      joinedAt: m.joined_at ? formatDate(m.joined_at) : "",
      isYou: m.user_id === currentUser.id,
    };
  });

  // Build pending rows
  const pendingRows: PendingRow[] = pendingMembers.map((p) => {
    const u = userMap.get(p.user_id);
    const inviter = p.invited_by ? userMap.get(p.invited_by) : null;
    return {
      id: p.id,
      email: u?.email ?? "",
      role: p.role as PendingRow["role"],
      invitedAt: p.invited_at ? formatRelative(p.invited_at) : "",
      inviterName: inviter ? nameFromUser(inviter) : null,
    };
  });

  // Employee options for invite modal autocomplete
  const employeeOptions: EmployeeOption[] = (employees ?? []).map((e) => ({
    id: e.id,
    name: e.name,
    email: e.email ?? null,
    roleTitle: e.role_title ?? null,
    managerId: e.manager_id ?? null,
  }));

  // Set of employee_ids already linked to active members (for dimming in autocomplete)
  const memberEmpIds = activeMembers
    .filter((m) => m.employee_id)
    .map((m) => m.employee_id as string);

  return (
    <div>
      <PageHeader
        title={t("team.title")}
        eyebrow={t("eyebrow")}
      />
      <p style={{ fontSize: "13.5px", color: "#79746B", margin: "0 0 22px" }}>
        {t("team.description")}
      </p>
      <TeamPanel
        members={memberRows}
        pending={pendingRows}
        allEmployees={employeeOptions}
        memberEmpIds={memberEmpIds}
        currentUserId={currentUser.id}
      />
    </div>
  );
}
