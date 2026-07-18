import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, History } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { FitBadge } from "@/components/fit-badge";
import { FileLink } from "@/components/features/file-link";
import { CandidateAnalyzerPanel } from "@/components/features/candidate-analyzer-panel";
import { NotesPanel } from "@/components/features/notes-panel";
import { InterviewPanel } from "@/components/features/interview-panel";
import { HireButton } from "@/components/features/hire-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";
import { explainFitScore, type SkillRef } from "@/lib/fit-explain";
import type { EvaluationTemplate, JobStage } from "@/lib/types";

type SkillJoinRow = { skill_id: string; skills: { name: string } | null };
const toSkillRefs = (rows: SkillJoinRow[] | null): SkillRef[] =>
  (rows ?? []).filter((r) => r.skills).map((r) => ({ id: r.skill_id, name: r.skills!.name }));

export default async function ApplicationPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: app } = await supabase
    .from("applications")
    .select("*, candidates(*), jobs(*), job_stages(name)")
    .eq("id", params.id)
    .maybeSingle();
  if (!app) notFound();

  const [{ data: events }, { data: notes }, { data: interviews }, { data: templates }, { data: stages }, { data: managers }] =
    await Promise.all([
      supabase.from("application_events").select("*").eq("application_id", params.id).order("created_at", { ascending: false }),
      supabase.from("notes").select("*").eq("application_id", params.id).order("created_at", { ascending: false }),
      supabase.from("interviews").select("*, interview_feedback(*)").eq("application_id", params.id).order("scheduled_at", { ascending: false }),
      supabase.from("evaluation_templates").select("*"),
      supabase.from("job_stages").select("*").eq("job_id", app.job_id).order("order_index"),
      supabase.from("employees").select("id, name").eq("status", "active"),
    ]);

  const candidate = app.candidates as unknown as {
    id: string; name: string; email: string; phone: string | null; location: string | null;
    city: string | null; country_code: string | null;
    skills: string[]; experience_years: number; summary: string | null; cv_url: string | null;
  };
  const job = app.jobs as unknown as {
    id: string; title: string; skills: string[]; experience_min_years: number;
    location: string | null; city: string | null; country_code: string | null;
  };
  const currentStage = app.job_stages as unknown as { name: string } | null;

  // Desglose determinista del fit (§4.5b): mismo cálculo que el score persistido —
  // el número no depende del LLM. Se muestra al cargar, sin invocar al agente.
  const [{ data: candSkillRows }, { data: jobSkillRows }] = await Promise.all([
    supabase.from("candidate_skills").select("skill_id, skills(name)").eq("candidate_id", candidate.id),
    supabase.from("job_skills").select("skill_id, skills(name)").eq("job_id", app.job_id),
  ]);
  const fitBreakdown = explainFitScore(
    { skills: candidate.skills ?? [], experience_years: candidate.experience_years ?? 0, location: candidate.location },
    { skills: job.skills ?? [], experience_min_years: job.experience_min_years ?? 0, location: job.location },
    {
      candidateSkills: toSkillRefs(candSkillRows as unknown as SkillJoinRow[] | null),
      jobSkills: toSkillRefs(jobSkillRows as unknown as SkillJoinRow[] | null),
      candidateCity: candidate.city,
      candidateCountry: candidate.country_code,
      jobCity: job.city,
      jobCountry: job.country_code,
    },
  );

  return (
    <div>
      <Link href={`/app/jobs/${app.job_id}`} className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />
        {job.title}
      </Link>
      <PageHeader title={candidate.name} description={`${candidate.email}${candidate.location ? ` · ${candidate.location}` : ""}`}>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <FitBadge score={app.fit_score} />
            <p className="text-xs text-muted-foreground">fit score</p>
          </div>
          <HireButton
            applicationId={app.id}
            candidateName={candidate.name}
            managers={managers ?? []}
            disabled={app.status === "hired"}
          />
        </div>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Perfil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-1.5">
                {candidate.skills.map((s: string) => <Badge key={s} variant="secondary">{s}</Badge>)}
              </div>
              <p className="text-muted-foreground">
                {candidate.experience_years} años de experiencia
                {candidate.phone ? ` · ${candidate.phone}` : ""}
              </p>
              {candidate.summary && <p>{candidate.summary}</p>}
              {candidate.cv_url && <FileLink bucket="cvs" resourceId={candidate.id} label="Ver CV adjunto" />}
              <Separator />
              <p className="text-xs text-muted-foreground">
                Origen: {app.utm?.utm_source === "career_site" ? "Career site" : app.utm?.utm_source || app.source}
                {app.utm?.utm_medium ? ` / ${app.utm.utm_medium}` : ""} · Etapa actual:{" "}
                <span className="font-medium text-foreground">{currentStage?.name ?? "—"}</span>
              </p>
            </CardContent>
          </Card>

          <Tabs defaultValue="interviews">
            <TabsList>
              <TabsTrigger value="interviews">Entrevistas</TabsTrigger>
              <TabsTrigger value="notes">Notas ({(notes ?? []).length})</TabsTrigger>
              <TabsTrigger value="history">Historial</TabsTrigger>
            </TabsList>
            <TabsContent value="interviews">
              <InterviewPanel
                applicationId={app.id}
                interviews={interviews ?? []}
                templates={(templates ?? []) as EvaluationTemplate[]}
                stages={(stages ?? []) as JobStage[]}
                candidateName={candidate.name}
                candidateEmail={candidate.email}
                managers={managers ?? []}
              />
            </TabsContent>
            <TabsContent value="notes">
              <NotesPanel applicationId={app.id} notes={notes ?? []} />
            </TabsContent>
            <TabsContent value="history">
              <div className="space-y-2">
                {(events ?? []).map((e) => (
                  <div key={e.id} className="flex gap-3 rounded-md border p-3 text-sm">
                    <History className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p>
                        {e.type === "created" && "Candidatura creada"}
                        {e.type === "stage_change" && <>Movido de <b>{e.from_stage ?? "—"}</b> a <b>{e.to_stage}</b></>}
                        {e.type === "hired" && <>Contratado (desde <b>{e.from_stage ?? "—"}</b>)</>}
                        {e.type === "rejected" && <>Descartado (desde <b>{e.from_stage ?? "—"}</b>)</>}
                      </p>
                      {e.reason && <p className="text-muted-foreground">“{e.reason}”</p>}
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {e.actor_email ?? "sistema"} · {formatDateTime(e.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div>
          <CandidateAnalyzerPanel
            applicationId={app.id}
            fitBreakdown={fitBreakdown}
            savedAnalysis={app.ai_analysis ?? null}
          />
        </div>
      </div>
    </div>
  );
}
