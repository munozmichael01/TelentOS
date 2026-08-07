import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Altas por producto.
 *
 * TalentOS son tres productos con puerta propia — Admin B2B (`/employer`), cuenta del candidato
 * (`/candidate`) y portal del empleado (`/employee`) — y una persona **se da de alta en cada uno
 * por separado**. Puede usar el mismo email y la misma contraseña en los tres: la identidad es la
 * misma, el alta no. Tener cuenta en el board no te da el admin.
 *
 * `app_metadata.audiences` es el registro de altas. Tres reglas:
 *
 *   1. **Es una lista, y solo crece por alta explícita.** Antes era un valor único
 *      (`app_metadata.audience`) y cada alta pisaba la anterior: invitar al portal a un
 *      ex-candidato le borraba el acceso a sus candidaturas e invitar al owner le quitaba el
 *      admin (docs/auditoria-autenticacion.md).
 *   2. **Da acceso a la PUERTA; los hechos deciden lo de dentro.** El alta te deja entrar en el
 *      producto; lo que ves ahí lo mandan `company_members`, `employees` y `candidates`, con la
 *      RLS como barrera real. Si el alta dice `employee` y ya no hay ficha, el producto lo
 *      explica y corrige el registro — nunca rebota a otro producto (así no hay bucle posible).
 *   3. **Sin alta no se entra.** Ausencia de claim = ningún producto, no "todos". Lo contrario
 *      era default-allow: cualquier alta nueva que olvidara poner el claim aparecía en el admin.
 *
 * El claim vive en `app_metadata` y no en `user_metadata` a propósito: `user_metadata` lo puede
 * reescribir el propio usuario con `auth.updateUser`, así que allí el gating sería decorativo.
 */

export const AUDIENCES = ["staff", "employee", "candidate"] as const;
export type Audience = (typeof AUDIENCES)[number];

/** Dónde aterriza cada producto tras entrar por su puerta. */
export const PRODUCT_HOME: Record<Audience, string> = {
  staff: "/employer/dashboard",
  employee: "/employee/profile",
  candidate: "/candidate",
};

/** La puerta de cada producto: lo único público de su namespace. */
export const PRODUCT_DOOR: Record<Audience, string> = {
  staff: "/employer/sign-in",
  employee: "/employee/sign-in",
  candidate: "/candidate/sign-in",
};

/**
 * Altas según el JWT. Rápido y sin tocar la base — es lo que usa el middleware.
 *
 * Traduce el claim único anterior para no echar a nadie con la sesión abierta durante el
 * despliegue: `audience` valía `candidate`, `employee` o nada (= personal de empresa).
 */
export function audiencesOf(user: User | null | undefined): Audience[] {
  if (!user) return [];
  const meta = (user.app_metadata ?? {}) as Record<string, unknown>;

  const list = meta.audiences;
  if (Array.isArray(list)) {
    return AUDIENCES.filter((a) => list.includes(a));
  }

  const legacy = meta.audience;
  if (legacy === "candidate") return ["candidate"];
  if (legacy === "employee") return ["employee"];
  return [];
}

export function hasAudience(user: User | null | undefined, audience: Audience): boolean {
  return audiencesOf(user).includes(audience);
}

/**
 * Altas según la BASE. Se usa para reconciliar, no para conceder: que tengas ficha de empleado no
 * te da el alta en el portal (la habilita la empresa invitándote); lo que hace es detectar que un
 * alta se quedó obsoleta porque el hecho desapareció.
 *
 * `staff` es pertenecer a una empresa con rol distinto de `employee`: un miembro con rol
 * `employee` es plantilla, no administra.
 */
export async function deriveAudiences(admin: SupabaseClient, userId: string): Promise<Audience[]> {
  const [{ data: members }, { data: employee }, { data: candidate }] = await Promise.all([
    admin.from("company_members").select("role").eq("user_id", userId),
    admin.from("employees").select("id").eq("user_id", userId).limit(1).maybeSingle(),
    admin.from("candidates").select("id").eq("user_id", userId).limit(1).maybeSingle(),
  ]);

  const out: Audience[] = [];
  if ((members ?? []).some((m) => (m as { role: string }).role !== "employee")) out.push("staff");
  if (employee) out.push("employee");
  if (candidate) out.push("candidate");
  return out;
}

async function writeAudiences(admin: SupabaseClient, userId: string, next: Audience[]): Promise<Audience[]> {
  const { data: current } = await admin.auth.admin.getUserById(userId);
  const prev = audiencesOf(current?.user ?? null);
  const unchanged =
    prev.length === next.length &&
    prev.every((a) => next.includes(a)) &&
    Array.isArray((current?.user?.app_metadata ?? {}).audiences);
  if (unchanged) return prev;

  await admin.auth.admin.updateUserById(userId, {
    app_metadata: { ...(current?.user?.app_metadata ?? {}), audiences: next },
  });
  return next;
}

/**
 * Da de alta a alguien en un producto. Aditivo: nunca quita las otras altas. Es lo que llaman el
 * sign-up del admin, el del candidato y la invitación al portal.
 */
export async function grantAudience(
  admin: SupabaseClient,
  userId: string,
  audience: Audience,
): Promise<Audience[]> {
  const { data: current } = await admin.auth.admin.getUserById(userId);
  const prev = audiencesOf(current?.user ?? null);
  if (prev.includes(audience)) return prev;
  return writeAudiences(admin, userId, AUDIENCES.filter((a) => prev.includes(a) || a === audience));
}

/**
 * Retira un alta que ya no se sostiene en los hechos (le borraron la ficha, salió de la empresa).
 * Lo llama el propio producto cuando descubre que su alta miente, y es lo que rompe el bucle de
 * redirects: en vez de rebotar a otro producto, el alta caduca y la puerta lo explica.
 */
export async function revokeAudience(
  admin: SupabaseClient,
  userId: string,
  audience: Audience,
): Promise<Audience[]> {
  const { data: current } = await admin.auth.admin.getUserById(userId);
  const prev = audiencesOf(current?.user ?? null);
  if (!prev.includes(audience)) return prev;
  return writeAudiences(admin, userId, prev.filter((a) => a !== audience));
}

/** Reconcilia el registro con los hechos. Se usa en el backfill y en tareas de mantenimiento. */
export async function syncAudiences(admin: SupabaseClient, userId: string): Promise<Audience[]> {
  return writeAudiences(admin, userId, await deriveAudiences(admin, userId));
}
