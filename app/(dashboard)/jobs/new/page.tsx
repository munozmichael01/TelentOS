import { PageHeader } from "@/components/page-header";
import { JobForm } from "@/components/features/job-form";

export default function NewJobPage() {
  return (
    <div>
      <PageHeader
        title="Nueva oferta"
        description="Redáctala desde cero o genera un borrador con el agente; tú decides qué se publica."
      />
      <JobForm />
    </div>
  );
}
