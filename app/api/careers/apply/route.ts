import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { computeFitScore } from "@/lib/fit-score";
import { jsonError } from "@/lib/api";

/**
 * Endpoint PÚBLICO del career site. Usa service_role en lugar de abrir INSERT
 * a anon por RLS: así controlamos exactamente qué se escribe y validamos la
 * oferta. Las candidaturas llevan UTM de origen para distinguirlas de las de
 * job boards.
 */
export async function POST(req: Request) {
  const supabase = createAdminClient();
  const formData = await req.formData().catch(() => null);
  if (!formData) return jsonError("Formulario inválido");

  const jobId = String(formData.get("job_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!jobId || !name || !email) return jsonError("Nombre, email y oferta son obligatorios");

  const { data: job } = await supabase
    .from("jobs")
    .select("id, company_id, skills, experience_min_years, location, status")
    .eq("id", jobId)
    .eq("status", "active")
    .maybeSingle();
  if (!job) return jsonError("La oferta no está disponible", 404);

  // CV opcional → bucket privado `cvs`
  let cvUrl: string | null = null;
  const cv = formData.get("cv") as File | null;
  if (cv && cv.size > 0) {
    if (cv.size > 8 * 1024 * 1024) return jsonError("El CV no puede superar 8 MB");
    const path = `${jobId}/${Date.now()}-${cv.name.replace(/[^\w.\-]/g, "_")}`;
    const { error: upErr } = await supabase.storage
      .from("cvs")
      .upload(path, cv, { contentType: cv.type || "application/pdf" });
    if (!upErr) cvUrl = path; // se guarda el path; la UI interna genera signed URLs
  }

  const location = String(formData.get("location") ?? "").trim() || null;

  // Dedupe de candidato por email
  const { data: existingCandidate } = await supabase
    .from("candidates")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  const phone = String(formData.get("phone") ?? "").trim() || null;

  let candidateId = existingCandidate?.id;
  if (!candidateId) {
    const { data: candidate, error: candErr } = await supabase
      .from("candidates")
      .insert({
        name,
        email,
        phone,
        location,
        skills: [],
        experience_years: 0,
        cv_url: cvUrl,
        summary: null,
        source: "career_site",
      })
      .select("id")
      .single();
    if (candErr) return jsonError(candErr.message, 500);
    candidateId = candidate.id;
  } else {
    // Candidato existente: actualizar siempre los datos que acaba de proporcionar
    // (nombre, teléfono y ubicación pueden haber cambiado desde su última candidatura)
    const patch: Record<string, unknown> = { name };
    if (phone) patch.phone = phone;
    if (location) patch.location = location;
    if (cvUrl) patch.cv_url = cvUrl;
    await supabase.from("candidates").update(patch).eq("id", candidateId);
  }

  // Etapa inicial del pipeline de la oferta
  const { data: firstStage } = await supabase
    .from("job_stages")
    .select("id")
    .eq("job_id", jobId)
    .order("order_index")
    .limit(1)
    .maybeSingle();

  const fitScore = computeFitScore(
    { skills: [], experience_years: 0, location },
    { skills: job.skills, experience_min_years: job.experience_min_years, location: job.location }
  );

  // UTM: el career site marca su origen; si la URL traía utm_* se respetan
  const utm = {
    utm_source: String(formData.get("utm_source") ?? "career_site"),
    utm_medium: String(formData.get("utm_medium") ?? "organic"),
    utm_campaign: String(formData.get("utm_campaign") ?? ""),
  };

  const { data: application, error: appErr } = await supabase
    .from("applications")
    .insert({
      job_id: jobId,
      candidate_id: candidateId,
      stage_id: firstStage?.id ?? null,
      fit_score: fitScore,
      source: "career_site",
      utm,
    })
    .select("id")
    .single();
  if (appErr) {
    if (appErr.code === "23505") return jsonError("Ya has aplicado a esta oferta", 409);
    return jsonError(appErr.message, 500);
  }

  await supabase.from("application_events").insert({
    application_id: application.id,
    type: "created",
    to_stage: "Aplicado",
    reason: "Candidatura recibida desde el career site",
  });

  // Registrar evento en métricas del career site
  // Registrar evento en métricas del career site (silencioso si migración 0006 aún no aplicada)
  try {
    await supabase.from("career_site_events").insert({
      company_id: job.company_id,
      event_type: "application",
      job_id: jobId,
    });
  } catch { /* no-op */ }

  return NextResponse.json({ ok: true, application_id: application.id });
}
