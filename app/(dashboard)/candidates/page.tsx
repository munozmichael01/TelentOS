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

  const { data: candidates } = await supabase
    .from("candidates")
    .select(`
      id, name, email, location, cv_url, created_at,
      applications(id, fit_score, status, created_at, jobs(title), job_stages(name))
    `)
    .order("created_at", { ascending: false });

  type RawApp = {
    id: string;
    fit_score: number | null;
    status: string;
    created_at: string;
    jobs: { title: string } | null;
    job_stages: { name: string } | null;
  };

  type Candidate = {
    id: string;
    name: string;
    email: string;
    location: string | null;
    cv_url: string | null;
    created_at: string;
    applications: RawApp[];
  };

  const rows = (candidates ?? []) as unknown as Candidate[];

  return (
    <div>
      <PageHeader
        title="Candidatos"
        description={`${rows.length} persona${rows.length !== 1 ? "s" : ""} en la base de datos`}
      />
      {rows.length === 0 ? (
        <EmptyState
          title="Sin candidatos"
          description="Las candidaturas llegan desde el career site o desde los canales de distribución."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidato</TableHead>
              <TableHead>Última oferta</TableHead>
              <TableHead>Etapa</TableHead>
              <TableHead>Inscripciones</TableHead>
              <TableHead>Registrado</TableHead>
              <TableHead className="text-right">Fit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => {
              const apps = [...(c.applications ?? [])].sort(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              );
              const latest = apps[0] ?? null;
              return (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link href={`/candidates/${c.id}`} className="font-medium hover:underline">
                      {c.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{c.email}</p>
                    {c.location && <p className="text-xs text-muted-foreground">{c.location}</p>}
                  </TableCell>
                  <TableCell className="text-sm">
                    {latest?.jobs?.title ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    {latest ? (
                      <Badge variant={latest.status === "hired" ? "success" : latest.status === "rejected" ? "destructive" : "secondary"}>
                        {latest.job_stages?.name ?? latest.status}
                      </Badge>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm tabular-nums">
                      {apps.length}
                      {apps.length > 1 && (
                        <span className="ml-1 text-xs text-muted-foreground">ofertas</span>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(c.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <FitBadge score={latest?.fit_score ?? null} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
