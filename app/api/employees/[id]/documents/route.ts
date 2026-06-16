import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file") as File | null;
  if (!file || file.size === 0) return jsonError("Se requiere un fichero");
  if (file.size > 10 * 1024 * 1024) return jsonError("Máximo 10 MB");

  const path = `${params.id}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
  const { error: upErr } = await supabase.storage
    .from("documents")
    .upload(path, file, { contentType: file.type || "application/octet-stream" });
  if (upErr) return jsonError(upErr.message, 500);

  const { data, error: dbError } = await supabase
    .from("employee_documents")
    .insert({ employee_id: params.id, name: file.name, file_url: path })
    .select()
    .single();
  if (dbError) return jsonError(dbError.message, 500);
  return NextResponse.json({ document: data });
}
