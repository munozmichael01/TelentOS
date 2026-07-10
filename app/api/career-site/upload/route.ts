import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  // Bucket público: solo imágenes y con límite de tamaño (auditoría M1).
  // Sin esto, cualquier usuario autenticado obtiene hosting público de
  // archivos arbitrarios bajo el dominio de Supabase.
  const IMAGE_MIME_ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif"];
  if (!IMAGE_MIME_ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Formato no admitido (PNG, JPG, WebP o GIF)" }, { status: 400 });
  }
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "La imagen no puede superar 2 MB" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Ensure bucket exists (no-op if already created)
  await admin.storage.createBucket("career-site", { public: true }).catch(() => {});

  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await admin.storage.from("career-site").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: { publicUrl } } = admin.storage.from("career-site").getPublicUrl(path);
  return NextResponse.json({ url: publicUrl });
}
