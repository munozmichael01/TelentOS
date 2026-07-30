import { NextResponse } from "next/server";
import { requireApiRole, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/resend";
import { recordEmployeeEvent } from "@/lib/performance/events";

/**
 * Invita a un EMPLEADO al portal (/app/mi/*): crea o reutiliza su cuenta, la vincula a su ficha
 * y le manda un enlace de acceso.
 *
 * Es el puente user↔employee del lado de RR.HH. (el otro es /api/employees/self, que hace lo
 * mismo pero iniciado por el propio usuario). Hasta ahora no existía: 0 de 49 empleados tenían
 * cuenta, y sin cuenta no hay autoevaluación, ni acuse, ni resultado — o sea, no hay Desempeño.
 *
 * Decisiones:
 * - `audience: "employee"` en app_metadata: es un claim de ROUTING (el middleware lo usa para
 *   mandar al portal en vez del dashboard de RR.HH.), NO una barrera de seguridad. La barrera
 *   real es la RLS + el rol en company_members.
 * - Rol `employee` en company_members: le da pertenencia a la empresa sin acceso a nada de
 *   empresa (el nav y la RLS lo acotan a lo suyo).
 * - Se devuelve el enlace al cliente además de enviarlo por correo: si el email no llega
 *   (dominio no verificado en Resend, spam), RR.HH. puede copiarlo. El correo puede fallar; la
 *   invitación no debe.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { user, companyId, error } = await requireApiRole(["owner", "hr_admin"]);
  if (error) return error;

  const admin = createAdminClient();
  const { data: employee } = await admin
    .from("employees")
    .select("id, name, email, user_id, company_id")
    .eq("id", params.id)
    .maybeSingle();

  if (!employee) return jsonError("Empleado no encontrado", 404);
  if (employee.company_id !== companyId) return jsonError("Ese empleado no es de tu empresa", 403);
  if (!employee.email) return jsonError("La ficha no tiene email. Añádelo antes de invitar.", 422);

  const email = String(employee.email).trim().toLowerCase();
  // Si ya tiene cuenta vinculada, esto es un REENVÍO: se salta la creación y se le manda un
  // enlace nuevo. Es lo que hace falta de verdad cuando el correo no llegó o el enlace caducó.
  const isResend = !!employee.user_id;

  // 1) Cuenta: reutiliza la existente si ese email ya está registrado (p. ej. fue candidato).
  let userId: string | null = employee.user_id;
  if (!isResend) {
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    app_metadata: { audience: "employee" },
    user_metadata: { full_name: employee.name },
  });
  if (created?.user) {
    userId = created.user.id;
  } else if (/already|registered|exists/i.test(createErr?.message ?? "")) {
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const found = list?.users?.find((u) => (u.email ?? "").toLowerCase() === email);
    if (!found) return jsonError("Ese email ya existe pero no se pudo recuperar la cuenta", 500);
    userId = found.id;
    // Se le marca la audiencia de empleado sin tocar el resto de su metadata.
    await admin.auth.admin.updateUserById(userId, {
      app_metadata: { ...(found.app_metadata ?? {}), audience: "employee" },
    });
  } else {
    return jsonError(createErr?.message ?? "No se pudo crear la cuenta", 500);
  }

  // 2) Vínculo ficha ↔ cuenta y pertenencia a la empresa con rol `employee`.
  const { error: linkErr } = await admin.from("employees").update({ user_id: userId }).eq("id", employee.id);
  if (linkErr) return jsonError(linkErr.message, 500);

  const { data: member } = await admin
    .from("company_members").select("id").eq("company_id", companyId).eq("user_id", userId).maybeSingle();
  if (!member) {
    await admin.from("company_members").insert({
      company_id: companyId, user_id: userId, role: "employee",
      employee_id: employee.id, invited_by: user!.id, invited_at: new Date().toISOString(),
    });
  }
  }

  // 3) Enlace de acceso. Dos decisiones importantes:
  //    · Tipo `recovery` (definir contraseña), no `magiclink`: al empleado se le acaba de crear
  //      la cuenta y NO TIENE CONTRASEÑA. Con un magic link entraría una vez y nunca más podría
  //      iniciar sesión por su cuenta. Aquí define su contraseña y ya es dueño de su acceso.
  //    · El redirect apunta a /auth/callback, NUNCA a la página destino: Supabase devuelve los
  //      tokens en el FRAGMENTO de la URL y solo el callback los procesa. Apuntar directo a la
  //      página deja al usuario sin sesión y el middleware lo manda al login.
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://telent-os-mu.vercel.app";
  const callback = `${site}/es-ve/auth/callback?next=${encodeURIComponent("/app/mi/perfil")}`;
  const { data: link, error: linkGenErr } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: callback },
  });
  if (linkGenErr) return jsonError(linkGenErr.message, 500);
  const actionLink = link?.properties?.action_link ?? null;

  // 4) Correo. Si falla o no hay credenciales, la invitación sigue siendo válida.
  const mail = await sendEmail({
    to: email,
    subject: "Tu acceso al portal de empleado",
    html: `
      <div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;color:#1A1A17">
        <p style="font-size:15px">Hola ${employee.name},</p>
        <p style="font-size:15px;line-height:1.55">Ya tienes acceso al portal de empleado: ahí verás tu ficha, tus ausencias, tus horas, tus recibos de nómina y tu desempeño.</p>
        <p style="font-size:15px;line-height:1.55">Para entrar, <strong>define tu contraseña</strong> con este enlace:</p>
        <p style="margin:26px 0">
          <a href="${actionLink}" style="background:#0E5C4A;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:10px;display:inline-block">Definir mi contraseña</a>
        </p>
        <p style="font-size:12.5px;color:#79746B;line-height:1.5">El enlace es de un solo uso y caduca en una hora. Si expira, pide a tu equipo de personas que te lo reenvíe. Después podrás entrar con tu email y la contraseña que elijas.</p>
      </div>`,
  });

  // Solo se anota la primera vez: un reenvío no es un hito del expediente, es soporte.
  if (!isResend) {
    await recordEmployeeEvent(admin, {
      employeeId: employee.id,
      type: "portal_invited",
      summary: email,
      actorId: user!.id,
      actorEmail: user!.email ?? null,
    });
  }

  return NextResponse.json({
    ok: true,
    email,
    resent: isResend,
    emailSent: mail.ok,
    emailSkipped: mail.skipped ?? false,
    // Para que RR.HH. pueda copiarlo si el correo no llega.
    inviteLink: actionLink,
  });
}
