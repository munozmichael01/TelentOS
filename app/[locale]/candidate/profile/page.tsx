import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/navigation";
import { ProfileBuilder } from "@/components/board/profile-builder";
import { hasAudience } from "@/lib/auth/audiences";

// Perfil IA — el candidato construye su perfil con IA (intake + CV opcional → cv-parser).
// Gated a sesión de candidato (self-guard). Es el destino natural tras el registro.
export default async function ProfileBuilderPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const { data: { user } } = await createClient().auth.getUser();
  if (!hasAudience(user, "candidate")) redirect({ href: "/candidate/sign-in", locale: params.locale });
  return <ProfileBuilder locale={params.locale} />;
}
