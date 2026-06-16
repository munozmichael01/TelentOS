import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";

/** Genera una signed URL temporal para CVs y documentos (buckets privados). */
export async function POST(req: Request) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body?.bucket || !body?.path) return jsonError("Se requieren 'bucket' y 'path'");
  if (!["cvs", "documents"].includes(body.bucket)) return jsonError("Bucket no permitido");

  const { data, error: signErr } = await supabase.storage
    .from(body.bucket)
    .createSignedUrl(body.path, 60 * 10);
  if (signErr) return jsonError(signErr.message, 500);
  return NextResponse.json({ url: data.signedUrl });
}
