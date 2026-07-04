import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Emite una signed URL temporal.
 * Recibe { bucket, resourceId } — el path se resuelve server-side desde la DB.
 * Nunca firma un path enviado directamente por el cliente.
 */
export async function POST(req: Request) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body?.bucket || !body?.resourceId) return jsonError("Se requieren 'bucket' y 'resourceId'");
  if (!["cvs", "documents"].includes(body.bucket)) return jsonError("Bucket no permitido");

  const admin = createAdminClient();

  // Resolve company from user membership (no limit(1))
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return jsonError("No autenticado", 401);

  const { data: member } = await admin
    .from("company_members")
    .select("company_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member?.company_id) return jsonError("Sin empresa configurada", 403);

  const { company_id } = member;
  let storagePath: string;

  if (body.bucket === "documents") {
    // Resolve path from employee_documents record, verify ownership
    const { data: doc } = await admin
      .from("employee_documents")
      .select("file_url, employee_id, employees(company_id)")
      .eq("id", body.resourceId)
      .maybeSingle();

    if (!doc) return jsonError("Recurso no autorizado", 403);
    const empCompanyId = (doc.employees as unknown as { company_id: string })?.company_id;
    if (empCompanyId !== company_id) return jsonError("Recurso no autorizado", 403);
    storagePath = doc.file_url;
  } else {
    // bucket === "cvs": resolve path from candidates record, verify via applications
    const { data: candidate } = await admin
      .from("candidates")
      .select("id, cv_url")
      .eq("id", body.resourceId)
      .maybeSingle();

    if (!candidate?.cv_url) return jsonError("Recurso no autorizado", 403);

    const { data: companyJobs } = await admin
      .from("jobs")
      .select("id")
      .eq("company_id", company_id);

    const jobIds = (companyJobs ?? []).map((j: { id: string }) => j.id);
    if (jobIds.length === 0) return jsonError("Recurso no autorizado", 403);

    const { data: application } = await admin
      .from("applications")
      .select("id")
      .eq("candidate_id", candidate.id)
      .in("job_id", jobIds)
      .maybeSingle();

    if (!application) return jsonError("Recurso no autorizado", 403);
    storagePath = candidate.cv_url;
  }

  const { data, error: signErr } = await supabase.storage
    .from(body.bucket)
    .createSignedUrl(storagePath, 60 * 10);
  if (signErr) return jsonError(signErr.message, 500);
  return NextResponse.json({ url: data.signedUrl });
}
