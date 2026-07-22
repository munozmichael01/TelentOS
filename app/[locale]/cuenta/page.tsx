import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/navigation";
import { AccountClient } from "@/components/board/account-client";

// Cuenta del candidato (auth-gated, self-guard: no está bajo /app). Perfil + candidaturas
// + guardadas + alertas. Los datos los trae AccountClient de los endpoints /api/board/*.
export default async function AccountPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const { data: { user } } = await createClient().auth.getUser();
  // Sin sesión O con sesión que no es de candidato (p. ej. usuario de empresa) → al login
  // de candidato (que muestra el aviso de sesión de empresa en vez de botar al dashboard).
  if (user?.app_metadata?.audience !== "candidate") redirect({ href: "/cuenta/entrar", locale: params.locale });
  return <AccountClient locale={params.locale} />;
}
