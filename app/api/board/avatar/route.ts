import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api";

// Foto de perfil del candidato. Sube al bucket público `avatars` (ruta por uid) y guarda
// la URL pública en candidate_profiles.avatar_url. Solo imágenes, <5MB.
export async function POST(req: Request) {
  const { data: { user } } = await createClient().auth.getUser();
  if (!user) return jsonError("No autenticado", 401);

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return jsonError("Falta el archivo");
  if (!file.type.startsWith("image/")) return jsonError("Debe ser una imagen", 422);
  if (file.size > 5 * 1024 * 1024) return jsonError("Máximo 5MB", 422);

  const admin = createAdminClient();
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
  const path = `${user.id}/avatar.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await admin.storage.from("avatars").upload(path, buf, { contentType: file.type, upsert: true });
  if (upErr) return jsonError(upErr.message, 500);

  const { data: pub } = admin.storage.from("avatars").getPublicUrl(path);
  const url = `${pub.publicUrl}?v=${Date.now()}`; // cache-bust al reemplazar
  await admin.from("candidate_profiles").upsert({ user_id: user.id, avatar_url: url, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  return NextResponse.json({ url });
}
