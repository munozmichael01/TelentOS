import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";
import { getCompanyId } from "@/lib/workspace";

/**
 * «Añadirme como empleado» (brief §3.7): el user autenticado crea SU propia ficha
 * de empleado en SU empresa, o se vincula a una ya existente con su email. Es el
 * único puente user↔employee — el onboarding nunca lo hace. Idempotente.
 *
 * Usa admin client a propósito: un rol `employee`/`recruiter` no puede insertar en
 * `employees` vía RLS (solo owner/hr_admin). Aquí la autorización es de negocio —
 * "puedes crearte a TI mismo en TU empresa" — así que se verifica membresía + se
 * fija user_id/company_id del propio usuario, sin abrir la escritura general.
 */
export async function POST() {
  const { user, error } = await requireUser();
  if (error) return error;

  const companyId = await getCompanyId();
  if (!companyId) return jsonError("No perteneces a ninguna empresa", 412);

  const admin = createAdminClient();

  // Idempotente: si ya tiene ficha vinculada, la devuelve.
  const { data: linked } = await admin
    .from("employees")
    .select("*")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (linked) return NextResponse.json({ employee: linked, already: true });

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const fullName =
    (meta.full_name as string) ||
    (meta.name as string) ||
    user.email?.split("@")[0] ||
    "Yo";

  // Si RR.HH. ya creó una ficha con mi email (sin vincular), la vinculo en vez de duplicar.
  if (user.email) {
    const { data: byEmail } = await admin
      .from("employees")
      .select("*")
      .eq("company_id", companyId)
      .eq("email", user.email)
      .is("user_id", null)
      .maybeSingle();
    if (byEmail) {
      const { data: updated, error: uErr } = await admin
        .from("employees")
        .update({ user_id: user.id })
        .eq("id", byEmail.id)
        .select()
        .single();
      if (uErr) return jsonError(uErr.message, 500);
      return NextResponse.json({ employee: updated, linked: true });
    }
  }

  // Crear ficha nueva vinculada a mí.
  const { data: employee, error: cErr } = await admin
    .from("employees")
    .insert({
      company_id: companyId,
      user_id: user.id,
      name: fullName,
      email: user.email ?? null,
      contract_type: "indefinido",
      start_date: new Date().toISOString().slice(0, 10),
    })
    .select()
    .single();
  if (cErr) return jsonError(cErr.message, 500);

  // Defaults de HRIS (misma lógica que el alta manual): política de permisos + horario.
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: pol }, { data: tpl }] = await Promise.all([
    admin.from("allowance_policies").select("id").eq("company_id", companyId).eq("is_default", true).limit(1).maybeSingle(),
    admin.from("work_schedule_templates").select("id").eq("company_id", companyId).eq("is_default", true).limit(1).maybeSingle(),
  ]);
  await Promise.all([
    pol ? admin.from("employee_allowances").insert({ employee_id: employee.id, policy_id: pol.id, valid_from: today, valid_until: null }) : Promise.resolve(),
    tpl ? admin.from("employee_schedules").insert({ employee_id: employee.id, template_id: tpl.id, valid_from: today, valid_until: null }) : Promise.resolve(),
  ]);

  return NextResponse.json({ employee, created: true });
}
