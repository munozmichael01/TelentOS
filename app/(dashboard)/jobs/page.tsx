import Link from "next/link";
import { Plus, FileUp, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { formatSalaryRange } from "@/lib/utils";
import type { Job } from "@/lib/types";

function tileInitials(title: string): string {
  return title.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

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
      <PageHeader title="Ofertas" eyebrow="Reclutamiento">
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
        <div className="flex flex-col gap-2">
          {(jobs as Job[]).map((job) => {
            const salary = formatSalaryRange(job.salary_min, job.salary_max, job.salary_currency);
            return (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="flex items-center gap-[18px] rounded-[14px] border border-[#E7E1D4] bg-[#F4F0E8] px-[18px] py-4 transition-[border-color,box-shadow] duration-[120ms] hover:border-[#1A1A17] hover:shadow-[3px_3px_0_#1A1A17]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#DCEFE4] font-[Archivo] text-base font-black text-[#0E5C4A]">
                  {tileInitials(job.title)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-[Archivo] text-[16px] font-extrabold tracking-[-0.3px] text-[#1A1A17]">{job.title}</span>
                    <Badge variant={STATUS_VARIANT[job.status]}>{STATUS_LABEL[job.status]}</Badge>
                    {job.source === "ai" && <Badge variant="outline"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline", verticalAlign: "middle" }}><path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z"/></svg> IA</Badge>}
                    {job.source.startsWith("import") && <Badge variant="outline">importada</Badge>}
                  </div>
                  <p className="mt-1.5 font-mono text-[11.5px] text-[#79746B]">
                    {[job.location, TYPE_LABEL[job.employment_type], job.sector, job.department].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="ml-auto flex shrink-0 items-center gap-5">
                  {salary && (
                    <div className="text-right">
                      <div className="text-sm font-bold whitespace-nowrap">{salary}</div>
                      <div className="mt-0.5 font-mono text-[10.5px] text-[#79746B]">salario / año</div>
                    </div>
                  )}
                  <div className="flex items-center gap-[7px] rounded-full border border-[#E7E1D4] bg-[#FCFAF6] px-3 py-1.5">
                    <Users size={14} className="text-[#0E5C4A]" />
                    <span className="font-[Archivo] text-[13px] font-extrabold text-[#0E5C4A]">{countByJob.get(job.id) ?? 0}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
