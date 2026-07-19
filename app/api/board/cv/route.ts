import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api";

/**
 * Signed URL del CV del candidato autenticado (bucket privado `cvs`). Ownership: se toma
 * el cv_url de las fichas del propio user. Vigencia corta; solo lectura.
 */
export async function GET() {
  const { data: { user } } = await createClient().auth.getUser();
  if (!user) return jsonError("No autenticado", 401);
  const admin = createAdminClient();

  const { data: cands } = await admin
    .from("candidates")
    .select("cv_url, created_at")
    .eq("user_id", user.id)
    .not("cv_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(1);
  const path = cands?.[0]?.cv_url as string | undefined;
  if (!path) return jsonError("Sin CV", 404);

  const { data, error } = await admin.storage.from("cvs").createSignedUrl(path, 300);
  if (error || !data?.signedUrl) return jsonError("No se pudo generar el enlace", 500);
  return NextResponse.json({ url: data.signedUrl });
}
