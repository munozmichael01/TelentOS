import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { setRequestLocale, getTranslations } from "next-intl/server";

/**
 * Catálogo canónico de skills (migración 0027) — vista de solo lectura.
 * Es la fuente del matching candidato↔oferta: candidate_skills y job_skills
 * referencian estas entidades; el CV-parser y los endpoints de ofertas resuelven
 * texto libre contra este catálogo (alias → nombre canónico, crean las nuevas).
 * La gestión (editar aliases, fusionar, curar) llegará en una iteración posterior.
 */

export default async function SkillsCatalogPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const supabase = createClient();
  const t = await getTranslations({ locale: params.locale, namespace: "Settings" });

  const CATEGORY_LABEL: Record<string, string> = {
    language: t("skills.categories.language"),
    framework: t("skills.categories.framework"),
    tool: t("skills.categories.tool"),
    domain: t("skills.categories.domain"),
    soft: t("skills.categories.soft"),
  };

  const [{ data: skills }, { data: candSkills }, { data: jobSkills }] = await Promise.all([
    supabase.from("skills").select("id, name, category, aliases").order("name"),
    supabase.from("candidate_skills").select("skill_id"),
    supabase.from("job_skills").select("skill_id"),
  ]);

  const candCount = new Map<string, number>();
  for (const r of candSkills ?? []) candCount.set(r.skill_id, (candCount.get(r.skill_id) ?? 0) + 1);
  const jobCount = new Map<string, number>();
  for (const r of jobSkills ?? []) jobCount.set(r.skill_id, (jobCount.get(r.skill_id) ?? 0) + 1);

  // Agrupar por categoría (sin categoría al final, como "Sin clasificar")
  const groups = new Map<string, NonNullable<typeof skills>>();
  for (const s of skills ?? []) {
    const key = s.category ?? "otras";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }
  const orderedKeys = [...Object.keys(CATEGORY_LABEL), "otras"].filter((k) => groups.has(k));

  return (
    <div>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("skills.title")}
        description={t("skills.description")}
      />

      <div className="flex flex-col gap-4">
        {orderedKeys.map((key) => {
          const list = groups.get(key)!;
          return (
            <Card key={key} panel className="p-5">
              <div className="flex items-baseline gap-3 mb-3">
                <h2 className="font-display font-black text-[15px] m-0">
                  {CATEGORY_LABEL[key] ?? t("skills.categories.otras")}
                </h2>
                <span className="font-mono text-[10.5px] text-[#79746B]">{list.length}</span>
              </div>
              <div className="flex flex-col">
                {list.map((s) => {
                  const nCand = candCount.get(s.id) ?? 0;
                  const nJob = jobCount.get(s.id) ?? 0;
                  return (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 py-2 border-b border-[#E7E1D4] last:border-b-0"
                    >
                      <span className="text-[13.5px] font-semibold min-w-[180px]">{s.name}</span>
                      <span className="flex-1 font-mono text-[10.5px] text-[#79746B] truncate">
                        {s.aliases.length > 0 ? t("skills.alias", { aliases: s.aliases.join(" · ") }) : ""}
                      </span>
                      <span className="font-mono text-[10.5px] text-[#79746B] whitespace-nowrap">
                        {t("skills.count", { count: nCand, countJobs: nJob })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      <p className="text-[12px] text-[#79746B] mt-4">
        {t("skills.footer")}
      </p>
    </div>
  );
}
