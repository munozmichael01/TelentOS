import { NextResponse } from "next/server";
import { requireApiRole, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";
import { dedupeStrings, resolveSkillIds } from "@/lib/skills";

const EDITABLE = [
  "title", "description", "skills", "salary_min", "salary_max", "salary_currency",
  "location", "city", "country_code", "employment_type", "sector", "department",
  "category", "category_key", "closes_at", "experience_min_years", "status",
] as const;

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { companyId, error } = await requireApiRole(["owner", "hr_admin", "recruiter"]);
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of EDITABLE) {
    if (key in body) updates[key] = body[key];
  }
  if ("skills" in updates) {
    updates.skills = dedupeStrings(Array.isArray(updates.skills) ? (updates.skills as string[]) : []);
  }

  const db = createAdminClient();
  const { data, error: dbError } = await db
    .from("jobs")
    .update(updates)
    .eq("id", params.id)
    .eq("company_id", companyId!)
    .select()
    .single();
  if (dbError) return jsonError(dbError.message, 500);

  // Si cambian las skills, re-resolver contra el catálogo y reescribir job_skills.
  // Degradación explícita mientras 0029 no esté aplicada (matching cae a texto legado).
  let structuredSkills = !("skills" in updates);
  if ("skills" in updates) {
    const skillIds = await resolveSkillIds(db, updates.skills as string[]);
    const { error: delErr } = await db.from("job_skills").delete().eq("job_id", params.id);
    if (!delErr && skillIds.length > 0) {
      const { error: jsErr } = await db
        .from("job_skills")
        .insert(skillIds.map((skill_id) => ({ job_id: params.id, skill_id })));
      structuredSkills = !jsErr;
    } else {
      structuredSkills = !delErr;
    }
  }

  return NextResponse.json({ job: data, structured_skills: structuredSkills });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { companyId, error } = await requireApiRole(["owner", "hr_admin", "recruiter"]);
  if (error) return error;
  const db = createAdminClient();
  const { error: dbError } = await db
    .from("jobs")
    .delete()
    .eq("id", params.id)
    .eq("company_id", companyId!);
  if (dbError) return jsonError(dbError.message, 500);
  return NextResponse.json({ ok: true });
}
