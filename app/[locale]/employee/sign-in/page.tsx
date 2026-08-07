import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { audiencesOf, PRODUCT_DOOR } from "@/lib/auth/audiences";
import { ProductDoor } from "@/components/features/product-door";

export const dynamic = "force-dynamic";

/**
 * Puerta del portal del empleado.
 *
 * Aquí no hay alta por autoservicio: al portal te da acceso tu empresa invitándote. Si alguien
 * llega con sesión pero sin ese alta —porque nunca la tuvo, o porque le retiraron la ficha— esta
 * pantalla lo dice y le ofrece las puertas de los productos que sí tiene, en vez de rebotarlo.
 */
export default async function EmployeeSignInPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const { data: { user } } = await createClient().auth.getUser();
  const audiences = audiencesOf(user);
  const signedInWithoutAccess = user && !audiences.includes("employee");

  const elsewhere = [
    audiences.includes("staff") && { href: `/${params.locale}${PRODUCT_DOOR.staff}`, label: "Administración de la empresa" },
    audiences.includes("candidate") && { href: `/${params.locale}${PRODUCT_DOOR.candidate}`, label: "Mi cuenta de candidato" },
  ].filter(Boolean) as { href: string; label: string }[];

  return (
    <ProductDoor
      product="employee"
      eyebrow="Portal del empleado"
      title="Entra a tu espacio"
      hint="Al portal te da acceso tu empresa. Si no te llegó la invitación, pídesela a tu equipo de personas."
      signedInAs={signedInWithoutAccess ? user!.email ?? "" : null}
      noAccess="Tu cuenta no tiene acceso al portal del empleado en esta empresa."
      elsewhere={elsewhere}
    />
  );
}
