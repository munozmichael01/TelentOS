import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Markdown } from "@/components/markdown";
import { PipelineBoard } from "@/components/features/pipeline-board";
import { ChannelPlanner } from "@/components/features/channel-planner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/server";
import { formatSalaryRange } from "@/lib/utils";
import type { Application, Campaign, Job, JobStage } from "@/lib/types";

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: job }, { data: stages }, { data: applications }, { data: campaigns }] =
    await Promise.all([
      supabase.from("jobs").select("*").eq("id", params.id).maybeSingle(),
      supabase.from("job_stages").select("*").eq("job_id", params.id).order("order_index"),
      supabase
        .from("applications")
        .select("*, candidates(*)")
        .eq("job_id", params.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("campaigns")
        .select("*, channels(*)")
        .eq("job_id", params.id)
        .order("priority"),
    ]);

  if (!job) notFound();
  const typedJob = job as Job;

  return (
    <div>
      <PageHeader
        title={typedJob.title}
        description={[typedJob.location, typedJob.sector, formatSalaryRange(typedJob.salary_min, typedJob.salary_max)]
          .filter(Boolean)
          .join(" · ")}
      >
        <Badge variant={typedJob.status === "active" ? "success" : "secondary"} className="mr-2">
          {typedJob.status === "active" ? "activa" : typedJob.status}
        </Badge>
        <Button variant="outline" asChild>
          <Link href={`/jobs/${typedJob.id}/edit`}><Pencil />Editar</Link>
        </Button>
      </PageHeader>

      <Tabs defaultValue="pipeline">
        <TabsList>
          <TabsTrigger value="pipeline">
            Pipeline ({(applications ?? []).length})
          </TabsTrigger>
          <TabsTrigger value="distribution">Distribución</TabsTrigger>
          <TabsTrigger value="details">Detalle</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline">
          <PipelineBoard
            stages={(stages ?? []) as JobStage[]}
            applications={(applications ?? []) as unknown as Application[]}
          />
        </TabsContent>

        <TabsContent value="distribution">
          <ChannelPlanner jobId={typedJob.id} campaigns={(campaigns ?? []) as unknown as Campaign[]} />
        </TabsContent>

        <TabsContent value="details">
          <Card>
            <CardContent className="pt-6">
              <div className="mb-4 flex flex-wrap gap-1.5">
                {typedJob.skills.map((s) => (
                  <Badge key={s} variant="secondary">{s}</Badge>
                ))}
              </div>
              {typedJob.description ? (
                <Markdown content={typedJob.description} />
              ) : (
                <p className="text-sm text-muted-foreground">Sin descripción.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
