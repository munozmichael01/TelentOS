import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/navigation";
import { CandidateAuth } from "@/components/board/candidate-auth";

// Auth del candidato (registro/login). Candidato ya logueado → su cuenta. Una sesión de
// EMPRESA no bloquea: se muestra el login con aviso (entrar como candidato la reemplaza) —
// antes redirigía al dashboard y hacía imposible llegar a Mi cuenta.
export default async function CandidateAuthPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const { data: { user } } = await createClient().auth.getUser();
  const isCandidate = user?.app_metadata?.audience === "candidate";
  if (isCandidate) redirect({ href: "/cuenta", locale: params.locale });
  return <CandidateAuth locale={params.locale} companySession={!!user} />;
}
