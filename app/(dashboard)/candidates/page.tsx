import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { FitBadge } from "@/components/fit-badge";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export default async function CandidatesPage() {
  const supabase = createClient();
  const { data: applications } = await supabase
    .from("applications")
    .select("id, fit_score, status, created_at, utm, source, candidates(name, email, location, experience_years), jobs(title), job_stages(name)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader title="Candidatos" description="Todas las candidaturas en todos los procesos." />
      {(applications ?? []).length === 0 ? (
        <EmptyState
          title="Sin candidaturas"
          description="Las candidaturas llegan desde el career site o desde los canales de distribución."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidato</TableHead>
              <TableHead>Oferta</TableHead>
              <TableHead>Etapa</TableHead>
              <TableHead>Origen</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Fit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(applications ?? []).map((app) => {
              const candidate = app.candidates as unknown as { name: string; email: string; location: string | null } | null;
              const utm = app.utm as Record<string, string>;
              return (
                <TableRow key={app.id}>
                  <TableCell>
                    <Link href={`/applications/${app.id}`} className="font-medium hover:underline">
                      {candidate?.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{candidate?.email}</p>
                  </TableCell>
                  <TableCell>{(app.jobs as unknown as { title: string } | null)?.title}</TableCell>
                  <TableCell>
                    <Badge variant={app.status === "hired" ? "success" : app.status === "rejected" ? "destructive" : "secondary"}>
                      {(app.job_stages as unknown as { name: string } | null)?.name ?? app.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {utm?.utm_source === "career_site" ? "Career site" : utm?.utm_source || app.source}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(app.created_at)}</TableCell>
                  <TableCell className="text-right"><FitBadge score={app.fit_score} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
