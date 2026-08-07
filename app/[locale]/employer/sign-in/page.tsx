import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { LoginForm } from "@/components/features/login-form";
import { createClient } from "@/lib/supabase/server";
import { audiencesOf, PRODUCT_DOOR } from "@/lib/auth/audiences";
import { ProductDoor } from "@/components/features/product-door";

export const dynamic = "force-dynamic";

/**
 * Puerta del admin B2B. Aquí sí hay alta por autoservicio (`LoginForm` trae el modo registro),
 * porque es donde una empresa nueva entra al producto.
 *
 * Con sesión abierta pero sin alta de empresa —p. ej. alguien que solo es candidato— NO se le
 * cuela ni se le manda a otro sitio en silencio: se le dice qué pasa y se le ofrecen sus puertas.
 */
export default async function EmployerSignInPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const { data: { user } } = await createClient().auth.getUser();
  const audiences = audiencesOf(user);

  if (user && !audiences.includes("staff")) {
    const elsewhere = [
      audiences.includes("employee") && { href: `/${params.locale}${PRODUCT_DOOR.employee}`, label: "Portal del empleado" },
      audiences.includes("candidate") && { href: `/${params.locale}${PRODUCT_DOOR.candidate}`, label: "Mi cuenta de candidato" },
    ].filter(Boolean) as { href: string; label: string }[];

    return (
      <ProductDoor
        product="staff"
        eyebrow="Acceso interno"
        title="Administración de empresa"
        signedInAs={user.email ?? ""}
        noAccess="Tu cuenta no está dada de alta en la administración de ninguna empresa."
        hint="Si tu empresa ya usa TalentOS, pide que te añadan al equipo. Si vienes a crearla, cierra sesión y regístrate."
        elsewhere={elsewhere}
      />
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 20px", background: "radial-gradient(130% 80% at 50% -10%, #F7F3EB 0%, #F4F0E8 60%)" }}>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
