import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/navigation";
import { CandidateAuth } from "@/components/board/candidate-auth";

// Auth del candidato (registro/login). Si ya hay sesión, fuera de aquí: candidato → su
// cuenta, usuario de empresa → su dashboard.
export default async function CandidateAuthPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const { data: { user } } = await createClient().auth.getUser();
  if (user) {
    const isCandidate = user.app_metadata?.audience === "candidate";
    redirect({ href: isCandidate ? "/cuenta" : "/app/dashboard", locale: params.locale });
  }
  return <CandidateAuth locale={params.locale} />;
}
