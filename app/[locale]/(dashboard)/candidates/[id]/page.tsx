import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { FitBadge } from "@/components/fit-badge";
import { FileLink } from "@/components/features/file-link";
import { CvParserPanel } from "@/components/features/cv-parser-panel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatDateTime } from "@/lib/utils";

export default async function CandidateProfilePage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: candidate } = await supabase
    .from("candidates")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!candidate) notFound();

  const { data: applications } = await supabase
    .from("applications")
    .select("id, fit_score, status, created_at, utm, source, jobs(id, title), job_stages(name)")
    .eq("candidate_id", params.id)
    .order("created_at", { ascending: false });

  const apps = applications ?? [];

  return (
    <div>
      <Link href="/candidates" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />
        Candidatos
      </Link>

      <PageHeader
        title={candidate.name}
        description={[candidate.email, candidate.location].filter(Boolean).join(" · ")}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Applications list */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {apps.length} inscripción{apps.length !== 1 ? "es" : ""}
          </h2>

          {apps.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin inscripciones registradas.</p>
          ) : (
            apps.map((app) => {
              const job = app.jobs as unknown as { id: string; title: string } | null;
              const stage = app.job_stages as unknown as { name: string } | null;
              const utm = app.utm as Record<string, string> | null;
              const origin = utm?.utm_source === "career_site" ? "Career site" : utm?.utm_source || app.source || "—";

              return (
                <Card key={app.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="text-base leading-snug">{job?.title ?? "Oferta eliminada"}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatDate(app.created_at)} · {origin}</p>
                      </div>
                      <FitBadge score={app.fit_score} />
                    </div>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between gap-3 pt-0">
                    <Badge variant={app.status === "hired" ? "success" : app.status === "rejected" ? "destructive" : "secondary"}>
                      {stage?.name ?? app.status}
                    </Badge>
                    <Link
                      href={`/applications/${app.id}`}
                      className="text-xs font-medium text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                    >
                      Ver candidatura →
                    </Link>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Candidate sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Datos de contacto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-20 shrink-0">Email</span>
                <a href={`mailto:${candidate.email}`} className="font-medium hover:underline truncate">{candidate.email}</a>
              </div>
              {candidate.phone && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-20 shrink-0">Teléfono</span>
                  <a href={`tel:${candidate.phone}`} className="font-medium hover:underline">{candidate.phone}</a>
                </div>
              )}
              {candidate.location && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-20 shrink-0">Ubicación</span>
                  <span className="font-medium">{candidate.location}</span>
                </div>
              )}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-muted-foreground w-20 shrink-0">Registro</span>
                <span className="text-muted-foreground text-xs">{formatDateTime(candidate.created_at)}</span>
              </div>
            </CardContent>
          </Card>

          {candidate.cv_url && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Currículum</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <FileLink bucket="cvs" resourceId={candidate.id} label="Ver CV adjunto" />
                <CvParserPanel candidateId={candidate.id} hasCv={Boolean(candidate.cv_url)} />
              </CardContent>
            </Card>
          )}

          {(candidate.skills?.length > 0 || candidate.summary) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Perfil</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {candidate.skills?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.skills.map((s: string) => (
                      <Badge key={s} variant="secondary">{s}</Badge>
                    ))}
                  </div>
                )}
                {candidate.summary && (
                  <p className="text-muted-foreground leading-relaxed">{candidate.summary}</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
