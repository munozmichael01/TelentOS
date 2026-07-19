import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api";

/**
 * Vincula la ficha ATS del candidato (candidates) a la cuenta autenticada, por email.
 * Se llama tras crear cuenta o iniciar sesión al final del apply ágil: la candidatura
 * ya se registró como invitado; esto la conecta a la cuenta para que aparezca en /cuenta.
 * Solo liga fichas con user_id nulo (no reasigna candidatos ya vinculados a otra cuenta).
 */
export async function POST() {
  const { data: { user } } = await createClient().auth.getUser();
  if (!user?.email) return jsonError("No autenticado", 401);

  const admin = createAdminClient();
  const { error } = await admin
    .from("candidates")
    .update({ user_id: user.id })
    .ilike("email", user.email)
    .is("user_id", null);
  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ ok: true });
}
