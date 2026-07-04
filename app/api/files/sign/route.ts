import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";

/** Genera una signed URL temporal para CVs y documentos (buckets privados).
 *  Verifica que el recurso pertenece a la empresa del usuario antes de firmar. */
export async function POST(req: Request) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body?.bucket || !body?.path) return jsonError("Se requieren 'bucket' y 'path'");
  if (!["cvs", "documents"].includes(body.bucket)) return jsonError("Bucket no permitido");

  const admin = createAdminClient();
  const { data: company } = await supabase.from("companies").select("id").limit(1).maybeSingle();
  if (!company) return jsonError("Sin empresa configurada", 403);

  if (body.bucket === "documents") {
    // Path format: {employee_id}/{timestamp}-{filename}
    const employeeId = body.path.split("/")[0];
    const { data: emp } = await admin
      .from("employees")
      .select("id")
      .eq("id", employeeId)
      .eq("company_id", company.id)
      .maybeSingle();
    if (!emp) return jsonError("Recurso no autorizado", 403);
  }

  if (body.bucket === "cvs") {
    const { data: candidate } = await admin
      .from("candidates")
      .select("id")
      .eq("cv_url", body.path)
      .maybeSingle();
    if (!candidate) return jsonError("Recurso no autorizado", 403);

    // Verify the candidate has an application for a job in this company
    const { data: companyJobs } = await admin
      .from("jobs")
      .select("id")
      .eq("company_id", company.id);
    const jobIds = (companyJobs ?? []).map((j: { id: string }) => j.id);
    if (jobIds.length === 0) return jsonError("Recurso no autorizado", 403);

    const { data: application } = await admin
      .from("applications")
      .select("id")
      .eq("candidate_id", candidate.id)
      .in("job_id", jobIds)
      .maybeSingle();
    if (!application) return jsonError("Recurso no autorizado", 403);
  }

  const { data, error: signErr } = await supabase.storage
    .from(body.bucket)
    .createSignedUrl(body.path, 60 * 10);
  if (signErr) return jsonError(signErr.message, 500);
  return NextResponse.json({ url: data.signedUrl });
}
