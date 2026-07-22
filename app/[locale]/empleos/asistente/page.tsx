import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/navigation";
import { BoardAssistant } from "@/components/board/board-assistant";

// Asistente del board — GATED a candidato logueado (decisión de producto). Self-guard:
// no está bajo /app, así que la página verifica la sesión y manda a la auth de candidato.
export default async function AssistantPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const { data: { user } } = await createClient().auth.getUser();
  if (user?.app_metadata?.audience !== "candidate") redirect({ href: "/cuenta/entrar", locale: params.locale });
  return <BoardAssistant locale={params.locale} />;
}
