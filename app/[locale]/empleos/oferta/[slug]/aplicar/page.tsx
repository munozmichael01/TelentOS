import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { idFromSlug, formatSalary } from "@/lib/board/format";
import { ApplyWizard } from "@/components/board/apply-wizard";

// Pantalla de aplicar (wizard de 4 pasos, fiel a Design). Pública: aplicar no exige cuenta
// (el apply anónimo crea candidato). El CV-first parsea con /api/careers/parse-cv.
export default async function ApplyPage({ params }: { params: { locale: string; slug: string } }) {
  setRequestLocale(params.locale);
  const id = idFromSlug(params.slug);
  if (!id) notFound();

  const supabase = createClient();
  const { data: job } = await supabase
    .from("jobs")
    .select("id, title, modality, city, salary_min, salary_max, salary_currency, company:companies(name, logo_url)")
    .eq("id", id).eq("status", "active").maybeSingle();
  if (!job) notFound();

  const { data: screening } = await supabase
    .from("screening_questions").select("id, type, prompt, options, required").eq("job_id", id).order("order_index");

  const j = job as unknown as {
    id: string; title: string; modality: string | null; city: string | null;
    salary_min: number | null; salary_max: number | null; salary_currency: string | null;
    company: { name: string; logo_url: string | null } | null;
  };

  return (
    <ApplyWizard
      job={{
        id: j.id, title: j.title, modality: j.modality, city: j.city,
        company: j.company?.name ?? "", logoUrl: j.company?.logo_url ?? null,
        salary: formatSalary(j, params.locale),
      }}
      screening={(screening ?? []) as { id: string; type: string; prompt: string; options: string[]; required: boolean }[]}
      slug={params.slug}
      locale={params.locale}
    />
  );
}
