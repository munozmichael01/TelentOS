import { NextResponse } from "next/server";
import { requireApiRole, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";
import { computeFitScore } from "@/lib/fit-score";

/**
 * Re-puntúa TODAS las candidaturas de la empresa con el cálculo canónico
 * (solape de skills del catálogo + ubicación estructurada — lib/fit-score.ts).
 * Cierra el drift entre fit_score persistido (calculado con datos antiguos) y
 * el desglose determinista que muestra la ficha (hallazgo de pista B, b4523b3).
 * Idempotente; devuelve cuántas cambiaron y el drift medio corregido.
 */

export async function POST() {
  const { companyId, error } = await requireApiRole(["owner", "hr_admin"]);
  if (error) return error;

  const db = createAdminClient();

  const { data: apps, error: appsErr } = await db
    .from("applications")
    .select(
      "id, fit_score, candidate_id, job_id, " +
        "candidates(skills, experience_years, location, city, country_code), " +
        "jobs!inner(company_id, skills, experience_min_years, location, city, country_code)",
    )
    .eq("jobs.company_id", companyId!);
  if (appsErr) return jsonError(appsErr.message, 500);

  type Row = {
    id: string;
    fit_score: number | null;
    candidate_id: string;
    job_id: string;
    candidates: { skills: string[]; experience_years: number; location: string | null; city: string | null; country_code: string | null } | null;
    jobs: { skills: string[]; experience_min_years: number; location: string | null; city: string | null; country_code: string | null };
  };
  const rows = (apps ?? []) as unknown as Row[];

  // Skills canónicas por candidato y por oferta, en dos queries (no N+1).
  const candIds = Array.from(new Set(rows.map((r) => r.candidate_id)));
  const jobIds = Array.from(new Set(rows.map((r) => r.job_id)));
  const [{ data: cs }, { data: js }] = await Promise.all([
    candIds.length ? db.from("candidate_skills").select("candidate_id, skill_id").in("candidate_id", candIds) : Promise.resolve({ data: [] as { candidate_id: string; skill_id: string }[] }),
    jobIds.length ? db.from("job_skills").select("job_id, skill_id").in("job_id", jobIds) : Promise.resolve({ data: [] as { job_id: string; skill_id: string }[] }),
  ]);
  const candSkillIds = new Map<string, string[]>();
  for (const r of cs ?? []) candSkillIds.set(r.candidate_id, [...(candSkillIds.get(r.candidate_id) ?? []), r.skill_id]);
  const jobSkillIds = new Map<string, string[]>();
  for (const r of js ?? []) jobSkillIds.set(r.job_id, [...(jobSkillIds.get(r.job_id) ?? []), r.skill_id]);

  let updated = 0;
  let driftTotal = 0;
  for (const app of rows) {
    if (!app.candidates) continue;
    const score = computeFitScore(
      {
        skills: app.candidates.skills ?? [],
        experience_years: app.candidates.experience_years ?? 0,
        location: app.candidates.location,
      },
      app.jobs,
      {
        candidateSkillIds: candSkillIds.get(app.candidate_id) ?? [],
        jobSkillIds: jobSkillIds.get(app.job_id) ?? [],
        candidateCity: app.candidates.city,
        candidateCountry: app.candidates.country_code,
        jobCity: app.jobs.city,
        jobCountry: app.jobs.country_code,
      },
    );
    if (score !== app.fit_score) {
      const { error: upErr } = await db.from("applications").update({ fit_score: score }).eq("id", app.id);
      if (!upErr) {
        updated++;
        driftTotal += Math.abs(score - (app.fit_score ?? 0));
      }
    }
  }

  return NextResponse.json({
    total: rows.length,
    updated,
    unchanged: rows.length - updated,
    avg_drift: updated ? Math.round(driftTotal / updated) : 0,
  });
}
