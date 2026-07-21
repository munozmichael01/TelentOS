import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { idFromSlug, formatSalary } from "@/lib/board/format";
import { resolveSkillIds } from "@/lib/skills";
import { computeRecruiterFit, type JobSkillReq } from "@/lib/job-board/fit";
import type { EducationLevel, SeniorityLevel } from "@/lib/types";
import { ApplyWizard } from "@/components/board/apply-wizard";

const CAP = (s: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

// Pantalla de aplicar (wizard 3–4 pasos, fiel a Design). Pública: aplicar no exige cuenta
// (el apply anónimo crea candidato). Desktop = split con preview de la oferta a la derecha.
export default async function ApplyPage({ params }: { params: { locale: string; slug: string } }) {
  setRequestLocale(params.locale);
  const id = idFromSlug(params.slug);
  if (!id) notFound();

  const supabase = createClient();
  const { data: job } = await supabase
    .from("jobs")
    .select("id, title, description, modality, city, salary_min, salary_max, salary_currency, employment_type, education_level, seniority_level, experience_min_years, company:companies(name, logo_url)")
    .eq("id", id).eq("status", "active").maybeSingle();
  if (!job) notFound();

  const [{ data: screening }, { data: skillRows }] = await Promise.all([
    supabase.from("screening_questions").select("id, type, prompt, options, required").eq("job_id", id).order("order_index"),
    supabase.from("job_skills").select("requirement, skills(name)").eq("job_id", id),
  ]);
  const skills = (skillRows ?? []).map((r) => ({
    name: (r.skills as { name?: string } | null)?.name ?? "",
    requirement: (r.requirement ?? "deseable") as "excluyente" | "deseable",
  })).filter((s) => s.name);

  const j = job as unknown as {
    id: string; title: string; description: string | null; modality: string | null; city: string | null;
    salary_min: number | null; salary_max: number | null; salary_currency: string | null; employment_type: string | null;
    education_level: string | null; seniority_level: string | null; experience_min_years: number | null;
    company: { name: string; logo_url: string | null } | null;
  };

  const t = await getTranslations({ locale: params.locale, namespace: "Board" });
  const reqs: string[] = [];
  if ((j.experience_min_years ?? 0) > 0) reqs.push(t("detail.reqExperience", { years: j.experience_min_years! }));
  if (j.education_level) reqs.push(t("detail.reqEducation", { level: CAP(j.education_level) }));
  if (j.seniority_level) reqs.push(t("detail.reqSeniority", { level: CAP(j.seniority_level) }));

  // ¿candidato ya logueado? decide el cierre del apply + habilita "match para ti" (oculto a anónimo).
  const { data: { user } } = await supabase.auth.getUser();
  const authed = user?.app_metadata?.audience === "candidate";

  // Match para ti (N de 4) — solo logueado con ficha; anónimo lo oculta (decisión de Design).
  let match: { met: number; total: number } | null = null;
  if (authed && user) {
    const admin = createAdminClient();
    const { data: cands } = await admin.from("candidates")
      .select("skills, experience_years, education_level, city, country_code, location")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(1);
    const cand = cands?.[0];
    if (cand) {
      const [{ data: jSkills }, candSkillIds] = await Promise.all([
        admin.from("job_skills").select("skill_id, requirement").eq("job_id", id),
        resolveSkillIds(admin, Array.isArray(cand.skills) ? cand.skills : []),
      ]);
      const fit = computeRecruiterFit({
        job: {
          skills: (jSkills ?? []).map((s) => ({ skillId: s.skill_id, requirement: (s.requirement ?? "deseable") as JobSkillReq["requirement"] })),
          experienceMinYears: j.experience_min_years ?? 0,
          educationLevel: (j.education_level ?? null) as EducationLevel | null,
          seniorityLevel: (j.seniority_level ?? null) as SeniorityLevel | null,
          country: null, city: j.city, location: null,
        },
        candidate: {
          skillIds: candSkillIds, experienceYears: cand.experience_years ?? 0,
          educationLevel: (cand.education_level ?? null) as EducationLevel | null, seniorityLevel: null,
          country: cand.country_code ?? null, city: cand.city ?? null, location: cand.location ?? null,
        },
      });
      const b = fit.breakdown;
      const met = [
        b.skills.missingExcluyente.length === 0 && b.skills.matched.length > 0,
        b.experience.met,
        b.education.applicable ? b.education.met : true,
        b.location.pct >= 50,
      ].filter(Boolean).length;
      match = { met, total: 4 };
    }
  }

  return (
    <ApplyWizard
      job={{
        id: j.id, title: j.title, modality: j.modality, city: j.city,
        company: j.company?.name ?? "", logoUrl: j.company?.logo_url ?? null,
        salary: formatSalary(j, params.locale),
      }}
      preview={{ description: j.description, employmentType: j.employment_type, skills, reqs, match }}
      screening={(screening ?? []) as { id: string; type: string; prompt: string; options: string[]; required: boolean }[]}
      slug={params.slug}
      locale={params.locale}
      authed={authed}
    />
  );
}
