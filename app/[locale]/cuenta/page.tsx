import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/navigation";
import { AccountClient } from "@/components/board/account-client";

// Cuenta del candidato (auth-gated, self-guard: no está bajo /app). Perfil + candidaturas
// + guardadas + alertas. Los datos los trae AccountClient de los endpoints /api/board/*.
export default async function AccountPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const { data: { user } } = await createClient().auth.getUser();
  if (!user) redirect({ href: "/login", locale: params.locale });
  return <AccountClient locale={params.locale} />;
}
