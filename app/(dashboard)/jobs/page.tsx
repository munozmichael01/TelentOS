import Link from "next/link";
import { Plus, FileUp } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { formatSalaryRange } from "@/lib/utils";
import type { Job } from "@/lib/types";

const STATUS_LABEL: Record<string, string> = {
  draft: "borrador", active: "activa", closed: "cerrada", archived: "archivada",
};
const STATUS_VARIANT: Record<string, "secondary" | "success" | "outline"> = {
  draft: "secondary", active: "success", closed: "outline", archived: "outline",
};
const TYPE_LABEL: Record<string, string> = {
  full_time: "Jornada completa", part_time: "Parcial", contract: "Temporal", internship: "Prácticas",
};

/** Listado con segmentación por estado, sector, ubicación y departamento. */
export default async function JobsPage({
  searchParams,
}: {
  searchParams: { status?: string; sector?: string; location?: string; department?: string };
}) {
  const supabase = createClient();

  let query = supabase.from("jobs").select("*").order("created_at", { ascending: false });
  if (searchParams.status) query = query.eq("status", searchParams.status);
  if (searchParams.sector) query = query.eq("sector", searchParams.sector);
  if (searchParams.department) query = query.eq("department", searchParams.department);
  if (searchParams.location) query = query.ilike("location", `%${searchParams.location}%`);

  const [{ data: jobs }, { data: allJobs }, { data: appCounts }] = await Promise.all([
    query,
    supabase.from("jobs").select("sector, department"),
    supabase.from("applications").select("job_id"),
  ]);

  const countByJob = new Map<string, number>();
  for (const a of appCounts ?? []) {
    countByJob.set(a.job_id, (countByJob.get(a.job_id) ?? 0) + 1);
  }
  const sectors = Array.from(new Set((allJobs ?? []).map((j) => j.sector).filter(Boolean))) as string[];
  const departments = Array.from(new Set((allJobs ?? []).map((j) => j.department).filter(Boolean))) as string[];

  const filterLink = (params: Record<string, string | undefined>) => {
    const merged = { ...searchParams, ...params };
    const qs = Object.entries(merged)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
      .join("&");
    return qs ? `/jobs?${qs}` : "/jobs";
  };

  return (
    <div>
      <PageHeader title="Ofertas" description="Crea, importa y distribuye tus ofertas de empleo.">
        <Button variant="outline" asChild>
          <Link href="/jobs/import"><FileUp />Importar</Link>
        </Button>
        <Button asChild>
          <Link href="/jobs/new"><Plus />Nueva oferta</Link>
        </Button>
      </PageHeader>

      {/* Segmentación */}
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <div className="flex flex-wrap gap-1.5">
          {["draft", "active", "closed"].map((s) => (
            <Link key={s} href={filterLink({ status: searchParams.status === s ? undefined : s })}>
              <Badge variant={searchParams.status === s ? "default" : "outline"}>{STATUS_LABEL[s]}</Badge>
            </Link>
          ))}
          {sectors.map((s) => (
            <Link key={s} href={filterLink({ sector: searchParams.sector === s ? undefined : s })}>
              <Badge variant={searchParams.sector === s ? "default" : "outline"}>{s}</Badge>
            </Link>
          ))}
          {departments.map((d) => (
            <Link key={d} href={filterLink({ department: searchParams.department === d ? undefined : d })}>
              <Badge variant={searchParams.department === d ? "default" : "outline"}>{d}</Badge>
            </Link>
          ))}
        </div>
      </div>

      {(jobs ?? []).length === 0 ? (
        <EmptyState
          title="No hay ofertas con estos filtros"
          description="Crea una oferta desde cero con el agente de redacción o importa desde XML, CSV, Excel o una URL."
        >
          <div className="flex gap-2">
            <Button asChild><Link href="/jobs/new">Crear con IA</Link></Button>
            <Button variant="outline" asChild><Link href="/jobs/import">Importar</Link></Button>
          </div>
        </EmptyState>
      ) : (
        <div className="space-y-2">
          {(jobs as Job[]).map((job) => (
            <Link key={job.id} href={`/jobs/${job.id}`}>
              <Card className="mb-2 p-4 transition-colors hover:bg-accent/50">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{job.title}</span>
                      <Badge variant={STATUS_VARIANT[job.status]}>{STATUS_LABEL[job.status]}</Badge>
                      {job.source === "ai" && <Badge variant="outline">✨ IA</Badge>}
                      {job.source.startsWith("import") && <Badge variant="outline">importada</Badge>}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {[job.location, TYPE_LABEL[job.employment_type], job.sector, job.department]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">
                      {formatSalaryRange(job.salary_min, job.salary_max, job.salary_currency)}
                    </span>
                    <Badge variant="secondary">{countByJob.get(job.id) ?? 0} candidatos</Badge>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
