import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { formatSalaryRange } from "@/lib/utils";
import type { Job } from "@/lib/types";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  full_time: "Jornada completa", part_time: "Parcial", contract: "Temporal", internship: "Prácticas",
};

/** Página pública de empleo de la empresa (rol anon vía RLS). */
export default async function CareersPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("slug", params.slug)
    .maybeSingle();
  if (!company) notFound();

  const { data: jobs } = await supabase
    .from("jobs")
    .select("*")
    .eq("company_id", company.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-10">
          {company.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.logo_url} alt={company.name} className="h-16 w-16 rounded-xl border object-contain" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-xl font-bold text-primary">
              {company.name[0]}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">Trabaja en {company.name}</h1>
            {company.description && <p className="mt-1 text-sm text-muted-foreground">{company.description}</p>}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {(jobs ?? []).length} posiciones abiertas
        </h2>
        <div className="space-y-3">
          {((jobs ?? []) as Job[]).map((job) => (
            <Link
              key={job.id}
              href={`/careers/${params.slug}/jobs/${job.id}`}
              className="block rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{job.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    {job.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location}</span>}
                    <span className="inline-flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{TYPE_LABEL[job.employment_type]}</span>
                    <span>{formatSalaryRange(job.salary_min, job.salary_max, job.salary_currency)}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {job.skills.slice(0, 3).map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
                </div>
              </div>
            </Link>
          ))}
          {(jobs ?? []).length === 0 && (
            <p className="rounded-xl border border-dashed py-12 text-center text-muted-foreground">
              No hay posiciones abiertas ahora mismo.
            </p>
          )}
        </div>
        <footer className="mt-12 text-center text-xs text-muted-foreground">
          Powered by TalentOS
        </footer>
      </main>
    </div>
  );
}
