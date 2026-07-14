import { NextResponse } from "next/server";
import { requireApiRole, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";
import { generateInsightsForCompany } from "@/lib/insights/generate";

/**
 * Refresh manual del dashboard (botón "Actualizar sugerencias"). Resuelve la
 * empresa desde el membership (no `.limit(1)`) y delega en el generador compartido
 * — el mismo que usa el cron. La redacción va por runAgent (presupuesto + auditoría).
 */
export async function POST() {
  const { companyId, error } = await requireApiRole(["owner", "hr_admin", "recruiter"]);
  if (error) return error;

  try {
    const result = await generateInsightsForCompany(createAdminClient(), companyId!);
    return NextResponse.json({ ...result, status: "ok" });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Error al generar insights", 500);
  }
}
