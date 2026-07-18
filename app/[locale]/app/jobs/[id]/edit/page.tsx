import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { JobForm } from "@/components/features/job-form";
import { createClient } from "@/lib/supabase/server";
import type { Job } from "@/lib/types";

export default async function EditJobPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: job } = await supabase.from("jobs").select("*").eq("id", params.id).maybeSingle();
  if (!job) notFound();

  return (
    <div>
      <PageHeader title={`Editar: ${job.title}`} />
      <JobForm job={job as Job} />
    </div>
  );
}
