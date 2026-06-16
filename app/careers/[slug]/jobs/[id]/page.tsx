import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, MapPin, Briefcase, Banknote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/markdown";
import { ApplyForm } from "@/components/features/apply-form";
import { createClient } from "@/lib/supabase/server";
import { formatSalaryRange } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  full_time: "Jornada completa", part_time: "Parcial", contract: "Temporal", internship: "Prácticas",
};

export default async function PublicJobPage({
  params,
}: {
  params: { slug: string; id: string };
}) {
  const supabase = createClient();
  const { data: company } = await supabase
    .from("companies")
    .select("id, name, slug")
    .eq("slug", params.slug)
    .maybeSingle();
  if (!company) notFound();

  const { data: job } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", params.id)
    .eq("company_id", company.id)
    .eq("status", "active")
    .maybeSingle();
  if (!job) notFound();

  return (
    <div className="min-h-screen bg-muted/30">
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link
          href={`/careers/${params.slug}`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Todas las posiciones de {company.name}
        </Link>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h1 className="text-2xl font-bold">{job.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {job.location && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{job.location}</span>}
            <span className="inline-flex items-center gap-1"><Briefcase className="h-4 w-4" />{TYPE_LABEL[job.employment_type]}</span>
            <span className="inline-flex items-center gap-1"><Banknote className="h-4 w-4" />{formatSalaryRange(job.salary_min, job.salary_max, job.salary_currency)}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {job.skills.map((s: string) => <Badge key={s} variant="secondary">{s}</Badge>)}
          </div>
          {job.description && (
            <div className="mt-6">
              <Markdown content={job.description} />
            </div>
          )}
        </div>

        <div className="mt-6">
          <Suspense>
            <ApplyForm jobId={job.id} />
          </Suspense>
        </div>
        <footer className="mt-12 text-center text-xs text-muted-foreground">
          Powered by TalentOS
        </footer>
      </main>
    </div>
  );
}
