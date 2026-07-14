import { NextResponse } from "next/server";
import { requireApiRole, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";
import { runCareerWriter, type CareerSection } from "@/agents/agent-career-writer";

const SECTIONS: CareerSection[] = ["about", "culture", "benefits"];

export async function POST(req: Request) {
  // Career site = pipeline de reclutamiento
  const { companyId, error } = await requireApiRole(["owner", "hr_admin", "recruiter"]);
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body || !SECTIONS.includes(body.section)) {
    return jsonError("section debe ser 'about', 'culture' o 'benefits'");
  }

  // El contexto de empresa lo resuelve el servidor desde la sesión (no lo envía el cliente).
  const db = createAdminClient();
  const { data: company } = await db
    .from("companies")
    .select("name, description, country")
    .eq("id", companyId!)
    .maybeSingle();

  const result = await runCareerWriter({
    companyId: companyId!,
    section: body.section,
    prompt: typeof body.prompt === "string" ? body.prompt.slice(0, 500) : undefined,
    current: body.current && typeof body.current === "object" ? body.current : undefined,
    company: company ?? undefined,
  });

  return NextResponse.json({ ...result.output, status: result.status });
}
