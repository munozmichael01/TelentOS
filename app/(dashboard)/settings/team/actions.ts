"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getCompany } from "@/lib/workspace";
import { requireRole } from "@/lib/auth-guard";

export type ActionResult = { success: boolean; error?: string; message?: string };

export async function inviteMember(formData: FormData): Promise<ActionResult> {
  await requireRole(["owner"]);

  const email = ((formData.get("email") as string) ?? "").trim().toLowerCase();
  const role = formData.get("role") as string;
  const employeeId = (formData.get("employeeId") as string) || null;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { success: false, error: "Email inválido." };
  if (!["hr_admin", "recruiter", "manager"].includes(role))
    return { success: false, error: "Rol inválido." };

  const supabase = createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) return { success: false, error: "No autenticado." };

  const company = await getCompany();
  if (!company) return { success: false, error: "Sin empresa." };

  const admin = createAdminClient();

  // Check for existing active member by email
  const { data: { users: allUsers } } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const existingUser = allUsers.find((u) => u.email?.toLowerCase() === email);

  if (existingUser) {
    const { data: activeMember } = await admin
      .from("company_members")
      .select("id, joined_at")
      .eq("company_id", company.id)
      .eq("user_id", existingUser.id)
      .not("joined_at", "is", null)
      .maybeSingle();
    if (activeMember) return { success: false, error: "Este usuario ya es miembro activo del equipo." };
  }

  // Create or re-invite user
  let invitedUserId: string;

  if (existingUser) {
    invitedUserId = existingUser.id;
    // Send magic link to existing user
    await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/callback?next=/dashboard`,
      },
    });
  } else {
    const { data: inviteData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/callback?next=/dashboard`,
    });
    if (inviteErr) return { success: false, error: inviteErr.message };
    invitedUserId = inviteData.user!.id;
  }

  // Upsert company_members row (joined_at = null → pending)
  const { error: memberErr } = await admin.from("company_members").upsert(
    {
      company_id: company.id,
      user_id: invitedUserId,
      role,
      employee_id: employeeId,
      invited_by: currentUser.id,
      invited_at: new Date().toISOString(),
      joined_at: null,
    },
    { onConflict: "company_id,user_id" }
  );
  if (memberErr) return { success: false, error: memberErr.message };

  revalidatePath("/settings/team");
  return { success: true, message: `Invitación enviada a ${email}` };
}

export async function changeRole(formData: FormData): Promise<ActionResult> {
  await requireRole(["owner"]);

  const memberId = formData.get("memberId") as string;
  const role = formData.get("role") as string;

  if (!memberId) return { success: false, error: "ID requerido." };
  if (!["hr_admin", "recruiter", "manager"].includes(role))
    return { success: false, error: "Rol inválido." };

  const admin = createAdminClient();
  const { error } = await admin.from("company_members").update({ role }).eq("id", memberId);
  if (error) return { success: false, error: error.message };

  revalidatePath("/settings/team");
  return { success: true };
}

export async function revokeMember(formData: FormData): Promise<ActionResult> {
  await requireRole(["owner"]);

  const memberId = formData.get("memberId") as string;
  if (!memberId) return { success: false, error: "ID requerido." };

  const supabase = createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("company_members")
    .select("user_id, role")
    .eq("id", memberId)
    .maybeSingle();

  if (member?.user_id === currentUser?.id)
    return { success: false, error: "No puedes revocar tu propio acceso." };
  if (member?.role === "owner")
    return { success: false, error: "No se puede revocar al owner." };

  const { error } = await admin.from("company_members").delete().eq("id", memberId);
  if (error) return { success: false, error: error.message };

  revalidatePath("/settings/team");
  return { success: true };
}

export async function unlinkEmployee(formData: FormData): Promise<ActionResult> {
  await requireRole(["owner"]);

  const memberId = formData.get("memberId") as string;
  if (!memberId) return { success: false, error: "ID requerido." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("company_members")
    .update({ employee_id: null })
    .eq("id", memberId);
  if (error) return { success: false, error: error.message };

  revalidatePath("/settings/team");
  return { success: true };
}

export async function cancelInvite(formData: FormData): Promise<ActionResult> {
  await requireRole(["owner"]);

  const memberId = formData.get("memberId") as string;
  if (!memberId) return { success: false, error: "ID requerido." };

  const admin = createAdminClient();
  const { error } = await admin.from("company_members").delete().eq("id", memberId);
  if (error) return { success: false, error: error.message };

  revalidatePath("/settings/team");
  return { success: true };
}

export async function resendInvite(formData: FormData): Promise<ActionResult> {
  await requireRole(["owner"]);

  const email = ((formData.get("email") as string) ?? "").trim().toLowerCase();
  if (!email) return { success: false, error: "Email requerido." };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/callback?next=/dashboard`,
  });
  if (error) return { success: false, error: error.message };

  return { success: true, message: `Invitación reenviada a ${email}` };
}
