import { NextResponse } from "next/server";
import { requireApiRole, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";
import { runCareerWriter, type CareerIntake, type CareerTone } from "@/agents/agent-career-writer";

const TONES: CareerTone[] = ["cercano", "profesional", "creativo"];

/** Normaliza el intake que envía el cliente (sanea tipos, acota longitudes). */
function parseIntake(raw: unknown): CareerIntake | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Record<string, unknown>;
  const strArr = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((s) => s.slice(0, 80)).slice(0, 12) : [];
  const metrics = Array.isArray(b.metrics)
    ? b.metrics
        .filter((m): m is { value?: unknown; label?: unknown } => !!m && typeof m === "object")
        .map((m) => ({ value: String((m as { value?: unknown }).value ?? "").slice(0, 20), label: String((m as { label?: unknown }).label ?? "").slice(0, 40) }))
        .filter((m) => m.value || m.label)
        .slice(0, 8)
    : [];
  const tone = typeof b.tone === "string" && TONES.includes(b.tone as CareerTone) ? (b.tone as CareerTone) : "cercano";
  return { about: typeof b.about === "string" ? b.about.slice(0, 800) : "", values: strArr(b.values), benefits: strArr(b.benefits), metrics, tone };
}

export async function POST(req: Request) {
  // Career site = pipeline de reclutamiento
  const { companyId, error } = await requireApiRole(["owner", "hr_admin", "recruiter"]);
  if (error) return error;

  const body = await req.json().catch(() => null);
  const intake = parseIntake(body?.intake);
  if (!intake) return jsonError("Falta 'intake' con el contexto para generar");

  // El contexto de empresa lo resuelve el servidor desde la sesión (no lo envía el cliente).
  const db = createAdminClient();
  const { data: company } = await db
    .from("companies")
    .select("name, description, country")
    .eq("id", companyId!)
    .maybeSingle();

  const result = await runCareerWriter({ companyId: companyId!, intake, company: company ?? undefined });

  // Con `only`, el cliente aplica solo un bloque (regenerar por bloque, secundario).
  return NextResponse.json({ proposal: result.output.proposal, rationale: result.output.rationale, status: result.status });
}
